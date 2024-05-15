define(['core/origin', 'backbone-forms'], function (Origin, BackboneForms) {
  var ScaffoldGuidedTourPinFinderView = Backbone.Form.editors.Base.extend({

    className: 'scaffold-guided-tour-pinfinder-editor',

    events: {
    },

    initialize: function (options) {
      Backbone.Form.editors.Base.prototype.initialize.call(this, options);
      this.template = options.template || this.constructor.template;
    },

    render: function () {
      this.$el.append(Handlebars.templates[this.constructor.template]({}));

      return this;
    }

  }, { template: 'scaffoldGuidedTourPinFinder' });

  Origin.on('origin:dataReady', function () {
    Origin.scaffold.addCustomField('GuidedTourPinFinder', ScaffoldGuidedTourPinFinderView);
  });

  return ScaffoldGuidedTourPinFinderView;

});
