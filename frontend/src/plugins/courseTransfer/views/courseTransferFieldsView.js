// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {
  var Handlebars = require('handlebars');
  var OriginView = require('core/views/originView');
  var Origin = require('core/origin');

  var CourseTransferFieldsView = function (opts) {
    var view = OriginView.extend({
      tagName: 'div',
      className: 'course-transfer-view',
      events: {},

      preRender: function () {
        this.listenTo(this.model, 'invalid', this.handleValidationError);
      },

      postRender: function () {
        var self = this;
        var options = [];
        $.ajax({
          url: 'api/user',
          method: 'GET',
          dataType: 'json',
          async: false,
          success: function (response) {
            for(var i = 0; i < response.length; i++) {
              if (self.model && response[i]._id === self.model.get('_id')) {
                response[i].disabled = true;
              }
            }
            options = response;
          },
          error: function (error) {
          }
        });
        this.transferOwnershipSelectField = this.$el.find('.transfer-ownership-select-field').selectize({
            valueField: '_id',
            labelField: 'email',
            searchField: ['email', 'firstName', 'lastName'],
            options: options,
            maxItems: 1,
            render: {
              item: this.renderItem,
              option: this.renderItem
            },
            onInitialize: function() {
              this.$control.css('background', 'white');
              this.$dropdown.css('position', 'static');
            },
            onChange: function (value) {
              self.model.set('transferTo', value);
              this.$input.val(value);
            }
        });
        this.setViewToReady();
      },

      handleValidationError: function (model, error) {
        Origin.trigger('sidebar:resetButtons');

        if (error && _.keys(error).length !== 0) {
          _.each(error, function (value, key) {
            this.$('#' + key + 'Error').html(value);
          }, this);
          this.$('.error-text').removeClass('display-none');
        }
      },

      renderItem: function (item, escape) {
        return Handlebars.templates.scaffoldUsersOption({
            name: item.firstName && item.lastName ? escape(item.firstName + ' ' + item.lastName) : false,
            email: escape(item.email),
            disabled: item.disabled
        });
      },

    }, {
      template: 'courseTransferFields'
    });

    return new view({model: opts.model}).render();
  }

  return CourseTransferFieldsView;
});
