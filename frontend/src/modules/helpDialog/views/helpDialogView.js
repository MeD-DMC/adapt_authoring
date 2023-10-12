// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require){
  var OriginView = require('core/views/originView');
  var Origin = require('core/origin');

  var contentViews = {
    AccessibilityIssueView: require('./accessibilityIssueView'),
    AccessibilityIssueWithCourseView: require('./accessibilityIssueWithCourseView'),
    ComplianceIssueView: require('./complianceIssueView'),
    PlatformIssueView: require('./platformIssueView'),
    TechnicalIssueView: require('./technicalIssueView'),
    TechnicalIssueWithCourseView: require('./technicalIssueWithCourseView'),
    TypeOfIssueView: require('./typeOfIssueView')
  };

  var reusableViews = {};

  var users = [];
  $.ajax({
    url: 'api/user',
    type: 'GET',
    async: false,
    success: function(results) {
      users = results;
    }
  });

  var HelpDialogView = OriginView.extend({
    tagName: 'div',
    className: 'help-dialog',

    initialize: function() {
      this.listenTo(Origin, 'login:changed', this.loginChanged);
      if (this.model && this.model.get('helpDialogTitleEN')) this.render();
      var htmlLang = $('html').attr('lang');
      var tempPropertiesBusinessLines = [];

      if (this.model && this.model.get('properties') && this.model.get('properties')['_businessLines']) {
        this.model.get('properties')['_businessLines'].forEach(function(bl, i) {
          bl['title'] = htmlLang === 'en' ? bl['titleEN'] : bl['titleFR'];
          tempPropertiesBusinessLines[i] = bl;
        });
      }

      this.model.set('properties._businessLines', tempPropertiesBusinessLines);
      this.model.set('helpDialogTitle', this.model.get(htmlLang === 'en' ? 'helpDialogTitleEN' : 'helpDialogTitleFR'));
      this.model.set('helpDialog', this.model.get(htmlLang === 'en' ? 'helpDialogEN' : 'helpDialogFR'));
      this.toggleView('TypeOfIssueView', contentViews['TypeOfIssueView']);
    },

    events: {
      'click .at-button': 'toggle',
      'click a.next-view-link': 'toggleViewEventHandler',
      'change select.technical-business-line': 'toggleTechnicalRepInfo'
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
      this.toggleView('TypeOfIssueView', contentViews['TypeOfIssueView']);                    
    },

    getBusinessLineInfo: function(event) {
      var businessLine = this.model.get('properties._businessLines').filter( function(bl) {
        return bl['title'] === $(event.target).val();
      });
      return businessLine[0];
    },

    toggleTechnicalRepInfo: function(event) {
      var bl = this.getBusinessLineInfo(event);
      var repsUl = document.createElement('ul');
      repsUl.classList.add("help-dialog-choice-list");
      bl['atptRepresentative'].forEach(function(rep) {
        var repLi = document.createElement('li');
        var repObject = users.filter(function(u) {
          return u.email === rep;
        })[0];
        var repFullname = '';
        if (repObject) {
          repFullname = `${repObject.firstName} ${repObject.lastName}`;
        }
        repLi.innerHTML = `<a href="${rep}">${repFullname ? repFullname : rep}</a>`;
        repsUl.append(repLi);
      })
      this.$el.find('.help-dialog-technical-reps').html(repsUl);
    },

    toggleViewEventHandler: function(event) {
      var nextView = $(event.target).attr('data-help-dialog-next-view');
      this.toggleView(nextView, contentViews[nextView]);
    },

    toggleView: function(viewName, View) {
      if (!reusableViews[viewName]) {
        reusableViews[viewName] = new View({model: this.model}); 
      }
      this.$el.find('.help-dialog-content-wrapper').html(reusableViews[viewName].render().el);
    }
  }, {
    template: 'helpDialog'
  });

  return HelpDialogView;
});
