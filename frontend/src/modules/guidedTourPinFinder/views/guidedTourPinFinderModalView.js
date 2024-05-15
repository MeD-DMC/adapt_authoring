// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require) {

	var Origin = require('core/origin');
	var Backbone = require('backbone');

	var GuidedTourPinFinderModalView = Backbone.View.extend({

		className: 'guided-tour-pin-finder-modal',

		events: {
        "click .apply": "applyToForm",
        "click .cancel": "remove"
	    },

		initialize: function() {
      const form = this.model.get('form');
      const src = form.$el.find('#_graphic_src img').attr('src');
      const imageId = src.substring(src.lastIndexOf('/') + 1);
      this.model.set('src', `api/asset/serve/${imageId}`);
			this.render();
		},

		render: function() {
			var template = Handlebars.templates['guidedTourPinFinderModal'];
			this.$el.html(template(this.model.attributes));
			return this;
		},

    applyToForm: function(){
      var data = {
        left: 50,
        top: 50
      };
      this.applyToPinFields(data);
    },

    applyToPinFields: function(data){
      var form = this.model.get('form');
      var _pin = form.fields._pin.$el;
      var left = _pin.find('#_pin__left');
      var top = _pin.find('#_pin__top');
      left.val(data.left);
      top.val(data.top);
      this.remove();
    }


	});

	return GuidedTourPinFinderModalView;

});
