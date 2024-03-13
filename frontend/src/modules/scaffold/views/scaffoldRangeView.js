define(['require', 'core/origin', 'backbone-forms'], function (require, Origin, BackboneForms) {
  var _ = require('underscore');

  var ScaffoldRangeView = Backbone.Form.editors.Base.extend({

    className: 'scaffold-range-editor',

    initialize: function (options) {
      Backbone.Form.editors.Base.prototype.initialize.call(this, options);
      this.template = options.template || this.constructor.template;
    },

    render: function() {
      var $el = $($.trim(this.template()));
      this.setElement($el);

      this.setValue(this.value);
      return this;
    },

    setValue: function (value) {
      this.$el.val(value);
    },

    getValue: function () {
      var value = this.$el.val();
      console.log('getvalue: ', value);

      return value;
    }

  },
  {
    template: _.template(`
      <input type="range" min="1" max="100" value="50" class="slider">
    `)
  });

  Origin.on('origin:dataReady', function () {
    Origin.scaffold.addCustomField('Range', ScaffoldRangeView);
  });

  return ScaffoldRangeView;

});
