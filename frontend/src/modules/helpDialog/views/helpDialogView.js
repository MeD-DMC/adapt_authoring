// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require){
  var OriginView = require('core/views/originView');
  var Origin = require('core/origin');

  var HelpDialogView = OriginView.extend({
    tagName: 'div',
    className: 'help-dialog',

    initialize: function() {
      this.listenTo(Origin, 'login:changed', this.loginChanged);
      this.render();
    },

    events: {
      'click .at-button': 'toggle'
    },

    render: function() {
      var data = this.model ? this.model.toJSON() : null;
      var template = Handlebars.templates[this.constructor.template];
      this.$el.html(template(data));
      return this;
    },

    loginChanged: function() {
      this.render();
    },

    toggle: function() {
      var messageContainer = document.querySelector('.fab-message');
      var toggleButton = messageContainer.querySelector('.fab-message__button div');
      var messageToggle = document.getElementById('fab-message-toggle');
      messageContainer.classList.toggle('is-open');
      toggleButton.classList.toggle('toggle-icon');                    
    }
  }, {
    template: 'helpDialog'
  });

  return HelpDialogView;
});
