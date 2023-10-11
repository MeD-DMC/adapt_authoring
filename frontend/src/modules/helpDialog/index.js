define([
  'core/origin', 
  './views/helpDialogView', 
  '../../plugins/helpDialog/models/helpDialogManagementModel'], 
  function(Origin, HelpDialogView, HelpDialogManagementModel) {
  Origin.on('origin:dataReady helpDialogManagementSidebar:views:saved', function() {
    var helpDialogManagementModel = new HelpDialogManagementModel();
    helpDialogManagementModel.fetch({
      success: function(result) {
        $('.help-dialog').remove();
        $('#app').before(new HelpDialogView({ model: result }).$el);
      }
    })
  });
});
