var exec = require('cordova/exec');

exports.start = function(success, error) {
    alert("Cordova sucks - start method exported correctly");
    exec(success, error, "MobileMessagingCordova", "start");
};

exports.showAlert = function(message, success, error) {
    alert("Will show alert!");
    exec(success, error, "MobileMessagingCordova", "showAlert", [message]);
}
