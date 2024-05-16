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
      var data = {
        title: form.fields.title.$el.find('input#title').val() || 'Sample Title',
        body: form.fields.body.$el.find('.ck-content').html(),
        left: form.fields._pin.$el.find('input#_pin__left').val(),
        top: form.fields._pin.$el.find('input#_pin__top').val(),
        direction: form.fields._pin.$el.find('select#_pin__bubbledirection').val(),
        borderColor: form.fields._pin.$el.find('.sp-preview-inner').css('background-color')
      }
      this.model.set('stepData', data);
      this.render();
    },

    preRender: function(){
      this.listenTo(Origin, 'window:resize', this.repositionTarget);
    },

    render: function () {
      this.preRender();
      var template = Handlebars.templates['guidedTourPinFinderModal'];
      this.$el.html(template(this.model.attributes));
      this.postRender();
      return this;
    },

    remove: function () {
      $('#target').remove();
      this.tour.cancel();
      Backbone.View.prototype.remove.apply(this, arguments);
    },

    postRender: function () {
      var self = this;
      var data = this.model.get('stepData');
      var image = this.$el.find('img');

      $('.module-editor').append('<div id="target" class="display-none"></div>');

      $('.module-editor #target').on('mousedown', function (event) {
        self.startDragging(event);
      });
      $('.module-editor #target').on('dragstart', function () {
        return false
      });

      image.on('load', function(){
        self.repositionTarget();
      });

      var templateTitle = Handlebars.templates['guidedTourPinFinderStepTitle'];

      var templateOptions = {
        title: data.title,
        ariaLevel: 4,
        hidePagination: false,
        paginationLabel: '1 / 1',
        paginationAria: 'Step 1 of 1'
      };

      this.tour = new Shepherd.Tour({
        defaultStepOptions: {
          scrollTo: false,
          classes: 'display-none'
        }
      });

      this.tour.addStep({
        id: 'target',
        title: templateTitle(templateOptions),
        text: data.body,
        buttons: [
          {
            action() { return false },
            classes: 'shepherd-button-secondary',
            text: 'Previous'
          },
          {
            action() { return false },
            text: 'Next'
          }
        ],
        attachTo: {
          element: '#target',
          on: data.direction
        },
        classes: 'border',
        when: {
          show: function () {
            $(":root")[0].style.setProperty("--shepherd-border-color", data.borderColor);
          }
        }
      });

      this.tour.start();
    },

    repositionTarget: function () {
      var data = this.model.get('stepData');
      const target = document.getElementById('target');
      var imageCtn = $('.pin-finder-image-wrapper img');
      const imageContainer = imageCtn[0];
      if (!imageContainer) return;
      const containerRect = imageContainer.getBoundingClientRect();

      var percentageX = parseFloat(data.left || 0);
      var percentageY = parseFloat(data.top || 0);
      var x = percentageX / 100 * containerRect.width;
      var y = percentageY / 100 * containerRect.height;

      const clientX = x + imageCtn.offset().left;
      const clientY = y + imageCtn.offset().top;

      $('.pin-finder-controls .left').html(percentageX.toFixed(2));
      $('.pin-finder-controls .top').html(percentageY.toFixed(2));

      target.style.left = `${clientX}px`;
      target.style.top = `${clientY}px`;

      $('.shepherd-element').removeClass('display-none');
      $('#target').removeClass('display-none');

      $('.pin-finder-controls .left').html(percentageX.toFixed(2));
      $('.pin-finder-controls .top').html(percentageY.toFixed(2));
    },

    applyToForm: function () {
      this.applyToPinFields(this.getCoordinates());
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
      window.isDragging = true;
      document.addEventListener('mousemove', this.dragTarget);
      document.addEventListener('mouseup', this.stopDragging);
    },

    dragTarget: function (event) {
      if (window.isDragging) {
        const target = document.getElementById('target');
        var imageCtn = $('.pin-finder-image-wrapper img');
        const imageContainer = imageCtn[0];
        const containerRect = imageContainer.getBoundingClientRect();
        const x = event.clientX - imageCtn.offset().left;
        const y = event.clientY - imageCtn.offset().top;

        var percentageX = (x / containerRect.width) * 100;
        var percentageY = (y / containerRect.height) * 100;

        $('.pin-finder-controls .left').html(percentageX.toFixed(2));
        $('.pin-finder-controls .top').html(percentageY.toFixed(2));

        target.style.left = `${event.clientX}px`;
        target.style.top = `${event.clientY}px`;

      }
    },
    stopDragging: function () {
      window.isDragging = false;
      document.removeEventListener('mousemove', this.dragTarget);
      document.removeEventListener('mouseup', this.stopDragging);
      if (Shepherd && Shepherd.activeTour) Shepherd.activeTour.show();
      $('.shepherd-element').removeClass('display-none');
      $('#target').removeClass('display-none');
    },

    getCoordinates: function () {
      var left = $('.pin-finder-controls .left').html();
      var top = $('.pin-finder-controls .top').html();
      return { left: left, top: top }
    }

  });

  return GuidedTourPinFinderModalView;

});
