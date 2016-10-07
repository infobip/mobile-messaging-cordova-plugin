var exec = require('cordova/exec');

exports.init = function(config, clientCallback) {
    exec(function(event) {
    	console.log('Received event: ' + JSON.stringify(event));

		switch(event.type) {
			case 'message':
				clientCallback(event.type, event.data);
				break;

			default:
				console.log('Unknown event type from library: ' + event.type);
				break;
		}
    }, function(error){}, "MobileMessagingCordova", "init", [config]);
};