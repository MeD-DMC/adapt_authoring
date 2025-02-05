define(function (require) {
  var passwordHelpers = {
    validatePassword: function(value) {
      var errors = []

      if (!/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(value)) errors = ['missingspecialchars', ...errors];

      if (!/\d/.test(value)) errors = ['missingnumber', ...errors];

      if (!/[A-Z]/.test(value)) errors = ['missinguppercase', ...errors];

      if (!value || value.length < 12) errors = ['tooshort', ...errors];

      return errors;
    },
    validateConfirmationPassword: function(password, confirmationPassword) {
      return confirmationPassword === password
    }
  }
  return passwordHelpers;
});
