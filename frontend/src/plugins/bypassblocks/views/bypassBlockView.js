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
      'click .button--skip-link': 'skipToLink'
    },

    skipToLink: function(e) {
      e.preventDefault();
      var href = $(e.target).attr('href').substring(1);
      $('#' + href).focus();
    }
    
  }, {
    template: 'bypassBlock'
  });

  return BypassBlockView;
});
