// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
var _ = require('underscore');
var async = require('async');
var util = require('util');

var configuration = require('./configuration');
var database = require('./database');
var ObjectId = require('mongoose').Types.ObjectId;
var logger = require('./logger');
var permissions = require('./permissions');
var pluginmanager = require('./pluginmanager');
var rolemanager = require('./rolemanager');
var tenantmanager = require('./tenantmanager');
var helpers = require('./helpers');

var blocklist;
try {
  blocklist = require('../conf/blocklist.json');
}
catch(error) {
  blocklist = [];
}

/*
 * CONSTANTS
 */
var MAX_TOKEN_AGE = 2; // in hours
var PROTECTED_SESSION_KEYS = { passport: 1, cookie: 1 }; // don't allow direct setting of these session vars
const UNDEFINED_TENANT_ID = '000000000000000000000000';
var SELF_UPDATE_WHITELIST = ['firstName', 'lastName', '_isNewPassword', 'password', 'email', 'lastPasswordChange', 'lastPasswordResetToken'];

// custom errors
function UserEmailError(message) {
  this.name = 'UserEmailError';
  this.message = message || 'User email error';
}

util.inherits(UserEmailError, Error);

function UserCreateError(message) {
  this.name = 'UserCreateError';
  this.message = message || 'User create error';
}

util.inherits(UserCreateError, Error);

function DuplicateUserError(message) {
  this.name = 'DuplicateUserError';
  this.message = message || 'User already exists';
}

util.inherits(DuplicateUserError, Error);

