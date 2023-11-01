define(function (require) {
    var Origin = require('core/origin');

    Origin.on('origin:sessionStarted login:changed', function (e) {
        $.ajax({
            url: 'api/user',
            method: 'GET',
            async: false,
            success: function(result) {
                Origin.users = result;
            }
        });
    });

})