// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {
  var Backbone = require('backbone');
  var Handlebars = require('handlebars');
  var PasswordHelpers = require('plugins/passwordChange/passwordHelpers');
  var OriginView = require('core/views/originView');
  var Origin = require('core/origin');
  var Helpers = require('core/helpers');

  var PasswordFieldsView = function (opts) {
    var genericId = opts && opts.genericId ? opts.genericId : '';
    var events = {
      'click .toggle-password': 'togglePasswordView',
      'click .toggle-confirmation-password': 'toggleConfirmationPasswordView'
    }
    events[`keyup #password${genericId}`] = 'onPasswordKeyup';
    events[`keyup #confirmPassword${genericId}`] = 'onConfirmPasswordKeyup';
    events[`keyup #passwordText${genericId}`] = 'onPasswordTextKeyup';
    events[`keyup #confirmPasswordText${genericId}`] = 'onConfirmPasswordTextKeyup';

    var view = OriginView.extend({
      tagName: 'div',
      className: 'password-fields-view',
      events: events,

      preRender: function () {
        this.model.set('genericId', genericId);
        this.listenTo(this.model, 'invalid', this.handleValidationError);
      },

      postRender: function () {
        this.setViewToReady();
      },

      handleValidationError: function (model, error) {
        Origin.trigger('sidebar:resetButtons');

        if (error && _.keys(error).length !== 0) {
          _.each(error, function (value, key) {
            this.$('#' + key + 'Error' + genericId).html(value);
          }, this);
          this.$('.error-text').removeClass('display-none');
        }
      },

      togglePassword: function (event) {
        event && event.preventDefault();
        // convert to bool and invert
        this.model.set('_isNewPassword', !!!this.model.get('_isNewPassword'));
      },

      togglePasswordView: function () {
        event && event.preventDefault();
        if(this.$('#passwordText' + genericId).hasClass('display-none')){
          this.$('#passwordText' + genericId).removeClass('display-none');
          this.$('#password' + genericId).addClass('display-none');
          this.$('.toggle-password').attr('aria-label', Origin.l10n.t('app.hidepassword'))
          this.$('#passwordText' + genericId).focus();
        } else {
          this.$('#password' + genericId).removeClass('display-none');
          this.$('#passwordText' + genericId).addClass('display-none');
          this.$('.toggle-password').attr('aria-label', Origin.l10n.t('app.revealpassword'))
          this.$('#password' + genericId).focus();
        }
        this.$('.toggle-password i').toggleClass('fa-eye').toggleClass('fa-eye-slash');
      },

      toggleConfirmationPasswordView: function () {
        event && event.preventDefault();
        if(this.$('#confirmPasswordText' + genericId).hasClass('display-none')){
          this.$('#confirmPasswordText' + genericId).removeClass('display-none');
          this.$('#confirmPassword' + genericId).addClass('display-none');
          this.$('.toggle-confirmation-password').attr('aria-label', Origin.l10n.t('app.hidepassword'))
          this.$('#confirmPasswordText' + genericId).focus();
        } else {
          this.$('#confirmPassword' + genericId).removeClass('display-none');
          this.$('#confirmPasswordText' + genericId).addClass('display-none');
          this.$('.toggle-confirmation-password').attr('aria-label', Origin.l10n.t('app.revealpassword'))
          this.$('#confirmPassword' + genericId).focus();
        }
        this.$('.toggle-confirmation-password i').toggleClass('fa-eye').toggleClass('fa-eye-slash');
      },

      indicatePasswordStrength: function (event) {
        var password = $('#password' + genericId).val();
        var errors = PasswordHelpers.validatePassword(password);
        var $passwordLength = $(`.password${genericId}-length-feedback`);
        var $passwordChecklistFeedback = $(`.password${genericId}-checklist-feedback`);

        var xMark = '<i class="fa fa-times" aria-hidden="true"></i>';
        var checkMark = '<i class="fa fa-check" aria-hidden="true"></i>';

        errors.includes('tooshort') ? $passwordLength.html(xMark) : $passwordLength.html(checkMark);

        $passwordChecklistFeedback.html(`${Origin.l10n.t('app.numberofrequirementscompleted', {number: 4 - errors.length, total: 4}) }`)

      },

      onConfirmPasswordKeyup: function () {
        if (this.$('#confirmPassword' + genericId).val().length > 0) {
          this.$('#confirmPasswordText' + genericId).val(this.$('#confirmPassword' + genericId).val());
          this.$('.toggle-confirmation-password').removeClass('display-none');
        } else {
          this.$('.toggle-confirmation-password').addClass('display-none');
        }
      },

      onPasswordKeyup: function () {
        if (this.$('#password' + genericId).val().length > 0) {
          this.$('#passwordText' + genericId).val(this.$('#password' + genericId).val());
          this.$('.toggle-password').removeClass('display-none');
        } else {
          this.$('.toggle-password').addClass('display-none');
        }
        this.indicatePasswordStrength();
      },

      onPasswordTextKeyup: function () {
        if (this.$('#passwordText' + genericId).val().length > 0) {
          this.$('#password' + genericId).val(this.$('#passwordText' + genericId).val());
          this.$('.toggle-password').removeClass('display-none');
        } else {
          this.$('.toggle-password').addClass('display-none');
          this.$('#password' + genericId).val(this.$('#passwordText' + genericId).val());
          this.togglePasswordView();
        }
        this.indicatePasswordStrength();
      },

      onConfirmPasswordTextKeyup: function () {
        if (this.$('#confirmPasswordText' + genericId).val().length > 0) {
          this.$('#confirmPassword' + genericId).val(this.$('#confirmPasswordText' + genericId).val());
          this.$('.toggle-confirmation-password').removeClass('display-none');
        } else {
          this.$('.toggle-confirmation-password').addClass('display-none');
          this.$('#confirmPassword' + genericId).val(this.$('#confirmPasswordText' + genericId).val());
          this.toggleConfirmationPasswordView();
        }
      }
    }, {
      template: 'passwordFields'
    });

    return new view({model: opts.model}).render();
  }

  return PasswordFieldsView;
});