exports = module.exports = {

  // expose errors
  errors: {
    'UserEmailError': UserEmailError,
    'UserCreateError': UserCreateError,
    'DuplicateUserError': DuplicateUserError
  },

  /**
   * checks if a user is permitted the action on the resource
   *
   * @param {string} action
   * @param {object} user
   * @param {string} resource
   * @param {callback} next (function (err, isAllowed))
   */

  hasPermission: function (action, user, resource, next) {
    var resourceString = permissions.buildResourceString(user.tenant._id, resource);
    permissions.hasPermission(user._id, action, resourceString, next);
  },

  createNewUser: function (user, callback) {
    var auth = require('./auth');

    auth.getAuthPlugin(configuration.getConfig('auth'), function (err, plugin) {
      if (err) {
        return callback(err);
      }

      plugin.internalRegisterUser(false, user, function (error, result) {
        if (error) {
          return callback(error);
        }

        app.rolemanager.assignRoleByName('Authenticated User', result._id, function (err, userRecord) {
          if (err) {
            return callback(err);
          }

          return callback(null, userRecord);
        });
      });
    });
  },

  /**
   * Finds or creates a new user account
   *
   * @param {object} search     - search criteria
   * @param {string} authType   - authentication type
   * @param {object} profile    - a user profile (only used if the user does not exist)
   * @param {function} callback - function of the form (error, user)
   */
  findOrCreateUser: function (search, authType, profile, next) {
    // Verify that a property exists which is unique enough to search on.
    if (!search.hasOwnProperty('_id') && !search.hasOwnProperty('idNumber') && !search.hasOwnProperty('email')) {
      return next(new Error("You must specify one of '_id', 'idNumber' or 'email'"));
    }

    var self = this;

    // Add 'authType' to the search criteria.
    search = _.extend(search, { auth: authType });

    // Check if the user exists.
    self.retrieveUser(search, function (err, user) {
      if (err) {
        return next(err);
      }

      if (user) {
        self.logAccess(user, function (err) {
          if (err) {
            return next(err);
          }

          // Return the found user.
          return next(null, user);
        });
      } else {
        // Set the first access date and the auth type for this new account.
        profile.firstAccess = new Date();
        profile.auth = authType;

        // For a new user, the steps are:
        // 1. Create the user
        // 2. (Optionally) create a new tenant and assign it to the user
        // 3. Assign default roles to the user
        async.waterfall([
          function (callback) {
            // Create the initial user record.
            self.createUser(profile, function (err, user) {
              if (err) {
                logger.log('error', 'Failed to create user: ', profile);
                return callback(err);
              }

              return callback(null, user);
            });
          },
          function (newUser, callback) {
            // Create a new tenant (if required)
            if (!profile.hasOwnProperty('_tenantId') || profile._tenantId == UNDEFINED_TENANT_ID) {
              // Formulate a unique tenant name.
              var tenantName = `${profile.auth}-${newUser._id}`;

              // Setup a new tenant for the new user.
              tenantmanager.createTenant({ name: tenantName }, function (err, tenant) {
                if (err) {
                  logger.log('error', 'Failed to create new tenant for user: ', profile);
                  return callback(err);
                }

                // Set the newly created tenant with the user.
                self.updateUser({ _id: newUser._id }, { _tenantId: tenant._id }, function (err, user) {
                  if (err) {
                    return callback(err);
                  }

                  return callback(null, user);
                });
              });
            } else {
              callback(null);
            }
          },
          function (newUser, callback) {
            // Assign default roles to the user.
            rolemanager.assignDefaultRoles(newUser._id, function (err) {
              if (err) {
                return callback(err);
              }

              return callback(null, newUser);
            });
          }
        ], function (err, result) {
          if (err) {
            logger.log('error', err);
            return next(err);
          }

          // Return the new user.
          return next(null, result);
        });
      }
    });
  },

  /**
   * creates a user
   *
   * @param {object} user - a fully defined user object
   * @param {function} callback - function of the form function (error, user)
   */
  createUser: function (user, callback) {

    // schema defines email as required, but for searching check that email is defined
    if (!user.email || 'string' !== typeof user.email) {
      return callback(new UserEmailError('user email is required!'));
    }

    database.getDatabase(function (err, db) {
      if (err) {
        return callback(err);
      }

      // verify the user email does not already exist
      db.retrieve('user', { email: user.email }, function (error, results) {
        if (error) {
          return callback(error);
        }

        if (results && results.length) {
          // user exists
          return callback(new DuplicateUserError());
        } else {
          db.create('user', user, function (error, result) {
            // Wrap the callback since we might want to alter the result
            if (error) {
              logger.log('error', 'Failed to create user: ', user);
              return callback(error);
            }

            return callback(null, result);
          });
        }
      });
    }, configuration.getConfig('dbName'));
  },

  /**
   * retrieves users matching the search
   *
   * @param {object} search - fields of user that should be matched
   * @param {object} [options] - optional options to pass to db
   * @param {function} callback - function of the form function (error, users)
   */
  retrieveUsers: function (search, options, callback) {
    database.getDatabase(function (err, db) {
      // delegate to db retrieve method
      db.retrieve('user', search, options, callback);
    }, configuration.getConfig('dbName'));
  },

  /**
   * retrieves a single user
   *
   * @param {object} search - fields to match: should use 'email' which is unique
   * @param {object} [options] - optional options to pass to db
   * @param {function} callback - function of the form function (error, user)
   */
  retrieveUser: function (search, options, callback) {
    // shuffle params
    if ('function' === typeof options) {
      callback = options;
      options = {};
    }

    database.getDatabase(function (err, db) {
      db.retrieve('user', search, options, function (error, results) {
        if (error) {
          return callback(error);
        }

        if (results && results.length > 0) {
          if (results.length === 1) {
            // we only want to retrieve a single user, so we send an error if we get multiples
            return callback(null, results[0]);
          }

          return callback(new Error('user search expected a single result but returned ' + results.length + ' results'));
        }

        return callback(null, false);
      });
    }, configuration.getConfig('dbName'));
  },

  /**
   * updates a single user
   *
   * @param {object} search - fields to match: should use 'email' which is unique
   * @param {object} update - fields to change and their values
   * @param {function} callback - function of the form function (error, user)
   */
  updateUser: function (search, update, callback) {
    var self = this;
    // only execute if we have a single matching record
    this.retrieveUser(search, function (error, result) {
      if (error) {
        return callback(error);
      }
      if (!result) {
        return callback(new Error('No matching user record found'));
      }
      database.getDatabase(function (err, db) {
        if (update.email !== self.getCurrentUser().email) {
          // email updated, verify the new email does not already exist
          db.retrieve('user', { email: update.email }, function (error, results) {
            if (error) {
              return callback(error);
            }
            if (results && results.length) {
              return callback(new DuplicateUserError());
            }
            db.update('user', search, update, callback);
          });
        } else {
          db.update('user', search, update, callback);
        }
      }, configuration.getConfig('dbName'));
    });
  },

  /**
   * sets the 'active' state of a single user. Preferred to a hard delete.
   * Really just a shorthand for this.updateUser
   *
   * @param {object} user - must match the user in db
   * @param {boolean} active - the active state, true or false
   * @param {function} callback - function of the form function (error)
   */
  setUserActive: function (user, active, callback) {
    // confirm the user exists and is there is only one of them
    this.retrieveUser(user, function (error, result) {
      if (error) {
        callback(error);
      } else if (result) {
        this.updateUser({ '_id': result._id }, { 'active': active }, callback);
      } else {
        callback(new Error('No matching user record found'));
      }
    });
  },

  clearOtherSessions: function (req, userId) {
      if(!req){ req = { sessionID: 0, session: { passport: { user: { _id: userId } } } } };
      database.getDatabase(function (err, db) {
        var user_id = req.session.passport && req.session.passport.user ? req.session.passport.user._id : userId;
        db.retrieve('session', {"session.passport.user._id": ObjectId(user_id), "_id": { $ne: req.sessionID }}, { jsonOnly: true }, function (err, results){
          if (err) {
            logger.log('error', err);
          }
          if (!results) {
            logger.log('error', 'An error occured while clearing other existing sessions');
          } else {
            results.forEach(function(document){
              db.destroy('session', { _id: document._id }, function (error) {
                if(error){
                  logger.log('error', 'An error occured while deleting a session')
                }
              })
            })
          }
        });
      }, configuration.getConfig('dbName'));
  },

  /**
   * Handle a users courses on delete
   */
  handleUserCoursesOnDelete: function (userId, courseOption, done) {
    if (courseOption === null) {
      return done(null);
    }

    var pluginManager = pluginmanager.getManager();
    var plugins = pluginManager.getPlugins();
    var CourseContent = require(plugins.content.course.fullPath);
    var courseContent = new CourseContent();
    const currentUserId = this.getCurrentUser()._id;
    courseContent.retrieve({ createdBy: userId }, {}, (err, results) => {
      async.eachSeries(results, (model, cb) => {
        // For a full description of behaviour see https://github.com/adaptlearning/adapt_authoring/pull/2277
        const sharedWithList = model._shareWithUsers;
        const isPartiallyShared = sharedWithList && sharedWithList.length;
        // Delete private courses if this option was set
        if (courseOption === 'delete' && !model._isShared && !isPartiallyShared) {
          courseContent.destroy({ _id: model._id }, false, cb);
          return;
        }
        // Transfer ownership of all courses to current user
        let update = { createdBy: currentUserId };
        // Remove the current user from the 'shared with' list if applicable
        if (isPartiallyShared) {
          update._shareWithUsers = sharedWithList.pull(currentUserId);
        }
        // Share private courses with everyone if this option was set
        if (courseOption === 'share') {
          update._isShared = true;
        }
        courseContent.update({ _id: model._id }, update, cb);
      }, done);
    });
  },

  /**
   * Handle a user's courses on transfer
   */
  handleUserCoursesOnTransfer: function (fromUserId, toUserId, done) {
    var self = this;
    database.getDatabase(function (error, db) {
      db.retrieve('course', { createdBy: fromUserId }, {}, function (err, results) {
        async.eachSeries(results, (model, cb) => {
          self.transferSingleCourse(model, toUserId, cb);
        }, done);
      });
    }, configuration.getConfig('dbName'));
  },

  /**
   * transfers a single course from a user to another user
   *
   * @param {object} model - course model
   * @param {string} toUserId - must match a user ID in db
   * @param {function} callback - function of the form function (error)
   */
  transferSingleCourse: function (model, toUserId, callback) {
    // For a full description of behaviour see https://github.com/adaptlearning/adapt_authoring/pull/2277
    const sharedWithList = model._shareWithUsers;
    const isPartiallyShared = sharedWithList && sharedWithList.length;
    // Transfer ownership of course to anothre user
    let update = { createdBy: toUserId };
    // Remove the current user from the 'shared with' list if applicable
    if (isPartiallyShared) {
      update._shareWithUsers = sharedWithList.pull(toUserId);
    }
    database.getDatabase(function (error, db) {
      update.updatedAt = update.updatedAt || new Date();
      return db.update('course', { _id: model._id }, update, function (err, doc) {
        return callback(err, doc);
      });
    }, configuration.getConfig('dbName'));
  },

  /**
   * transfers all courses from a single user to another user
   *
   * @param {object} fromUser - must match a user in db
   * @param {string} toUserId - must match a user ID in db
   * @param {function} callback - function of the form function (error)
   */
  transferAllCourses: function (fromUser, toUserId, callback) {
    // confirm the user exists and is there is only one of them
    this.retrieveUser({_id: fromUser._id}, function (error, result) {
      if (error) {
        callback(error);
      } else if (result) {
        database.getDatabase(function (error, db) {
          if (error) {
            callback(error);
          }
          async.parallel([
            function (cb) {
              this.handleUserCoursesOnTransfer(fromUser._id, toUserId, cb);
            }.bind(this)
          ], callback);
        }.bind(this), configuration.getConfig('dbName'));
      } else {
        callback(null);
      }
    }.bind(this));
  },

  /**
   * deletes a single user
   *
   * @param {object} user - must match the user in db
   * @param {string} courseOption (optional) - transfer,delete,share
   * @param {function} callback - function of the form function (error)
   */
  deleteUser: function (user, courseOption, callback) {
    if (typeof courseOption === 'function') {
      callback = courseOption;
      courseOption = null;
    }
    // confirm the user exists and is there is only one of them
    this.retrieveUser(user, function (error, result) {
      if (error) {
        callback(error);
      } else if (result) {
        database.getDatabase(function (error, db) {
          if (error) {
            callback(error);
          }
          async.parallel([
            function (cb) { this.handleUserCoursesOnDelete(user._id, courseOption, cb); }.bind(this),
            function (cb) { db.destroy('userpasswordreset', { user: user._id }, cb); },
            function (cb) { db.destroy('user', user, cb); }
          ], callback);
        }.bind(this), configuration.getConfig('dbName'));
      } else {
        // consider deleting a non-existent record a success
        callback(null);
      }
    }.bind(this));
  },

  /**
   * gets the currently logged in user from session
   */
  getCurrentUser: function () {
    try { // parse the session user to give us a plain object without ObjectIds
      const user = process.domain.session.passport.user;
      return JSON.parse(JSON.stringify(user));
    } catch (e) {
      return false;
    }
  },

  /**
   * saves a variable in the current session
   *
   * @param {string} key - the name of the variable
   * @param {mixed} value - the value to save
   */

  setSessionVariable: function (key, value) {
    var session = process.domain && process.domain.session;
    // protect some variable names
    if (PROTECTED_SESSION_KEYS[key]) {
      return false;
    }

    // ok, good to go
    return session && (session[key] = value);
  },

  /**
   * gets a session variable, if set
   *
   * @param {string} key - the variable name
   * @return {mixed} the value if it exists, otherwise false
   */

  getSessionVariable: function (key) {
    var session = process.domain && process.domain.session;

    return (session && session[key]);
  },

  /**
   * Used with sessions to serialize user data
   * Only serializes the _id and tenant vars
   *
   * @param {object} data - the user to serialize
   * @param {callback} cb
   */
  serializeUser: function (data, cb) {
    var user = {
      _id: data._id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      tenant: {}
    };

    if (data._tenantId == UNDEFINED_TENANT_ID) {
      // No tenant defined for user, so default to master.
      user.tenant = {
        _id: configuration.getConfig('masterTenantID'),
        name: configuration.getConfig('masterTenantName'),
        isMaster: true
      };

      return cb(null, user);
    }

    tenantmanager.retrieveTenant({ _id: data._tenantId }, function (error, tenant) {
      if (error) {
        return cb(error);
      }

      if (!tenant) {
        logger.log('error', `Unable to retrieve tenant ${data._tenantId} for user ${data._id}`);
        return cb(new Error('Unable to retrieve tenant for user'));
      }

      user.tenant = {
        _id: tenant._id,
        name: tenant.name,
        isMaster: tenant.isMaster
      };

      cb(null, user);
    });
  },

  /**
   * Used with sessions to retrieve a user based on serialized data
   *
   * @param {object} data - the user to restore
   * @param {callback} cb
   */
  deserializeUser: function (data, cb) {
    this.retrieveUser({ _id: data._id, email: data.email }, function (error, rec) {
      cb(error, rec);
    });
  },

  /**
   * Creates a user password reset entry
   *
   * @param {object} userReset - a fully defined user reset object
   * @param {function} callback - function of the form function (error, user)
   */
  createUserPasswordReset: function (userReset, next) {
    // schema defines email as required, but for searching check that email is defined
    if (!userReset.email || 'string' !== typeof userReset.email) {
      return next(new UserEmailError('User email is required!'));
    }

    this.retrieveUser({ email: userReset.email, auth: 'local' }, function (error, user) {
      if (error) {
        return next(error);
      } else if (user) {
        if(user.passwordResetCount >= 3){
          return next('Token generation is locked after 3 failed attempts.');
        }
        database.getDatabase(function (err, db) {
          if (err) {
            logger.log('error', error);
            return next(error)
          }

          db.retrieve('userpasswordreset', { user: user._id }, function (error, results) {
            if (error) {
              logger.log('error', error);
              return next(error);
            } else if (results && results.length) {
              // User already submitted a password reset request - update it
              userReset.user = user._id;

              // Chek that the last token wasn't issued less than 10 minutes ago
              var TEN_MINUTES = 10 * 60 * 1000;
              if(!((userReset.issueDate - results[0].issueDate) > TEN_MINUTES)){
                return next('Last token was generated less than ten minutes ago. Preventing setting the new token');
              }

              db.update('userpasswordreset', { user: user._id }, userReset, function (error, result) {
                if (error) {
                  logger.log('error', 'Failed to update user password reset: ', user);
                  return next(error);
                } else {
                  return next(null, result);
                }
              });
              //Increment token generation count
              user.passwordResetCount++;
              db.update('user', {_id: user._id}, {passwordResetCount: user.passwordResetCount}, function (error, result) {
                if (error) {
                  logger.log('error', 'Failed to update user password reset count for user: ', user);
                  return next(error);
                }
              });
            } else {
              // Create password reset token
              userReset.user = user._id;

              db.create('userpasswordreset', userReset, function (error, result) {
                if (error) {
                  logger.log('error', 'Failed to create user password reset: ', user);
                  return next(error);
                } else {
                  return next(null, result);
                }
              });
              //Increment token generation count
              user.passwordResetCount++;
              db.update('user', {_id: user._id}, {passwordResetCount: user.passwordResetCount}, function (error, result) {
                if (error) {
                  logger.log('error', 'Failed to update user password reset count for user: ', user);
                  return next(error);
                }
              });
            }
          });

        }, configuration.getConfig('dbName'));
      } else {
        // If the user doesn't exist, don't throw an error - this is to prevent
        // users guessing correct usernames
        return next(false, { invalid: true });
      }
    });
  },

  /**
   * Retrieves a single user password reset
   *
   * @param {object} search - fields to match: should use 'token' which is unique
   * @param {function} callback - function of the form function (error, userReset)
   */
  retrieveUserPasswordReset: function (search, callback) {
    var timestampMinAge = this.xHoursAgo(MAX_TOKEN_AGE);
    database.getDatabase(function (err, db) {
      db.retrieve('UserPasswordReset', search, function (error, results) {
        if (error) {
          return callback(error);
        }
        if (!results || results.length === 0) {
          return callback();
        }
        if (results.length > 1) {
          return callback(new Error('User password reset search expected a single result but returned ' + results.length + ' results'));
        }
        var resetData = results[0];
        if (resetData.issueDate.getTime() < timestampMinAge) {
          return callback(new Error('Reset token has expired'));
        }
        callback(null, resetData);
      });
    }, configuration.getConfig('dbName'));
  },

  /**
   * Deletes a single user password reset
   *
   * @param {object} user - must match the user in db
   * @param {function} callback - function of the form function (error)
   */
  deleteUserPasswordReset: function (user, callback) {
    // confirm the user password reset exists and is there is only one of them
    this.retrieveUserPasswordReset(user, function (error, result) {
      if (error) {
        return callback(error);
      }

      if (result) {
        return database.getDatabase(function (err, db) {
          if (err) {
            return callback(err);
          }

          db.destroy('UserPasswordReset', user, callback);
        }, configuration.getConfig('dbName'));
      }

      // nothing to delete
      return callback(null);
    });
  },

  /**
   * Sets a users password to the provided value
   * @param {object} user - must match the user in db
   * @param {function} callback - function of the form function (error)
   */
  resetUserPassword: function (user, callback) {
    if (!user.token) {
      return callback(new Error('No user password reset token provided'));
    }
    var usermanager = this;
    var timestampMinAge = this.xHoursAgo(MAX_TOKEN_AGE);

    this.retrieveUserPasswordReset({ token: user.token }, function (err, resetRequest) {
      if (err) {
        // Token is too old
        return callback(err, false);
      }

      if (resetRequest.issueDate.getTime() > timestampMinAge) {
        usermanager.updateUser({ _id: user.id }, user, function (err) {
          if (err) {
            return callback(err, false);
          }
          callback(null, user);
        });
      } else {
        // Token is too old
        callback(new Error('Reset token has expired'), false);
      }
    });
  },

  /**
   * Stamps the user's lastAccess date/time and ensures
   * firstAccess is set
   * @param {object} user - a valid instance of the user
   */
  logAccess: function (user, callback) {
    var currentTime = new Date();
    var delta = {};

    if (!user.firstAccess) {
      delta.firstAccess = currentTime;
    }

    delta.lastAccess = currentTime;

    // Reset the count of any failed logins / reset password
    delta.failedLoginCount = 0;
    delta.passwordResetCount = 0;

    this.updateUser({ _id: user._id }, delta, function (error) {
      if (error) {
        return callback(error);
      }

      callback();
    });
  },

  /**
   * Utility - return time in milliseconds x hours ago
   * @param {int} hours - the number of hours ago to fetch
   */
  xHoursAgo: function (hours) {
    var now = new Date();
    return now.getTime() - (1000 * 60 * 60 * hours);
  },

  getUserRoles: function (user, callback) {
    database.getDatabase(function (err, db) {
      db.retrieve('role', { _id: { $in: user.roles } }, function (error, roles) {
        if (error) {
          return callback(error);
        }

        return callback(null, roles);
      });
    }, configuration.getConfig('dbName'));

  },

  getUserDetails: function (user, callback) {
    database.getDatabase(function (err, db) {
      db.retrieve('user', { email: user.email }, function (error, result) {
        if (error) {
          return callback(error);
        }

        return callback(null, result);
      });
    }, configuration.getConfig('dbName'));

  },

  validatePassword: function(password, user, next) {
    var auth = require('./auth');
    var errors = [];

    if (!password || password.length < 12) errors = ['tooshort', ...errors];

    this.getUserDetails(user, function(err, result) {
      if (err) {
        errors.unshift(err);
        return errors;
      }

      if (result && result.length > 0) {
        var userDetail = result[0];
        var existingUserPasswords = [userDetail.password, ...userDetail.previousPasswords];
        console.log('existingUserPasswords: ', existingUserPasswords);
        if (existingUserPasswords.length < 1) {
          console.log('existingUserPasswords.length < 1 ');
          return next(errors);
        }
        var isMatchFound = false;
        var existingPasswordCheckCounter = 0;

        for (let existingPassword of existingUserPasswords) {
          auth.validatePassword(password, existingPassword, function(err, isMatch) {
            console.log('validate password existingPassword: ', existingPassword);
            console.log('validate password result: ', isMatch);
            console.log('validate password isMatchFound: ', isMatchFound);
            existingPasswordCheckCounter += 1;
            console.log('existingUserPasswords.length: ', existingUserPasswords.length);
            console.log('existingPasswordCheckCounter: ', existingPasswordCheckCounter);

            if (err) {
              errors.unshift(err);
              return errors;
            }
            if (isMatch && !isMatchFound) {
              errors.unshift('Password already used');
              console.log('isMatch && !isMatchFound');
              isMatchFound = true;
              return next(errors);
            }
            else if (existingPasswordCheckCounter == existingUserPasswords.length && !isMatchFound) {
              console.log('existingPasswordCheckCounter == existingUserPasswords.length');
              return next(errors);
            }
          });
        }
      }
      else {
        console.log('next(errors');
        return next(errors);
      }

    })
  },

  init: function (app) {
    var self = this;
    var rest = require('./rest');
    var auth = require('./auth');
    var permissions = require('./permissions');

    app.usermanager = this;

    // Get users
    rest.get('/user', (req, res, next) => {
      const search = req.query.search || {};
      let andList = [];
      let orList = [];
      // convert searches to regex
      Object.keys(search).forEach(key => {
        if ('string' !== typeof search[key]) {
          return andList.push({ [key]: search[key] });
        }
        orList.push({ [key]: new RegExp(search[key], 'i') });
      });
      let query = {};
      if (orList.length) query.$or = orList;
      if (andList.length) query.$and = andList;

      this.retrieveUsers(query, { populate: { 'roles': 'name', '_tenantId': 'name' } }, function (err, users) {
        if (err) return next(err);
        res.status(200).json(users);
      });
    });

    rest.get('/user/me', function (req, res, next) {
      var usr = self.getCurrentUser();

      if (usr) {
        self.retrieveUser({ _id: usr._id }, function (err, usr) {
          if (err) {
            res.statusCode = 500;
            return res.json(err);
          }

          self.getUserRoles(usr, function (err, roles) {
            if (err) {
              res.statusCode = 500;
              return res.json(err);
            }

            var data = usr.toObject();
            data.rolesAsName = [];

            for (var i = 0; i < roles.length; i++) {
              data.rolesAsName.push(roles[i].name);
            }

            res.statusCode = 200;
            return res.json(data);
          });

        });
      } else {
        res.statusCode = 400;
        return res.json(false);
      }
    });

    rest.post('/user/resetpassword', function (req, res, next) {
      var user = self.getCurrentUser();
      var delta = req.body;

      if (delta.password) {
        self.validatePassword(delta.password, user, function (result) {
          if (result.length > 0) {
            return res.status(500).json('Make your password stronger with at least 12 characters and your new password cannot be the same as any of your last 3 passwords');
          }
        })

        if (blocklist.includes(delta.password)) {
          return res.status(500).json('app.passwordtoocommon');
        }
      }

      if (!delta || 'object' !== typeof delta) {
        res.statusCode = 400;
        return res.json({ success: false, message: 'request body was not a valid object' });
      }

      self.hasPermission('update', user, '/api/user/resetpassword', function (err, isAllowed) {
        if (err) {
          res.statusCode = 500;
          return res.json(err);
        }

        if (!isAllowed || configuration.getConfig('useSmtp')) {
          res.statusCode = 401;
          return res.json({ success: false, message: 'Access denied' });
        }

        const email = delta.email;

        // sanitise the input
        delta = { password: delta.password };

        auth.hashPassword(delta.password, function (err, hash) {
          if (err) {
            res.statusCode = 500;
            return res.json(err);
          }

          delta.password = hash;
          delta.failedLoginCount = 0;
          delta.passwordResetCount = 0;
          delta.lastPasswordChange = '';

          self.getUserDetails(user, function(err, result) {
            if (err) {
              res.statusCode = 500;
              return res.json(err);
            }
            var previousPasswords = user.previousPasswords || [];
            var currentPassword = result && result.length > 0 ? result[0].password : user.password;
            if (currentPassword) previousPasswords.unshift(currentPassword);
            if (previousPasswords.length > 4) {
              previousPasswords.pop()
            }
            delta.previousPasswords = previousPasswords;

            self.updateUser({ email: email }, delta, function (err, userRecord) {
              if (err) {
                res.statusCode = 500;
                return res.json(err);
              }

              logger.log('info', 'Password reset by administrator for ' + email);

              self.clearOtherSessions(null, userRecord._id);

              self.retrieveUser({ email: user.email, auth: 'local' }, function (error, userObject) {
                if (error) {
                  res.statusCode = 500;
                  return res.json(error);
                }

                if (userObject) {
                  var inviterDetails = userObject.email;
                  if (userObject.firstName && userObject.lastName) {
                    inviterDetails = userObject.firstName + ' ' + userObject.lastName + ' (' + inviterDetails + ')';
                  }

                  var emailTemplate = {
                    email: userRecord.email,
                    template: 'adminResetPassword',
                    personalisation: {
                      name: userRecord.firstName,
                      adminInfo: inviterDetails
                    }
                  }

                  app.mailservice.send(emailTemplate, function (error) {
                    if (error) {
                      return res.status(500).send(error.message);
                    }
                    return res.status(200).json({ success: true });
                  });

                  //var subject = app.polyglot.t('app.emailadminpasswordchangesubject');
                  //var body = app.polyglot.t('app.emailadminpasswordchangebody', { rootUrl: configuration.getConfig('rootUrl') });
                  //app.mailer.send(email, subject, body, { name: 'emails/passwordReset.hbs' }, function(error) {
                  //  if (error) {
                  //    return res.status(500).send(error.message);
                  //  }
                  //  res.statusCode = 200;
                  //  return res.json({ success: true });
                  //});
                }
              });
            });
          })

        });
      });
    });

    rest.post('/transfer/course/:course_id/to_user/:to_user_id', function (req, res, next) {
      var courseId = req.params.course_id;
      var toUserId = req.params.to_user_id;
      var currentUser = self.getCurrentUser();

      var permissionQuery = {};
      permissionQuery._courseId = courseId;
      permissionQuery._type = 'course';
      helpers.hasOwnerPermission('update', currentUser._id, currentUser.tenant._id, permissionQuery, function (error, hasPermission) {
        if (error) {
          res.statusCode = 500;
          return res.json(error);
        }
        if (!hasPermission) {
          res.statusCode = 401;
          return res.json({ success: false, message: 'You are not permitted to do that.' });
        }
        var pluginManager = pluginmanager.getManager();
        var plugins = pluginManager.getPlugins();
        var CourseContent = require(plugins.content.course.fullPath);
        var courseContent = new CourseContent();
        courseContent.retrieve({ _id: courseId }, {}, (err, results) => {
          self.transferSingleCourse(results[0], toUserId, function (error) {
            // TODO error handling
            if (error) {
              res.statusCode = 500;
              return res.json(error);
            }
            res.statusCode = 200;
            return res.json({ success: true });
          });
        });
      });
    });

    rest.put('/transfer_all_courses_ownership/from_user/:from_user_id/to_user/:to_user_id', function (req, res, next) {
      var fromUserId = req.params.from_user_id;
      var toUserId = req.params.to_user_id;
      var currentUser = self.getCurrentUser();

      database.getDatabase(function (error, db) {
        db.retrieve('course', { createdBy: fromUserId }, function (err, results) {
          if (results && results.length < 1) {
            return next('User has no course to transfer');
          }
          else {
            self.retrieveUser({ _id: fromUserId }, function (error, user) {
              var resourceStr = permissions.buildResourceString(user._tenantId, '/api/transfer_all_courses_ownership/*');
              permissions.hasPermission(currentUser._id, 'update', resourceStr, function (error, hasPermission) {
                if (error) {
                  res.statusCode = 500;
                  return res.json(error);
                }
                if (!hasPermission) {
                  res.statusCode = 401;
                  return res.json({ success: false, message: 'You are not permitted to do that.' });
                }
                self.transferAllCourses(user, toUserId, function (error) {
                  // TODO error handling
                  if (error) {
                    res.statusCode = 500;
                    return res.json(error);
                  }
                  res.statusCode = 200;
                  return res.json({ success: true });
                });
              });
            });
          }
        });
      }, configuration.getConfig('dbName'));
    });

    rest.post('/user/invite', function (req, res) {
      var user = self.getCurrentUser();

      self.hasPermission('create', user, '/api/user/invite', function (err, isAllowed) {
        if (err) {
          res.statusCode = 500;
          return res.json(err);
        }
        if (!isAllowed) {
          res.statusCode = 401;
          return res.json({ success: false, message: 'Access denied' });
        }
        self.retrieveUser({ _id: user._id }, {}, function (err, userObject) {
          if (err) {
            res.statusCode = 500;
            return res.json(err);
          }
          self.retrieveUser({ email: req.body.email, auth: 'local' }, function (error, userRecord) {
            if (error) {
              res.statusCode = 500;
              return res.json(err);
            }
            if (userRecord) {
              var inviterDetails = userObject.email;
              if (userObject.firstName && userObject.lastName) {
                inviterDetails = userObject.firstName + ' ' + userObject.lastName + ' (' + inviterDetails + ')';
              }
              var emailTemplate = {
                email: userRecord.email,
                template: 'inviteUser',
                personalisation: {
                  name: userRecord.firstName,
                  adminInfo: inviterDetails
                }
              }
              app.mailservice.send(emailTemplate, function (error) {
                if (error) {
                  return res.status(500).send(error.message);
                }
                return res.status(200).json({ success: true });
              });
              //var subject = app.polyglot.t('app.emailinvitesubject');
              //var body = app.polyglot.t('app.emailinvitebody', { inviter: inviterDetails, rootUrl: configuration.getConfig('rootUrl'), resetUrl: configuration.getConfig('rootUrl') + '/#user/forgot' });
              //app.mailer.send(req.body.email, subject, body, { name: 'emails/invite.hbs' }, function(error) {
              //  if (error) {
              //    return res.status(500).send(error.message);
              //  }
              //  res.statusCode = 200;
              //  return res.json({ success: true });
              //});
            }
          });
        });
      });
    });

    rest.put('/user/me', function (req, res, next) {
      var user = self.getCurrentUser();
      var delta = req.body;

      if (!delta || 'object' !== typeof delta) {
        return res.status(400).json({ success: false, message: 'request body was not a valid object' });
      }

      if (!user) {
        return res.status(400).json(false);
      }

      if (user._id !== delta._id || user.email !== delta.email_prev) {
        return res.status(400).json({ success: false, message: 'Trying to update wrong user' });
      }

      var confirmPassword = delta.confirmPassword;

      // Strip out fields that can't be updated
      Object.keys(delta).forEach(function (key) {
        if (!SELF_UPDATE_WHITELIST.includes(key)) {
          delete delta[key];
        }
      });

      if (delta._isNewPassword) {
        // Update the password
        logger.log('info', 'Resetting password for ' + delta.email + '(' + user._id + ')');

        if (delta.password) {
          self.validatePassword(delta.password, user, function(result) {
            console.log('new password validate result: ', result);
            if (result.length > 0) {
              return res.status(500).json('Make your password stronger with at least 12 characters and your new password cannot be the same as any of your last 3 passwords');
            }
          });

          if (blocklist.includes(delta.password)) {
            return res.status(500).json('app.passwordtoocommon');
          }
        }

        auth.hashPassword(delta.password, function(err, hash) {
          if (err) {
            return res.status(500).json(err);
          }

          delta.password = hash;
          delta.lastPasswordChange = new Date().toISOString();

          self.getUserDetails(user, function(err, result) {
            if (err) {
              return res.status(500).json(err);
            }
            var previousPasswords = user.previousPasswords || [];
            var currentPassword = result && result.length > 0 ? result[0].password : user.password;
            if (currentPassword) previousPasswords.unshift(currentPassword);
            if (user.password) previousPasswords.unshift(user.password);
            if (previousPasswords.length > 4) {
              previousPasswords.pop()
            }
            delta.previousPasswords = previousPasswords;

            self.updateUser({ email: user.email }, delta, function (err) {
              if (err) {
                return next(err);
              }
              self.clearOtherSessions(req);
              return res.status(200).json({ success: true });
            });
          });

        });
      } else {
        self.updateUser({ email: user.email }, delta, function (err) {
          if (err) {
            return next(err);
          }

          return res.status(200).json({ success: true });
        });
      }
    });

    rest.get('/user/:id', function (req, res, next) {
      var id = req.params.id;

      if ('string' !== typeof id) {
        return next(new Error('id must be a valid objectid!'));
      }

      self.retrieveUser({ _id: id }, { populate: { 'roles': 'name', '_tenantId': 'name' } }, function (err, usr) {
        if (err) {
          return next(err);
        }

        res.statusCode = 200;
        return res.json(usr);
      });
    });

    // Create new user
    rest.post('/user', function (req, res, next) {
      var userData = req.body;

      if (userData.password) {
        self.validatePassword(userData.password, null, function(result) {
          if (result.length > 0) {
            return res.status(500).json('Make your password stronger with at least 12 characters');
          }
        });

        if (blocklist.includes(userData.password)) {
          return res.status(500).json('app.passwordtoocommon');
        }
      }

      userData.lastPasswordChange = new Date().toISOString();

      self.createNewUser(userData, function (err, result) {
        if (err) {
          res.statusCode = 500;
          return next(err);
        }

        res.statusCode = 200;
        return res.json(result);
      });
    });

    rest.put('/user/:id', function (req, res, next) {
      var id = req.params.id;
      var delta = req.body;

      if (delta.password) {
        self.validatePassword(delta.password, null,  function(result) {
          if (result.length > 0) {
            return res.status(500).json('Make your password stronger with at least 12 characters');
          }
        });

        if (blocklist.includes(delta.password)) {
          return res.status(500).json('app.passwordtoocommon');
        }

      }

      // handle puts from prepopulated fields
      if ('object' === typeof delta._tenantId) {
        delta._tenantId = delta._tenantId._id;
      }

      // roles aren't set this way
      if (delta.roles) {
        delete delta.roles;
      }

      self.updateUser({ _id: id }, delta, function (err, result) {
        if (err) {
          res.statusCode = 400;
          return res.json(err);
        }

        // update was successful
        res.statusCode = 200;
        return res.json(result);
      });
    });

    rest.delete('/user/:id', function (req, res, next) {
      var id = req.params.id;
      var currentUser = self.getCurrentUser();
      self.retrieveUser({ _id: id }, function (error, user) {
        var resourceStr = permissions.buildResourceString(user._tenantId, '/user/' + user._id);
        permissions.hasPermission(currentUser._id, 'delete', resourceStr, function (error, hasPermission) {
          if (!hasPermission) {
            res.statusCode = 401;
            return res.json({ success: false, message: 'Access denied' });
          }
          self.deleteUser({ _id: id }, req.body.userCourseOption, function (error) {
            // TODO error handling
            res.statusCode = 200;
            return res.json({ success: true });
          });
        });
      });
    });

    rest.put('/user/bulkaction', function (req, res, next) {
      var delta = false;
      if (req.body.type === 'delete') {
        delta = {
          _isDeleted: true
        };

      } else if (req.body.type === 'restore') {
        delta = {
          _isDeleted: false
        };
      }

      if (!delta) {
        res.statusCode = 400;
        return res.json(false);
      }

      async.each(req.body._items, function (itemId, callback) {
        self.updateUser({ _id: itemId }, delta, function (err, result) {
          if (err) {
            return next(err);
          }

          callback();
        });
      }, function (err) {
        if (err) {
          return next(err);
        }
        // update was successful
        res.statusCode = 200;
        return res.json(req.body._items);
      });

    });

    rest.get('/userpasswordreset/:token', function (req, res, next) {
      var token = req.params.token;

      if (token) {
        self.retrieveUserPasswordReset({ token: token }, function (err, usrReset) {
          res.statusCode = 200;
          if (err) {
            return res.json(err);
          }

          return res.json(usrReset);
        });
      } else {
        res.statusCode = 400;
        return res.json(false);
      }
    });
  }
};
