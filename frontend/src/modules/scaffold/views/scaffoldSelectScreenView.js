define(['core/origin', 'backbone-forms'], function (Origin, BackboneForms) {
  var ScaffoldSelectScreenView = Backbone.Form.editors.Base.extend({

    className: 'scaffold-select-screen-editor',

    events: {

    },

    initialize: function (options) {
      Backbone.Form.editors.Base.prototype.initialize.call(this, options);
      this.template = options.template || this.constructor.template;
    },

    preRender: function () {
      var screens = [];
      $('.component-edit-inner [data-key="properties"] .field-simulation-screens .list-items .list-item').each(function () {
        $(this).find('div[name="_items"] > div').each(function () {
          var title = $(this).children().eq(0).find('.list-item-value').text();
          var id = $(this).children().eq(1).find('.list-item-value').text();
          var thisScreenId = $('.scaffold-items-modal-sidebar-inner #_screendID input').val();
          if (title && id && id !== 'undefined' && id !== thisScreenId) {
            screens.push({ title: title, screenID: id });
          }
        });
      });
      this.screens = screens;
    },

    render: function () {
      this.preRender();
      this.$el.append(Handlebars.templates[this.constructor.template](this));
      this.setValue(this.value);
      this.postRender();
      return this;
    },

    postRender: function () {

    },

    setValue: function (value) {
      this.$el.find('#_selectScreen').val(value);
    },

    getValue: function () {
      var val = this.$el.find('#_selectScreen').val();
      return val;
    },

    remove: function () {
      Backbone.View.prototype.remove.apply(this, arguments);
    }

  }, { template: 'scaffoldSelectScreen' });

  Origin.on('origin:dataReady', function () {
    Origin.scaffold.addCustomField('SelectScreen', ScaffoldSelectScreenView);
  });

  return ScaffoldSelectScreenView;

});
