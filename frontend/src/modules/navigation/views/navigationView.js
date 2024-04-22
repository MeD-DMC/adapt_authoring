// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require){
  var OriginView = require('core/views/originView');
  var Origin = require('core/origin');

  var NavigationView = OriginView.extend({
    tagName: 'nav',
    className: 'navigation',

    initialize: function() {
      this.listenTo(Origin, 'login:changed', this.loginChanged);
      this.render();
    },

    events: {
      'click a.navigation-item':'onNavigationItemClicked',
      'click .profile-dropbtn':'showProfileDropdown',
      'blur .profile-drop-element':'hideProfileDropdown'
    },

    render: function() {
      this.model.set('userInitials', 'NA');
      var that = this;
      if (Origin.sessionModel && Origin.sessionModel.get('isAuthenticated')) {
        $.ajax({
          url: 'api/user/me',
          method: 'GET',
          async: false,
          error: function(error) {
            console.log('error user me:', error);
          },
          success: function(result){
            if (result) {
              var firstInitial = (result['firstName'])[0].toUpperCase();
              var lastInitial = (result['lastName'])[0].toUpperCase();
              that.model.set('userInitials', firstInitial + lastInitial);
            }
          }
        });
      }
      var data = this.model ? this.model.toJSON() : null;
      var template = Handlebars.templates[this.constructor.template];
      this.$el.html(template(data));
      return this;
    },

    loginChanged: function() {
      this.render();
    },

    onNavigationItemClicked: function(event) {
      event.preventDefault();
      event.stopPropagation();
      this.$el.find("#profile-dropdown").hide();
      Origin.trigger('navigation:' + $(event.currentTarget).attr('data-event'));
    },

    showProfileDropdown: function (event) {
      event.preventDefault();
      event.stopPropagation();
      this.$el.find("#profile-dropdown").show();
    },

    hideProfileDropdown: function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!($(event.relatedTarget).parent() && $($(event.relatedTarget).parent()).hasClass('dropdown-content'))) {
        this.$el.find("#profile-dropdown").hide();
      }
    }
  }, {
    template: 'navigation'
  });

  return NavigationView;
});
