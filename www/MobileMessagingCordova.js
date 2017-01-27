var exec = require('cordova/exec'), MobileMessagingCordova = function () {};

/**
 * Starts a new Mobile Messaging session.
 *
 * @name init
 * @param {Json} configuration for Mobile Messaging
 * Configuration format:
 *	{
 *       applicationCode: '<The application code of your Application from Push Portal website>',
 *       geofencingEnabled: 'true',
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
 * @param {Function} callback will be called when registration is complete
 */
MobileMessagingCordova.prototype.register = function(eventName, callback) {
	exec(callback, function(){}, "MobileMessagingCordova", "register", [eventName])
};

/**
 * Un register from MobileMessaging library event.
 *
 * @name unregister
 * @param {String} eventName
 * @param {Function} callback will be called when unregistration is complete
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

/**
 * Mark messages as seen
 *
 * @name markMessagesSeen
 * @param {Array} array of identifiers of message to mark as seen
 * @param {Function} callback will be called upon completion
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.markMessagesSeen = function(messageIds, callback, errorCallback) {
	exec(callback, errorCallback, "MobileMessagingCordova", "markMessagesSeen", messageIds)
};

MobileMessaging = new MobileMessagingCordova();
module.exports = MobileMessaging;
