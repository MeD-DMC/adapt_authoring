define([
  'core/origin', 
  './views/helpDialogView', 
  '../../plugins/helpDialog/models/helpDialogManagementModel'], 
  function(Origin, HelpDialogView, HelpDialogManagementModel) {
    var helpDialogManagementModel = new HelpDialogManagementModel();
    Origin.on('origin:dataReady helpDialogManagementSidebar:views:saved', function() {
      helpDialogManagementModel.fetch({
        success: function(result) {
          $('.help-dialog').remove();
          $('#app').before(new HelpDialogView({ model: result }).$el);
        }
      })
    });
  }
);
