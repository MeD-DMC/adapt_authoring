// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require){
  var OriginView = require('core/views/originView');
  var Origin = require('core/origin');

  var BypassBlockView = OriginView.extend({
    tagName: 'div',
    className: 'bypass-block-content',

    initialize: function() {
      this.render();
    },

    events: {
      'keydown .button--skip-link': 'skipToLink',
      'click .button--skip-link': 'skipToLink'
    },

    skipToLink: function(e) {
      e.preventDefault();

      if (e.type == 'click' || (e.type == 'keydown' && e.which == 13)) {
        var href = $(e.target).attr('href').substring(1);
        $('#' + href).focus();
      }

      if ((e.type == 'keydown' && e.which == 9)) {
        var $focusEl = e.shiftKey ? $(e.target).prevAll(':focusable:first') : $(e.target).nextAll(':focusable:first');
        if ($focusEl.length > 0) {
          $focusEl.focus();
        }
        else {
          $('.general-ribbon').length > 0 ? $('.ribbon-inner').focus() : $('.navigation-global-menu').focus();
        }
      }
    }
    
  }, {
    template: 'bypassBlock'
  });

  return BypassBlockView;
});
