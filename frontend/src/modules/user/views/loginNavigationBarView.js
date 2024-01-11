// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {
  var OriginView = require('core/views/originView');

  var LoginNavigationBarView = OriginView.extend({
    tagName: 'nav',
    className: 'login-navigation-bar',

    initialize: function () {
      this.render();
    },

    render: function () {
      var data = this.model ? this.model.toJSON() : null;
      var template = Handlebars.templates[this.constructor.template];
      this.$el.html(template(data));
      return this;
    }
  }, {
    template: 'loginNavigationBar'
  });

  return LoginNavigationBarView;
});
