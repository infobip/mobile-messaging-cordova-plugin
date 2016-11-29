var exec = require('cordova/exec'), MobileMessagingCordova = function () {};

/**
 * Starts a new Mobile Messaging session.
 *
 * @name init
 * @param {Json} configuration for Mobile Messaging
 * Configuration format:
 *	{
 *       applicationCode: '<The application code of your Application from Push Portal website>',
 *       android: {
 *           senderId: 'sender_id'
 *       },
 *       ios: {
 *			notificationTypes: ['alert', 'sound', 'badge']
 *       }
 * 	}
 * @param {Function} error callback
 */
MobileMessagingCordova.prototype.init = function(config, error) {
	exec(function(){}, error, "MobileMessagingCordova", "init", [config]);
};

/**
 * Register to event coming from MobileMessaging library.
 * The following events are supported:
 *
 *   - messageReceived
 *   - registrationUpdated
 *   - tokenReceived (iOS only)
 *
 * @name register
 * @param {String} eventName
 * @param {Function} callback for handling event
 */
MobileMessagingCordova.prototype.register = function(eventName, callback) {
	exec(callback, function(){}, "MobileMessagingCordova", "register", [eventName])
};

/**
 * Un register from MobileMessaging library event.
 *
 * @name unregister
 * @param {String} eventName
 * @param {Function} callback what will be unregistered
 */
MobileMessagingCordova.prototype.unregister = function(eventName, callback) {
	exec(callback, function(){}, "MobileMessagingCordova", "unregister", [eventName])
};

/**
 * Sync user data to the server.
 *
 * @name syncUserData
 * @param {Object} userData object containing user data
 * @param {Function} callback will be called with synchronized user data on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.syncUserData = function(userData, callback, errorCallback) {
	exec(callback, errorCallback, "MobileMessagingCordova", "syncUserData", [userData])
};

/**
 * Fetch user data from the server.
 *
 * @name fetchUserData
 * @param {Function} callback will be called with fetched user data  on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.fetchUserData = function(callback, errorCallback) {
	exec(callback, errorCallback, "MobileMessagingCordova", "fetchUserData", [])
};

MobileMessaging = new MobileMessagingCordova();
module.exports = MobileMessaging;
