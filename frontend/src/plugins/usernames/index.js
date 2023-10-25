define(function (require) {
    var Origin = require('core/origin');

    Origin.once('origin:sessionStarted', function (e) {
        $.ajax({
            url: 'api/user',
            method: 'GET',
            async: false,
            success: function(result) {
                Origin.users = result;
            },
            error: function(error) {
                console.error(error);
            }
        });
    });

})