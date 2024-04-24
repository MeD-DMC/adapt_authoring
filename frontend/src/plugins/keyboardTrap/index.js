// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {
  var Origin = require('core/origin');
  var Helpers = require('core/helpers');

  Origin.on('startkeyboardtrap', function(keyboardTrapObject) {
    if (keyboardTrapObject && keyboardTrapObject.$el) {
      var focusableItems = $(`.${keyboardTrapObject.$el.attr('class').replace(' ', '.')} :focusable:not(.trap-wrapper)`);
      if (focusableItems && focusableItems.length > 0) {
        focusableItems.first().on('keydown', function(e) {
          var keyCode = e.keyCode || e.which;
          if(e.type == 'keydown' && keyCode === 9 && e.shiftKey) {
            e.preventDefault();
            focusableItems.last().focus();
          }
        });
        focusableItems.last().on('keydown', function(e) {
          var keyCode = e.keyCode || e.which;
          if(e.type == 'keydown' && keyCode === 9 && !e.shiftKey) {
            e.preventDefault();
            focusableItems.first().focus();
          }
        });
      }
    }
  });

  Origin.on('stopkeyboardtrap', function(keyboardTrapObject) {
    var focusableItems = $(`.${keyboardTrapObject.$el.attr('class')} :focusable`);
    if (focusableItems && focusableItems.length > 1) {
      focusableItems.first().off('keydown');
      focusableItems.last().off('keydown');
    }
  });
})
