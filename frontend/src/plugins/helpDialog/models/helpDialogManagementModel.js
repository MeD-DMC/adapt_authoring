// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require) {
  var Backbone = require('backbone');
  var Helpers = require('core/helpers');
  var Origin = require('core/origin');
  var _ = require('underscore');

  var HelpDialogManagementModel = Backbone.Model.extend({

    idAttribute: '_id',
    url: 'api/help_dialogs',

    schema: {
      helpDialogTitleEN: {
        type: "Text",
        inputType: "Text",
        title: `${Origin.l10n.t('app.title')} EN`,
        titleLabel: `${Origin.l10n.t('app.title')} EN`
      },
      helpDialogTitleFR: {
        type: "Text",
        inputType: "Text",
        title: `${Origin.l10n.t('app.title')} FR`,
        titleLabel: `${Origin.l10n.t('app.title')} FR`
      },
      helpDialogEN: {
        type: "TextArea",
        inputType: "TextArea",
        title: `${Origin.l10n.t('app.bodytext')} EN`,
        titleLabel: `${Origin.l10n.t('app.bodytext')} EN`
      },
      helpDialogFR: {
        type: "TextArea",
        inputType: "TextArea",
        title: `${Origin.l10n.t('app.bodytext')} FR`,
        titleLabel: `${Origin.l10n.t('app.bodytext')} FR`
      },
      properties: {
        type: "Object",
        subSchema: {
          _businessLines: {
            title: `${Origin.l10n.t('app.businesslines')}`,
            titleLabel: `${Origin.l10n.t('app.businesslines')}`,
            itemType: "Object",
            type: "List",
            subSchema: {
              titleEN: {
                type: "Text",
                inputType: "Text",
                title: `${Origin.l10n.t('app.title')} EN`,
                titleLabel: `${Origin.l10n.t('app.title')} EN`
              },
              titleFR: {
                type: "Text",
                inputType: "Text",
                title: `${Origin.l10n.t('app.title')} FR`,
                titleLabel: `${Origin.l10n.t('app.title')} FR`
              },
              atptRepresentative: {
                type: "SingleUser",
                inputType: "SingleUser",
                items: {
                  type: "objectid",
                  inputType: "Text",
                  required: false,
                  editorOnly: true,
                  ref: "user"
                },
                title: `ATPT ${Origin.l10n.t('app.representative')}`,
                titleLabel: `ATPT ${Origin.l10n.t('app.representative')}`
              },
              a11yTeamRepresentative: {
                type: "SingleUser",
                inputType: "SingleUser",
                items: {
                  type: "objectid",
                  inputType: "Text",
                  required: false,
                  editorOnly: true,
                  ref: "user"
                },
                title: `A11y Team ${Origin.l10n.t('app.representative')}`,
                titleLabel: `A11y Team ${Origin.l10n.t('app.representative')}`
              }
            }
          }
        }
      }
    },

    validate: function (attributes, options) {
      var validationErrors = {};
      if (!attributes.helpDialogEN) {
        validationErrors.helpDialogEN = Origin.l10n.t('app.validationrequired');
      }
      if (!attributes.helpDialogFR) {
        validationErrors.helpDialogFR = Origin.l10n.t('app.validationrequired');
      }

      return _.isEmpty(validationErrors) 
      ? null
      : validationErrors;
    }

  });

  return HelpDialogManagementModel;

});