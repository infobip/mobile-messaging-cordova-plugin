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
 *		 messageStorage: '<Message storage save callback>',
 *		 defaultMessageStorage: 'true',
 *       android: {
 *           senderId: 'sender_id'
 *       },
 *       ios: {
 *			notificationTypes: ['alert', 'sound', 'badge']
 *       }
 * 	}
 * @param {Function} error callback
 */
var configuration;
MobileMessagingCordova.prototype.init = function(config, error) {
	configuration = config;
	var messageStorage = configuration.messageStorage;
	if (messageStorage) {
		if (typeof messageStorage.start !== 'function') {
			console.error('Missing messageStorage.start function definition');
			error('Missing messageStorage.start function definition');
			return;
		}
		if (typeof messageStorage.stop !== 'function') {
			console.error('Missing messageStorage.stop function definition');
			error('Missing messageStorage.stop function definition');
			return;
		}
		if (typeof messageStorage.save !== 'function') {
			console.error('Missing messageStorage.save function definition');
			error('Missing messageStorage.save function definition');
			return;
		}
		if (typeof messageStorage.find !== 'function') {
			console.error('Missing messageStorage.find function definition');
			error('Missing messageStorage.find function definition');
			return;
		}
		if (typeof messageStorage.findAll !== 'function') {
			console.error('Missing messageStorage.findAll function definition');
			error('Missing messageStorage.findAll function definition');
			return;
		}

		exec(messageStorage.start, function(){}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.start']);
		exec(messageStorage.stop, function(){}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.stop']);
		exec(messageStorage.save, function(){}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.save']);
		exec(messageStorage_find, function(){}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.find']);
		exec(messageStorage_findAll, function(){}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.findAll']);
	}
	exec(function(){}, error, 'MobileMessagingCordova', 'init', [config]);
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
	exec(callback, function(){}, 'MobileMessagingCordova', 'register', [eventName])
};

/**
 * Un register from MobileMessaging library event.
 *
 * @name unregister
 * @param {String} eventName
 * @param {Function} callback will be called when unregistration is complete
 */
MobileMessagingCordova.prototype.unregister = function(eventName, callback) {
	exec(callback, function(){}, 'MobileMessagingCordova', 'unregister', [eventName])
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
	exec(callback, errorCallback, 'MobileMessagingCordova', 'syncUserData', [userData])
};

/**
 * Fetch user data from the server.
 *
 * @name fetchUserData
 * @param {Function} callback will be called with fetched user data  on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.fetchUserData = function(callback, errorCallback) {
	exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchUserData', [])
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
	exec(callback, errorCallback, 'MobileMessagingCordova', 'markMessagesSeen', messageIds)
};

MobileMessagingCordova.prototype.defaultMessageStorage = function() {
	if (!configuration.defaultMessageStorage) {
		return undefined;
	}

	var defaultMessageStorage = {
		find: function(messageId, callback) {
			exec(callback, function(){}, 'MobileMessagingCordova', 'defaultMessageStorage_find', [messageId]);
	    },

	    findAll: function(callback) {
			exec(callback, function(){}, 'MobileMessagingCordova', 'defaultMessageStorage_findAll', []);
	    },

	    delete: function(messageId, callback) {
			exec(callback, function(){}, 'MobileMessagingCordova', 'defaultMessageStorage_delete', [messageId]);
	    },

	    deleteAll: function(callback) {
			exec(callback, function(){}, 'MobileMessagingCordova', 'defaultMessageStorage_deleteAll', []);
	    }
	};
	return defaultMessageStorage;
};

var messageStorage;
function messageStorage_find(messageId) {
	messageStorage.find(messageId, function(message) {
		exec(function(){}, function(){}, 'MobileMessagingCordova', 'messageStorage_findResult', [message]);
	});
}

function messageStorage_findAll() {
	messageStorage.findAll(function(messages) {
		exec(function(){}, function(){}, 'MobileMessagingCordova', 'messageStorage_findAllResult', messages);
	});
}

MobileMessaging = new MobileMessagingCordova();
module.exports = MobileMessaging;