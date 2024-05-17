// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {

  var Origin = require('core/origin');
  var Backbone = require('backbone');

  var GuidedTourPinFinderModalView = Backbone.View.extend({

    className: 'guided-tour-pin-finder-modal',

    events: {
      "click .apply": "applyToForm",
      "click .cancel": "remove",
      "change #_pinfinder_bubbledirection": "onDirectionChange"
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
      this.dragTargetBound = this.dragTarget.bind(this);
      this.stopDraggingBound = this.stopDragging.bind(this);
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
        self.onImageLoaded();
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
          classes: 'display-none',
          cancelIcon: {
            enabled: true
          }
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
            $(this.el).find('button').attr('disabled', true);
            $(":root")[0].style.setProperty("--shepherd-border-color", data.borderColor);
          }
        }
      });

      this.tour.start();
    },

    onImageLoaded: function(){
      this.initSpectrum();
      this.repositionTarget();
    },

    initSpectrum: function(){
      var self = this;
      var data = this.model.get('stepData');
      var colorOptions = {
        color: data.borderColor,
        showAlpha: true,
        showInitial: true,
        showInput: true,
        showPalette: true,
        showButtons: true,
        cancelText: Origin.l10n.t('app.scaffold.colourPickerCancel'),
        allowEmpty: true, // to allow empty strings in schema default value
        preferredFormat: "hex3",
        showSelectionPalette: true,
        maxSelectionSize: 24,
        localStorageKey: "adapt-authoring.spectrum.colourpicker",
        containerClassName: 'pin-finder-spectrum',
        change: function() {
          self.onColorChange();
        },
        move: function() {
          self.onColorChange();
        }
      }
      this.$el.find("#bubbleColor").spectrum(colorOptions);
    },

    onColorChange: function(){
      var data = this.model.get('stepData');
      var color = this.$el.find('.sp-preview-inner').css('background-color');
      $(":root")[0].style.setProperty("--shepherd-border-color", color);
      data.borderColor = color;
      this.model.set('stepData', data);
    },

    repositionTarget: function (opts) {
      var data = this.model.get('stepData');
      const target = document.getElementById('target');
      var imageCtn = $('.pin-finder-image-wrapper img');
      const imageContainer = imageCtn[0];
      if (!imageContainer) return;
      const containerRect = imageContainer.getBoundingClientRect();

      var percentageX = parseFloat((opts && opts.left) || data.left || '0');
      var percentageY = parseFloat((opts && opts.top) || data.top || '0');
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
      var data = this.model.get('stepData');
      this.applyToFields(data);
      this.remove();
    },

    applyToFields: function (data) {
      var form = this.model.get('form');
      var _pin = form.fields._pin.$el;
      var left = _pin.find('#_pin__left');
      var top = _pin.find('#_pin__top');
      var direction = _pin.find('#_pin__bubbledirection');
      var color = _pin.find('#_pin__bordercolor');
      left.val(data.left);
      top.val(data.top);
      direction.val(data.direction);
      color.spectrum("set", data.borderColor);
    },

    startDragging: function (event) {
      window.isDragging = true;
      const self = this;
      document.addEventListener('mousemove', this.dragTargetBound);
      document.addEventListener('mouseup', document.addEventListener('mouseup', function (e) {
          self.stopDragging(self);
        })
      );
    },

    dragTarget: function (event) {
      if (window.isDragging) {
        var data = this.model.get('stepData');
        const target = document.getElementById('target');
        var imageCtn = $('.pin-finder-image-wrapper img');
        const imageContainer = imageCtn[0];
        const containerRect = imageContainer.getBoundingClientRect();
        const x = event.clientX - imageCtn.offset().left;
        const y = event.clientY - imageCtn.offset().top;

        var percentageX = (x / containerRect.width) * 100;
        var percentageY = (y / containerRect.height) * 100;

        data.left = percentageX.toFixed(2);
        data.top = percentageY.toFixed(2);

        $('.pin-finder-controls .left').html(percentageX.toFixed(2));
        $('.pin-finder-controls .top').html(percentageY.toFixed(2));

        target.style.left = `${event.clientX}px`;
        target.style.top = `${event.clientY}px`;

        this.model.set('stepData', data);
      }
    },
    stopDragging: function (self) {
      self.handleOutOfViewport();
      window.isDragging = false;
      document.removeEventListener('mousemove', this.dragTargetBound);
      document.removeEventListener('mouseup', this.stopDraggingBound);
      if (Shepherd && Shepherd.activeTour) Shepherd.activeTour.show();
      $('.shepherd-element').removeClass('display-none');
      $('#target').removeClass('display-none');
    },

    handleOutOfViewport: function () {
      if ($('.shepherd-element').length > 0) {
        const shepherdRect = $('.shepherd-element')[0].getBoundingClientRect();
        const acceptableTop = window.innerHeight * 2.5 / 100;
        const acceptableLeft = window.innerWidth * 2.5 / 100;
        if (
          shepherdRect.bottom > (window.innerHeight) ||
          shepherdRect.right > window.innerWidth ||
          shepherdRect.left < acceptableLeft ||
          shepherdRect.top < acceptableTop
        ) {
          this.repositionTarget({left: '0', top: '0'});
        }
      }
    },

    getCoordinates: function () {
      var left = $('.pin-finder-controls .left').html();
      var top = $('.pin-finder-controls .top').html();
      return { left: left, top: top }
    },

    onDirectionChange: function(event){
      var data = this.model.get('stepData');
      data.direction = $(event.target).val()
      this.model.set('stepData', data);
      var currentStep = this.tour.currentStep;
      var options = _.clone(currentStep.options);
      options.attachTo.on = data.direction !== 'none' ? data.direction : 'bottom';
      options.arrow = data.direction !== 'none';
      options.classes = 'border';
      if(this.tour.currentStep.options !== options){
        this.tour.currentStep.options = options;
        if (Shepherd && Shepherd.activeTour) Shepherd.activeTour.show();
      }
    }

  });

  return GuidedTourPinFinderModalView;

});
