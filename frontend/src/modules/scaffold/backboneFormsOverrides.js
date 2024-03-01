define([
  'core/origin',
  'backbone-forms',
  'backbone-forms-lists',
  'core/helpers'
], function(Origin, BackboneForms, BackboneFormsList, Helpers) {

  var templates = Handlebars.templates;
  var fieldTemplate = templates.field;
  var templateData = Backbone.Form.Field.prototype.templateData;
  var initialize = Backbone.Form.editors.Base.prototype.initialize;
  var textInitialize = Backbone.Form.editors.Text.prototype.initialize;
  var textAreaRender = Backbone.Form.editors.TextArea.prototype.render;
  var textAreaSetValue = Backbone.Form.editors.TextArea.prototype.setValue;

  Backbone.Form.prototype.constructor.template = templates.form;
  Backbone.Form.Fieldset.prototype.template = templates.fieldset;
  Backbone.Form.Field.prototype.template = fieldTemplate;
  Backbone.Form.NestedField.prototype.template = fieldTemplate;

  // add reset to default handler
  Backbone.Form.Field.prototype.events = {
    'click [data-action="default"]': function() {
      this.setValue(this.editor.defaultValue);
      this.editor.trigger('change', this);

      return false;
    }
  };

  // merge schema into data
  Backbone.Form.Field.prototype.templateData = function() {
    return _.extend(templateData.call(this), this.schema, {
      isDefaultValue: _.isEqual(this.editor.value, this.editor.defaultValue)
    });
  };

  // use default from schema and set up isDefaultValue toggler
  Backbone.Form.editors.Base.prototype.initialize = function(options) {
    var schemaDefault = options.schema.default;

    if (schemaDefault !== undefined && options.id) {
      this.defaultValue = schemaDefault;
    }

    this.listenTo(this, 'change', function() {
      if (this.hasNestedForm) return;

      var isDefaultValue = _.isEqual(this.getValue(), this.defaultValue);

      this.form.$('[data-editor-id="' + this.id + '"]')
        .toggleClass('is-default-value', isDefaultValue);
    });

    initialize.call(this, options);
  };

  // disable automatic completion on text fields if not specified
  Backbone.Form.editors.Text.prototype.initialize = function(options) {
    textInitialize.call(this, options);

    if (!this.$el.attr('autocomplete')) {
      this.$el.attr('autocomplete', 'off');
    }
  };

  Backbone.Form.editors.TextArea.prototype.className = "cke_replace";

  // render ckeditor in textarea
  Backbone.Form.editors.TextArea.prototype.render = function() {
    textAreaRender.call(this);
    let defaultLanguage;
    if (Origin.editor.data && Origin.editor.data.config && Origin.editor.data.config.get('_defaultLanguage')) {
      defaultLanguage = Origin.editor.data.config.get('_defaultLanguage');
    }

    let textLanguageParts = [
      defaultLanguage === 'en' ? { title: 'Français', languageCode: 'fr' } : { title: 'English', languageCode: 'en' }
    ];


    _.delay(function() {
      var language = document.documentElement.lang;
      var watchdog = new CKSource.EditorWatchdog();
      watchdog.setCreator((element, config) => {
        return CKSource.Editor
          .create(element, config)
          .then(editor => {
            return editor;
          });
      });

      watchdog
        .create(this.$el[0], {
          language: {
            ui: language,
            textPartLanguage: textLanguageParts
          },
          unsafeElements: false,
          htmlSupport: {
            allow: [
              {
                // name: /^(div|span|svg|abbr|path)$/,
                name: /.*/,
                attributes: true,
                classes: true,
                styles: true,
                content: true
              }
            ],
            disallow: [
              {
                name: /^(script|video|audio|img|var)$/
              }
            ]
          },
          additionalLanguages: ['en', 'fr'],
          fontSize: {
            options: [
              'default',
              'big',
              'huge'
            ]
          },
          toolbar: {
            items: [
              'sourceEditing', 'showBlocks', '|',
              'undo', 'redo', '|',
              'findAndReplace', 'selectAll', '|',
              'fontSize', '|',
              'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'removeFormat', '|',
              'numberedList', 'bulletedList', 'alignment', 'indent', 'outdent', '|',
              'blockQuote', '|',
              'link', '|',
              'fontColor', 'fontBackgroundColor', '|',
              'specialCharacters', 'insertTable', '|', 'abbreviation', 'textPartLanguage'
            ],
            shouldNotGroupWhenFull: true
          }
        })
        .then(() => {
          this.postRender();
        })
        .catch((error) => {});
      this.editor = watchdog;
    }.bind(this), 50);
    return this;
  };

  Backbone.Form.editors.TextArea.prototype.postRender = function() {
    var currentDate = new Date();
    var targetDate = new Date('2024-06-01');
    if (currentDate < targetDate) {
      var editorWrapper = this.$el.parent();
      editorWrapper.append(`<span class="ck-help">${Origin.l10n.t('app.ckhelp')}</span>`);
    }
  }

  // get data from ckeditor in textarea
  Backbone.Form.editors.TextArea.prototype.getValue = function() {
    return this.editor && this.editor.editor ? this.editor.editor.getData() : null;
  };

  // set value in ckeditor
  Backbone.Form.editors.TextArea.prototype.setValue = function(value) {
    textAreaSetValue.call(this, value);

    if (this.editor && this.editor.editor) {
      this.editor.editor.setData(value);
    }
  };

  // ckeditor removal
  Backbone.Form.editors.TextArea.prototype.remove = function() {
    if (this.editor) {
      this.editor.destroy()
        .then(() => {})
        .catch(error => {});
    }
  };


  // ESDC - added override on arrayToHtml for select tags so the option can be added as id and the value translated
  Backbone.Form.editors.Select.prototype._arrayToHtml = function(array) {
    var html = $();
    //Generate HTML
    _.each(array, function(option) {
      if (_.isObject(option)) {
        if (option.group) {
          var optgroup = $("<optgroup>")
            .attr("label",option.group)
            .html( this._getOptionsHtml(option.options) );
          html = html.add(optgroup);
        } else {
          var val = (option.val || option.val === 0) ? option.val : '';
          html = html.add( $('<option>').val(val).text(option.label) );
        }
      }
      else {
        var keyOptions = { parent: this.key, key: option, type: 'variable' };
        var optionString = Helpers.keyToTranslatedString(keyOptions) || option;
        html = html.add($(`<option id=${option} value="${option}">`).text(optionString));
      }
    }, this);

    return html;
  }

  // add override to allow prevention of validation
  Backbone.Form.prototype.validate = function(options) {
    var self = this,
        fields = this.fields,
        model = this.model,
        errors = {};

    options = options || {};

    //Collect errors from schema validation
    // passing in validate: false will stop validation of the backbone forms validators
    if (!options.skipModelValidate) {
      _.each(fields, function(field) {
        var error = field.validate();

        if (!error) return;

        var title = field.schema.title;

        if (title) {
            error.title = title;
        }

        errors[field.key] = error;
      });
    }

    //Get errors from default Backbone model validator
    if (!options.skipModelValidate && model && model.validate) {
      var modelErrors = model.validate(this.getValue());

      if (modelErrors) {
        var isDictionary = _.isObject(modelErrors) && !_.isArray(modelErrors);

        //If errors are not in object form then just store on the error object
        if (!isDictionary) {
          errors._others = errors._others || [];
          errors._others.push(modelErrors);
        }

        //Merge programmatic errors (requires model.validate() to return an object e.g. { fieldKey: 'error' })
        if (isDictionary) {
          _.each(modelErrors, function(val, key) {
            //Set error on field if there isn't one already
            if (fields[key] && !errors[key]) {
              fields[key].setError(val);
              errors[key] = val;
            }

            else {
              //Otherwise add to '_others' key
              errors._others = errors._others || [];
              var tmpErr = {};
              tmpErr[key] = val;
              errors._others.push(tmpErr);
            }
          });
        }
      }
    }

    return _.isEmpty(errors) ? null : errors;
  };

  // allow hyphen to be typed in number fields
  Backbone.Form.editors.Number.prototype.onKeyPress = function(event) {
    var self = this,
      delayedDetermineChange = function() {
        setTimeout(function() {
        self.determineChange();
      }, 0);
    };

    //Allow backspace
    if (event.charCode === 0) {
      delayedDetermineChange();
      return;
    }

    //Get the whole new value so that we can prevent things like double decimals points etc.
    var newVal = this.$el.val()
    if( event.charCode != undefined ) {
      newVal = newVal + String.fromCharCode(event.charCode);
    }

    var numeric = /^-?[0-9]*\.?[0-9]*?$/.test(newVal);

    if (numeric) {
      delayedDetermineChange();
    }
    else {
      event.preventDefault();
    }
  };

  Backbone.Form.editors.List.prototype.validate = function(){
    var listValidatorMessage;
    //Collect errors
    var errors = _.map(this.items, function(item) {
      var validated = item.validate();
      // show listValidator messages in priority
      if(validated && validated.type === 'ListValidator'){
        listValidatorMessage = validated.message;
      }
      return validated;
    });

    //Check if any item has errors
    var hasErrors = _.compact(errors).length ? true : false;
    if (!hasErrors) return null;

    //If so create a shared error
    var fieldError = {
      type: 'list',
      message: listValidatorMessage ? listValidatorMessage : 'Some of the items in the list failed validation',
      errors: errors
    };

    return fieldError;
  }

  Backbone.Form.validators = (function() {

    var translateValidator = function(key){
      var translatedKey = Origin.l10n.t(key);
      if (Origin.constants.translating) {
        return translatedKey !== key ? translatedKey : key;
      } else {
        return translatedKey !== key ? translatedKey : undefined;
      }
    }

    var validators = {};

    //need to use translation here
    validators.errMessages = {
      required: translateValidator('app.forms.validators.required') || 'Required',
      regexp: translateValidator('app.forms.validators.invalid') || 'Invalid',
      number: translateValidator('app.forms.validators.number') || 'Must be a number',
      range: _.template((translateValidator('app.forms.validators.range') || 'Must be a number between <%= min %> and <%= max %>'), null, Backbone.Form.templateSettings),
      email: translateValidator('app.forms.validators.email') || 'Invalid email address',
      url: translateValidator('app.forms.validators.url') || 'Invalid URL',
      match: _.template((translateValidator('app.forms.validators.match') || 'Must match field "<%= field %>"'), null, Backbone.Form.templateSettings),
      minimumItems2: translateValidator('app.forms.validators.minimumItems2') || 'You need at least two items'
    };

    validators.required = function(options) {
      options = _.extend({
        type: 'required',
        message: this.errMessages.required
      }, options);

      return function required(value) {
        options.value = value;

        var err = {
          type: options.type,
          message: _.isFunction(options.message) ? options.message(options) : options.message
        };

        if (value === null || value === undefined || value === false || value === '' || $.trim(value) === '' ) return err;
      };
    };

    validators.regexp = function(options) {
      if (!options.regexp) throw new Error('Missing required "regexp" option for "regexp" validator');

      options = _.extend({
        type: 'regexp',
        match: true,
        message: this.errMessages.regexp
      }, options);

      return function regexp(value) {
        options.value = value;

        var err = {
          type: options.type,
          message: _.isFunction(options.message) ? options.message(options) : options.message
        };

        //Don't check empty values (add a 'required' validator for this)
        if (value === null || value === undefined || value === '') return;

        //Create RegExp from string if it's valid
        if ('string' === typeof options.regexp) options.regexp = new RegExp(options.regexp, options.flags);

        if ((options.match) ? !options.regexp.test(value) : options.regexp.test(value)) return err;
      };
    };

    validators.number = function(options) {
      options = _.extend({
        type: 'number',
        message: this.errMessages.number,
        regexp: /^[-+]?([0-9]*.[0-9]+|[0-9]+)$/
      }, options);

      return validators.regexp(options);
    };

    validators.range = function(options) {
      options = _.extend({
        type: 'range',
        message: this.errMessages.range,
        numberMessage: this.errMessages.number,
        min: 0,
        max: 100
      }, options);

      return function range(value) {
        options.value = value;
        var err = {
          type: options.type,
          message: _.isFunction(options.message) ? options.message(options) : options.message
        };

        //Don't check empty values (add a 'required' validator for this)
        if (value === null || value === undefined || value === '') return;

        // check value is a number
        var numberCheck = validators.number({message: options.numberMessage})(value);
        if (numberCheck) return numberCheck;

        // check value is in range
        var number = parseFloat(options.value);
        if (number < options.min || number > options.max) return err;
      }
    }

    validators.email = function(options) {
      options = _.extend({
        type: 'email',
        message: this.errMessages.email,
        regexp: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i
      }, options);

      return validators.regexp(options);
    };

    validators.url = function(options) {
      options = _.extend({
        type: 'url',
        message: this.errMessages.url,
        regexp: /^((http|https):\/\/)?(([A-Z0-9][A-Z0-9_\-]*)(\.[A-Z0-9][A-Z0-9_\-]*)+)(:(\d+))?\/?/i
      }, options);

      return validators.regexp(options);
    };

    validators.match = function(options) {
      if (!options.field) throw new Error('Missing required "field" options for "match" validator');

      options = _.extend({
        type: 'match',
        message: this.errMessages.match
      }, options);

      return function match(value, attrs) {
        options.value = value;

        var err = {
          type: options.type,
          message: _.isFunction(options.message) ? options.message(options) : options.message
        };

        //Don't check empty values (add a 'required' validator for this)
        if (value === null || value === undefined || value === '') return;

        if (value !== attrs[options.field]) return err;
      };
    };

    validators.minimumItems2 = function(options){

      options = _.extend({
        type: 'ListValidator',
        message: this.errMessages.minimumItems2
      }, options);

      return function minimumItems2(value, attrs) {
        return (attrs._items && attrs._items.length >= 2) ? undefined : {
            type: options.type,
            message: _.isFunction(options.message) ? options.message(options) : options.message
          }
      };
    }

    return validators;

  })();

});
