var exec = require('cordova/exec');

exports.start = function(success, error) {
    exec(success, error, "MobileMessagingCordova", "start");
};

exports.showAlert = function(message, success, error) {
    exec(success, error, "MobileMessagingCordova", "showAlert", [message]);
};

exports.registerForMessage = function(success, error) {
	exec(success, error, "MobileMessagingCordova", "registerForMessage");
};

exports.initWithCredentials = function(success, error, app_code, extra) {
	exec(success, error, "MobileMessagingCordova", "initWithCredentials", [app_code, extra])
};