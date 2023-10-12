// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {
  var Backbone = require('backbone');
  var Handlebars = require('handlebars');
  var OriginView = require('core/views/originView');
  var Origin = require('core/origin');
  const character_limit = 260;

  var HelpDialogManagementView = OriginView.extend({
    tagName: 'div',
    className: 'help-dialog-management',

    initialize: function(options) {
      this.preRender(options);

      if (options && options.form) {
        this.form = options.form;
        this.filters = [];
      }

      if (this.constructor.template) {
        Origin.trigger(this.constructor.template + ':preRender', this);
      }
      if (this.settings.autoRender) {
        this.render();
      }
      this.listenTo(Origin, 'remove:views', this.remove);
    },

    preRender: function () {
      this.listenTo(Origin, 'helpDialogManagementSidebar:views:save', this.saveHelpDialog);
      this.listenTo(this.model, 'invalid', this.handleValidationError);
      CKEDITOR.plugins.addExternal('wordcount', `${location.pathname || '/'}wordcount/`, 'plugin.js');
    },

    postRender: function () {
      if (!this.form) {
       return this.setViewToReady();
      }
      this.$('.form-container').append(this.form.el);
    },

    handleValidationError: function (model, error) {
      Origin.trigger('sidebar:resetButtons');
      if (error && _.keys(error).length !== 0) {
        _.each(error, function (value, key) {
          this.$('#' + key + 'Error').text(value);
        }, this);
        this.$('.error-text').removeClass('display-none');
      }
    },

    saveHelpDialog: function () {
      var self = this;
      var helpDialogTitleENVal = this.form.fields['helpDialogTitleEN'].editor.getValue();
      var helpDialogTitleFRVal = this.form.fields['helpDialogTitleFR'].editor.getValue();
      var helpDialogENVal = CKEDITOR.instances[this.form.fields['helpDialogEN'].$el.attr('data-editor-id')].getData();
      var helpDialogFRVal = CKEDITOR.instances[this.form.fields['helpDialogFR'].$el.attr('data-editor-id')].getData();
      var propertiesVal = this.form.fields['properties'].editor.getValue();
      propertiesVal.name = "help_dialog";

      this.$('.error-text').addClass('display-none');
      this.$('.error').text('');

      var toChange = {
        name: "help_dialog",
        helpDialogTitleEN: helpDialogTitleENVal,
        helpDialogTitleFR: helpDialogTitleFRVal,
        helpDialogEN: helpDialogENVal,
        helpDialogFR: helpDialogFRVal,
        properties: JSON.stringify(propertiesVal)
      };

      _.extend(toChange, {
        _id: self.model.get('_id')
      });

      self.model.save(toChange, {
        wait: true,
        patch: true,
        error: function (data, error) {
          Origin.trigger('sidebar:resetButtons');
          Origin.Notify.alert({
            type: 'error',
            text: error.responseText || Origin.l10n.t('app.errorgeneric')
          });
        },
        success: function (model) {
          Backbone.history.history.back();
          Origin.trigger('helpDialogManagementSidebar:views:saved');
        }
      });
    },
  }, {
    template: 'helpDialogManagement'
  });

  return HelpDialogManagementView;
});
