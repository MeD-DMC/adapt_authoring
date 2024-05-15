// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require) {

	var Origin = require('core/origin');
	var Backbone = require('backbone');

	var GuidedTourPinFinderModalView = Backbone.View.extend({

		className: 'guided-tour-pin-finder-modal',

		events: {

	    },

		initialize: function(options) {
      console.log(this);
			//this.options = options;
			//this.listenTo(Origin, '', this.remove);
			//this.listenTo(Origin, 'guidedtourpinfinder:open', this.onOpenModal);
      var value = this.model.get('form').fields._graphic.editor.getValue();
      var src = value.src;
      const parts = src.split('/');
      const imageId = parts[parts.length - 1].split('.')[0];
      console.log(imageId);
      this.model.set('src', imageId);

			this.render();
		},

		render: function() {
			var template = Handlebars.templates['guidedTourPinFinderModal'];
      console.log(this.model);
			this.$el.html(template(this.model));
			return this;
		},


	});

	return GuidedTourPinFinderModalView;

});
