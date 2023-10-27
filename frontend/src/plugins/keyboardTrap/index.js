// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {
  var Origin = require('core/origin');
  var Helpers = require('core/helpers');

  Origin.on('startkeyboardtrap', function(keyboardTrapObject) {
    if (keyboardTrapObject && keyboardTrapObject.$el) {
      var focusableItems = $(`.${keyboardTrapObject.$el.attr('class')} :focusable`);
      if (focusableItems && focusableItems.length > 1) {
        $(focusableItems[1]).on('keydown', function(e) {
          var keyCode = e.keyCode || e.which;
          if(e.type == 'keydown' && keyCode === 9 && e.shiftKey) {
            $(focusableItems).last().focus();
          }
        });
        focusableItems.last().on('keydown', function(e) {
          var keyCode = e.keyCode || e.which;
          if(e.type == 'keydown' && keyCode === 9) {
            $(focusableItems[1]).focus();
          }
        });
      }
    }
  });

  Origin.on('stopkeyboardtrap', function(keyboardTrapObject) {
    var focusableItems = $(`.${keyboardTrapObject.$el.attr('class')} :focusable`);
    if (focusableItems && focusableItems.length > 1) {
      $(focusableItems[1]).off('keydown');
      focusableItems.last().off('keydown');
    }
  });
})
