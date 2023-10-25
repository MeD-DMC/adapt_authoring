// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {
  var Origin = require('core/origin');
  var Helpers = require('core/helpers');
  var BypassBlockView = require('./views/bypassBlockView');

  Origin.on('skip-focus-to-nav', function() {
    $('.navigation-global-menu').focus();
  });

  Origin.on('origin:dataReady login:changed', function() {
    $('.bypass-block-content').remove();
    $('.navigation').before(
      new BypassBlockView().$el
    );
  });
})
