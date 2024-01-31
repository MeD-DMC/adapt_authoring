define([
  'core/origin',
  'backbone-forms',
  'core/helpers'
], function(Origin, BackboneForms, Helpers) {

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
            const textpart = editor.ui.view.toolbar.items.find(button => $(button.element).hasClass('ck-text-fragment-language-dropdown'));
            if (textpart) {
              const label = language === 'en' ? 'Language of Parts' : 'Langue d’un passage';
              $(textpart.element).find('.ck-button__label').text(label);
            }
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
          toolbar: {
            items: [
              'sourceEditing', 'showBlocks', '|',
              'undo', 'redo', '|',
              'findAndReplace', 'selectAll', '|',
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
        .catch((error) => {});
      this.editor = watchdog;
    }.bind(this), 50);

    return this;
  };

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

});
