define(['core/origin', './views/helpDialogView'], function(Origin, HelpDialogView) {
  Origin.once('origin:dataReady', function() {
    $('#app').before(new HelpDialogView({ model: Origin.sessionModel }).$el);
  });
});
