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
      'blur .profile-dropbtn':'hideProfileDropdown',
      'blur .navigation-profile':'hideProfileDropdown',
      'blur .navigation-user-logout':'hideProfileDropdown'
    },

    render: function() {
      console.log('origin session model: ', Origin.sessionModel);
      this.model.set('userInitials', 'NA');
      if (Origin.sessionModel) {
        try {
          var firstInitial = (Origin.sessionModel.get('firstName')[0]).toUpperCase();
          var lastInitial = (Origin.sessionModel.get('lastName')[0]).toUpperCase();
          this.model.set('userInitials', firstInitial + lastInitial);
        }
        catch (error) {
          console.log('error getting the user initials: ', error);
        }
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
