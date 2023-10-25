// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require){
  var OriginView = require('core/views/originView');
  var Origin = require('core/origin');

  var AccessibilityIssueView = OriginView.extend({
    tagName: 'div',
    className: 'help-dialog-inner-content',

    initialize: function() {
      this.render();
    },

    events: {
    }
    
  }, {
    template: 'accessibilityIssue'
  });

  return AccessibilityIssueView;
});