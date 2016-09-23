var exec = require('cordova/exec');

exports.start = function(success, error) {
    exec(success, error, "MobileMessagingCordova", "start");
};

exports.showAlert = function(message, success, error) {
    exec(success, error, "MobileMessagingCordova", "showAlert", [message]);
}
