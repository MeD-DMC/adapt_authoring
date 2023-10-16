// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require){
  var OriginView = require('core/views/originView');
  var Origin = require('core/origin');

  var PlatformIssueView = OriginView.extend({
    tagName: 'div',
    className: 'help-dialog-inner-content',

    initialize: function() {
      var platformissuelink = "https://forms.office.com/Pages/ResponsePage.aspx?id=RljVnoGKRkKs2LGgGr_A0Un9OJIvHjNFiFE__NvAv8RUN083SEdWSDNUSE9JVU5RMzZRMk5YR1NOUi4u";
      platformissuelink += this.model.get('language') == 'en' ? "" : "&lang=fr-CA";
      this.model.set('platformissuelink', platformissuelink);
      this.render();
    },

    events: {
    }
    
  }, {
    template: 'platformIssue'
  });

  return PlatformIssueView;
});
