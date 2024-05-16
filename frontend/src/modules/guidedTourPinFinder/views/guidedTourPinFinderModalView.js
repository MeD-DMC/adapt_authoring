// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {

  var Origin = require('core/origin');
  var Backbone = require('backbone');

  var GuidedTourPinFinderModalView = Backbone.View.extend({

    className: 'guided-tour-pin-finder-modal',

    events: {
      "click .apply": "applyToForm",
      "click .cancel": "remove"
    },

    initialize: function () {
      const form = this.model.get('form');
      const src = form.$el.find('#_graphic_src img').attr('src');
      const imageId = src.substring(src.lastIndexOf('/') + 1);
      this.model.set('src', `api/asset/serve/${imageId}`);
      this.render();
    },

    render: function () {
      var template = Handlebars.templates['guidedTourPinFinderModal'];
      this.$el.html(template(this.model.attributes));
      this.postRender();
      return this;
    },

    postRender: function () {
      console.log('postRender');
      console.log(this);
      var image = this.$el.find('img');
      $('.module-editor').append('<div id="target"></div>');
      var self = this;
      $('.module-editor #target').on('mousedown', function(event){
        console.log('mousedown!');
        self.startDragging(event);
      });
      $('.module-editor #target').on('dragstart', function(event){
        console.log('dragstart!');
        return false
      });
      image.on('load', function(){
        console.log('image loaded');
        var tour = new Shepherd.Tour({
          defaultStepOptions: {
            scrollTo: false
          }
        });
        tour.addStep({
          id: 'target',
          title: 'Pin Position Finder',
          text: 'content',
          attachTo: {
            element: '#target',
            on: 'right'
          },
          classes: 'border'
        });
        tour.start();
      })

    },

    applyToForm: function () {
      this.remove();
    },

    applyToPinFields: function (data) {
      var form = this.model.get('form');
      var _pin = form.fields._pin.$el;
      var left = _pin.find('#_pin__left');
      var top = _pin.find('#_pin__top');
      left.val(data.left);
      top.val(data.top);
    },

    startDragging: function (event) {
      isDragging = true;
      document.addEventListener('mousemove', this.dragTarget);
      document.addEventListener('mouseup', this.stopDragging);
    },

    dragTarget: function (event) {
      if (isDragging) {
        const target = document.getElementById('target');
        var imageCtn = $('.pin-finder-image-wrapper img');
        const imageContainer = imageCtn[0];
        const containerRect = imageContainer.getBoundingClientRect();
        const x = event.clientX - imageCtn.offset().left ;
        const y = event.clientY - imageCtn.offset().top ;

        var percentageX = (x / containerRect.width) * 100;
        var percentageY = (y / containerRect.height) * 100;

        console.log(`left: ${percentageX}, top: ${percentageY}`);


        target.style.left = `${event.clientX}px`;
        target.style.top = `${event.clientY}px`;

        //console.log(event.clientX);
        //console.log(event.clientY);

        //left.textContent = `Left: ${getCoordinates().left}%`;
        //top.textContent = `Top:  ${getCoordinates().top}%`;
      }
    },
    stopDragging: function () {
      isDragging = false;
      document.removeEventListener('mousemove', this.dragTarget);
      document.removeEventListener('mouseup', this.stopDragging);
    },

    getCoordinates: function () {
      return { left: this.percentageX.toFixed(2), top: this.percentageY.toFixed(2) }
    },





  });

  return GuidedTourPinFinderModalView;

});
