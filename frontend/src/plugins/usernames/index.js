define(function (require) {
    var Origin = require('core/origin');

    Origin.on('sessionStarted login:changed', function (e) {
      $(document).ready(function() {
        $.ajax({
          url: 'api/user',
          method: 'GET',
          async: false,
          success: function(result) {
              Origin.users = result;
          }
        });
      });
    });

})
