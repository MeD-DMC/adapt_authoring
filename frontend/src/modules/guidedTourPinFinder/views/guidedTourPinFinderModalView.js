// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {

  var Origin = require('core/origin');
  var Backbone = require('backbone');

  var GuidedTourPinFinderModalView = Backbone.View.extend({

    className: 'guided-tour-pin-finder-modal',

    events: {
      "click .apply": "applyToForm",
      "click .cancel": "remove",
      "change #_pinfinder_bubbledirection": "onDirectionChange",
      "change #_pinfinder_offsetGapSize": "onGapSizeChange",
      "change #_pinfinder_highlight": "onHighlightChange",
      "change #_pinfinder_highlightBorder": "onHighlightBorderChange"
    },

    initialize: function () {
      var self = this;
      var componentId = this.getComponentId();
      const form = this.model.get('form');
      const src = form.$el.find('#_graphic_src img').attr('src');
      const imageId = src.substring(src.lastIndexOf('/') + 1);
      var data = {
        src: `api/asset/serve/${imageId}`,
        title: form.fields.title.$el.find('input#title').val() || 'Sample Title',
        body: form.fields.body.$el.find('.ck-content').html(),
        forceFullWidth: form.fields._graphic.$el.find('input#_graphic__forceFullWidth').is(":checked"),
        left: form.fields._pin.$el.find('input#_pin__left').val(),
        top: form.fields._pin.$el.find('input#_pin__top').val(),
        width: form.fields._pin.$el.find('input#_pin__width').val(),
        height: form.fields._pin.$el.find('input#_pin__height').val(),
        offsetGapSize: form.fields._pin.$el.find('select#_pin__offsetGapSize').val(),
        direction: form.fields._pin.$el.find('select#_pin__bubbledirection').val(),
        borderColor: form.fields._pin.$el.find('.sp-preview-inner').css('background-color'),
        highlight: form.fields._pin.$el.find('input#_pin__highlight').is(':checked'),
        highlightBorder: form.fields._pin.$el.find('input#_pin__highlightBorder').is(':checked'),
      }
      this.model.set('stepData', data);
      if (componentId) {
        $.ajax({
          url: `api/content/component/${componentId}`,
          method: 'GET',
          async: false,
          success: function (res) {
            self.model.set('layoutFull', (res._layout === "full"));
            self.render();
          },
          error: function (error) {
            console.error('Problem loading component content info for component');
            self.remove();
          }
        });
      } else {
        console.error('Problem loading component content info for component');
        self.remove();
      }
    },

    preRender: function () {
      this.listenTo(Origin, 'window:resize', this.repositionTarget);
    },

    render: function () {
      this.preRender();
      var template = Handlebars.templates['guidedTourPinFinderModal'];
      this.$el.html(template(this.model.attributes));
      this.postRender();
      return this;
    },

    postRender: function () {
      var self = this;
      var data = this.model.get('stepData');
      var image = this.$el.find('img');

      image.on('load', function () {
        self.onImageLoaded();
      });

      this.handleHighlightClass(data.highlight);
      this.handleHighlightBorderClass(data.highlightBorder);
    },

    remove: function () {
      $('#target').remove();
      $('#bullseye').remove();
      $('.pin-finder-spectrum').remove();
      if (this.tour) this.tour.cancel();
      Backbone.View.prototype.remove.apply(this, arguments);
    },

    onImageLoaded: function () {
      this.initSpectrum();
      this.initializeCropper();
      this.repositionTarget();
    },

    initSpectrum: function () {
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
        change: function () {
          self.onColorChange();
        },
        move: function () {
          self.onColorChange();
        }
      }
      this.$el.find("#bubbleColor").spectrum(colorOptions);
    },

    initializeShepherd: function () {
      var self = this;
      var data = this.model.get('stepData');
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
          element: '.cropper-crop-box',
          on: data.direction !== 'none' ? data.direction : 'bottom'
        },
        arrow: data.direction !== 'none',
        classes: `border ${data.offsetGapSize}`,
        when: {
          show: function () {
            $(this.el).find('button').attr('disabled', true);
            $(":root")[0].style.setProperty("--shepherd-border-color", data.borderColor);
            requestAnimationFrame(function () {
              self.adjustOutOfBounds();
            });
          }
        }
      });

      this.tour.start();
      this.repositionTarget();
    },

    onColorChange: function () {
      var data = this.model.get('stepData');
      var color = this.$el.find('.sp-preview-inner').css('background-color');
      $(":root")[0].style.setProperty("--shepherd-border-color", color);
      data.borderColor = color;
      this.model.set('stepData', data);
    },

    onDirectionChange: function (event) {
      var data = this.model.get('stepData');
      if (event) data.direction = $(event.target).val();
      this.model.set('stepData', data);
      var currentStep = this.tour.currentStep;
      var options = _.clone(currentStep.options);
      options.attachTo.on = data.direction !== 'none' ? data.direction : 'bottom';
      options.arrow = data.direction !== 'none';
      options.classes = `border ${data.offsetGapSize}`;
      if (this.tour.currentStep.options !== options) {
        this.tour.currentStep.options = options;
        if (Shepherd && Shepherd.activeTour) Shepherd.activeTour.show();
      }
      this.repositionTarget();
    },

    onGapSizeChange: function (event) {
      var data = this.model.get('stepData');
      data.offsetGapSize = $(event.target).val()
      this.model.set('stepData', data);
      var currentStep = this.tour.currentStep;
      var options = _.clone(currentStep.options);
      options.classes = `border ${data.offsetGapSize}`;
      this.repositionTarget();
      if (this.tour.currentStep.options !== options) {
        this.tour.currentStep.options = options;
        if (Shepherd && Shepherd.activeTour) Shepherd.activeTour.show();
      }
    },

    onHighlightChange: function (event) {
      var data = this.model.get('stepData');
      data.highlight = $(event.target).is(':checked');
      this.model.set('stepData', data);
      this.handleHighlightClass(data.highlight);
      this.repositionTarget();
    },

    handleHighlightClass: function(checkbox){
      this.$el.find('.pin-finder-image-wrapper').toggleClass('spotlight-disabled', !checkbox)
    },

    onHighlightBorderChange: function (event) {
      var data = this.model.get('stepData');
      data.highlightBorder = $(event.target).is(':checked');
      this.model.set('stepData', data);
      this.handleHighlightBorderClass(data.highlightBorder);
      this.repositionTarget();
    },

    handleHighlightBorderClass: function(checkbox){
      this.$el.find('.pin-finder-image-wrapper').toggleClass('visible-border', checkbox)
    },

    repositionTarget: function (opts) {
      if (Shepherd && Shepherd.activeTour) Shepherd.activeTour.show();
      $('.shepherd-element').removeClass('display-none');
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
      var width = _pin.find('#_pin__width');
      var height = _pin.find('#_pin__height');
      var offsetGapSize = _pin.find('#_pin__offsetGapSize');
      var direction = _pin.find('#_pin__bubbledirection');
      var color = _pin.find('#_pin__bordercolor');
      var highlight = _pin.find('#_pin__highlight');
      var highlightBorder = _pin.find('#_pin__highlightBorder');
      left.val(data.left);
      top.val(data.top);
      width.val(data.width);
      height.val(data.height);
      offsetGapSize.val(data.offsetGapSize);
      direction.val(data.direction);
      color.spectrum("set", data.borderColor);
      highlight.prop('checked', data.highlight);
      highlightBorder.prop('checked', data.highlightBorder);
    },

    getComponentId: function () {
      const hash = window.location.hash;
      const parts = hash.split('/');
      const extractedPart = parts[parts.length - 2];
      return extractedPart !== "" ? extractedPart : '000';
    },

    initializeCropper: function () {
      var self = this;
      if (this.cropper) {
        this.cropper.destroy();
      }
      var data = this.model.get('stepData');
      var image = this.$el.find('img')[0];
      this.cropper = new Cropper(image, {
        viewMode: 3,
        movable: false,
        scalable: false,
        zoomable: false,
        rotatable: false,
        autoCropArea: 0.1,
        responsive: true,

        crop: function (event) {
          var initialData = self.model.get('stepData');
          var imageCtn = $('.pin-finder-image-wrapper .cropper-wrap-box');

          const imageContainer = imageCtn[0];
          const containerRect = imageContainer.getBoundingClientRect();

          var originalImageCtn = $('.pin-finder-image-wrapper img');
          const originalImageContainer = originalImageCtn[0];
          const originalWidth = originalImageContainer.naturalWidth;
          const originalHeight = originalImageContainer.naturalHeight;

          // Get the rendered dimensions of the image
          const renderedWidth = containerRect.width;
          const renderedHeight = containerRect.height;

          // Calculate the scaling factor
          const scaleX = originalWidth / renderedWidth;
          const scaleY = originalHeight / renderedHeight;

          // Get the crop data from the event detail
          // Adjust the crop data to use the rendered size
          const adjustedCropData = {
            x: event.detail.x / scaleX,
            y: event.detail.y / scaleY,
            width: event.detail.width / scaleX,
            height: event.detail.height / scaleY
          };

          var percentageX = (adjustedCropData.x / containerRect.width) * 100;
          var percentageY = (adjustedCropData.y / containerRect.height) * 100;
          var percentageWidth = (adjustedCropData.width / containerRect.width) * 100;
          var percentageHeight = (adjustedCropData.height / containerRect.height) * 100;

          var data = {
            top: percentageY.toFixed(2),
            left: percentageX.toFixed(2),
            width: percentageWidth.toFixed(2),
            height: percentageHeight.toFixed(2),
            offsetGapSize: initialData.offsetGapSize,
            src: initialData.src,
            title: initialData.title,
            body: initialData.body,
            forceFullWidth: initialData.forceFullWidth,
            direction: initialData.direction,
            borderColor: initialData.borderColor,
            highlight: initialData.highlight,
            highlightBorder: initialData.highlightBorder
          };

          $('.pin-finder-controls .left').html(data.left);
          $('.pin-finder-controls .top').html(data.top);
          $('.pin-finder-controls .width').html(data.width);
          $('.pin-finder-controls .height').html(data.height);

          if (data.left !== 'NaN' && data.top !== 'NaN' && data.width !== 'NaN' && data.height !== 'NaN') {
            self.model.set('stepData', data);
          }
          self.repositionTarget();
        },

        ready: function () {
          if (data.left === '0' && data.height === '0' && data.width === '0' && data.height === '0') {
            data.width = '10';
            data.height = '10';
          }
          var imageCtn = $('.pin-finder-image-wrapper .cropper-wrap-box');
          const imageContainer = imageCtn[0];
          const containerRect = imageContainer.getBoundingClientRect();

          var percentageX = parseFloat(data.left || '0');
          var percentageY = parseFloat(data.top || '0');
          var percentageWidth = parseFloat(data.width || '0');
          var percentageHeight = parseFloat(data.height || '0');

          var originalImageCtn = $('.pin-finder-image-wrapper img');
          const originalImageContainer = originalImageCtn[0];
          const originalWidth = originalImageContainer.naturalWidth;
          const originalHeight = originalImageContainer.naturalHeight;

          var clientX = percentageX / 100 * originalWidth;
          var clientY = percentageY / 100 * originalHeight;
          var clientWidth = percentageWidth / 100 * originalWidth;
          var clientHeight = percentageHeight / 100 * originalHeight;

          var initialCropBox = {
            x: clientX,
            y: clientY,
            width: clientWidth,
            height: clientHeight
          };

          self.cropper.setData(initialCropBox);
          self.initializeShepherd();
        }
      });
    },

    adjustOutOfBounds: function(){
      var self = this;
      var data = this.model.get('stepData');
      var shepherdModal = $('.shepherd-element');
      var cropperContainer = self.$el.find('.cropper-container');
      var cropperCropBox = self.$el.find('.cropper-crop-box');
      var cropperCropBoxWidth = cropperCropBox.outerWidth() + 8;

      if(shepherdModal.length > 0 && cropperContainer.length > 0){

        var shepherdModalPosition = {
          left: cropperCropBox.offset().left - shepherdModal.outerWidth(),
          right: cropperCropBox.offset().left + cropperCropBoxWidth + shepherdModal.outerWidth()
        }

        var cropperContainerPosition = {
          left: cropperContainer.offset().left,
          right: cropperContainer.offset().left + cropperContainer.width()
        }

        var leftOutOfBound = shepherdModalPosition.left - cropperContainerPosition.left < -100;
        var rightOutOfBound =  shepherdModalPosition.right > cropperContainerPosition.right + 100;

        var directionSelect = self.$el.find('#_pinfinder_bubbledirection');

        var leftOption = directionSelect.find('#left');
        var rightOption = directionSelect.find('#right');
        var topOption = directionSelect.find('#top');

        if(data.direction === 'left'){
          if(rightOutOfBound && leftOutOfBound) {
            topOption.prop('selected', true);
            data.direction = 'top';
            self.model.set('stepData', data);
            self.onDirectionChange();
          } else if(leftOutOfBound && !rightOutOfBound){
            rightOption.prop('selected', true);
            leftOption.prop('disabled', true);
            data.direction = 'right';
            self.model.set('stepData', data);
            self.onDirectionChange();
          } else {
            leftOption.prop('disabled', leftOutOfBound);
            rightOption.prop('disabled', rightOutOfBound);
          }
        } else if(data.direction === 'right'){
          if(rightOutOfBound && leftOutOfBound) {
            topOption.prop('selected', true);
            data.direction = 'top';
            self.model.set('stepData', data);
            self.onDirectionChange();
          } else if(rightOutOfBound && !leftOutOfBound){
            leftOption.prop('selected', true);
            rightOption.prop('disabled', true);
            data.direction = 'left';
            self.model.set('stepData', data);
            self.onDirectionChange();
          }
        }
        leftOption.prop('disabled', leftOutOfBound);
        rightOption.prop('disabled', rightOutOfBound);
      }
    }

  });

  return GuidedTourPinFinderModalView;

});
