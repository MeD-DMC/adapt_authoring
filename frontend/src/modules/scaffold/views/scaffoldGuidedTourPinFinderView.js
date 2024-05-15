define(['core/origin', 'backbone-forms'], function (Origin, BackboneForms) {
  var ScaffoldGuidedTourPinFinderView = Backbone.Form.editors.Base.extend({

    className: 'scaffold-guided-tour-pinfinder-editor',

    events: {
      "click .edit-pin-position": "editPinPosition"
    },

    initialize: function (options) {
      Backbone.Form.editors.Base.prototype.initialize.call(this, options);
      this.template = options.template || this.constructor.template;
    },

    render: function () {
      this.$el.append(Handlebars.templates[this.constructor.template]({}));
      return this;
    },

    editPinPosition: function(e){
      e.preventDefault();
      Origin.trigger('guidedtourpinfinder:open', this);
    }

  }, { template: 'scaffoldGuidedTourPinFinder' });

  Origin.on('origin:dataReady', function () {
    Origin.scaffold.addCustomField('GuidedTourPinFinder', ScaffoldGuidedTourPinFinderView);
  });

  return ScaffoldGuidedTourPinFinderView;

});
