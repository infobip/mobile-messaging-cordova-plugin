var supportedEvents = ["messageReceived", "notificationTapped", "tokenReceived", "registrationUpdated", "geofenceEntered", "actionTapped"];
var eventHandlers = {};

function execEventHandlerIfExists(parameters) {
	if (parameters == null || parameters.length == 0) {
		return;
	}
	var eventName = parameters[0];
	var handlers = eventHandlers[eventName] || [];
			   
	handlers.forEach(function(handler) {
		if (typeof handler !== 'function') {
			return;
		} else {
			var eventParameters = parameters.slice(1);
			setTimeout(function() {
				handler.apply(null, eventParameters);
			}, 100);
		}
	});
}

/**
 * Constructor
*/
var MobileMessagingCordova = function () {
	this.eventHandlers = eventHandlers;
	this.supportedEvents = supportedEvents;
};

/**
 * Starts a new Mobile Messaging session.
 *
 * @name init
 * @param {JSON} configuration for Mobile Messaging
 * Configuration format:
 *	{
 *		applicationCode: '<The application code of your Application from Push Portal website>',
 *		geofencingEnabled: true,
 *		messageStorage: '<Message storage save callback>',
 *		defaultMessageStorage: true,
 *		android: {
 *			senderId: 'sender_id'
 *		},
 *		ios: {
 *			notificationTypes: ['alert', 'sound', 'badge'],
 *			forceCleanup: <Boolean>,
 *			notificationExtensionAppGroupId: <String>
 *		},
 *		privacySettings: {
 *			applicationCodePersistingDisabled: <Boolean>,
 *			userDataPersistingDisabled: <Boolean>,
 *			carrierInfoSendingDisabled: <Boolean>,
 *			systemInfoSendingDisabled: <Boolean>
 *		},
 *		notificationCategories: [
 *			{
 *				identifier: <String>,
 *				actions: [
 *					{
 *						identifier: <String>,
 *						title: <String>,
 *						foreground: <Boolean>,
 *						authenticationRequired: <Boolean>,
 *						moRequired: <Boolean>,
 *						destructive: <Boolean>,
 *						icon: <String>,
 *						textInputActionButtonTitle: <String>,
 *						textInputPlaceholder: <String>
 *					}
 *				]	
 *			}
 *		]
 *	}
 * @param {Function} error callback
 */
MobileMessagingCordova.prototype.init = function(config, onInitError) {
	var messageStorage = config.messageStorage;
	var _onInitErrorHandler = onInitError || function() {};

	this.configuration = config;

	if (messageStorage) {
		if (typeof messageStorage.start !== 'function') {
			console.error('Missing messageStorage.start function definition');
			_onInitErrorHandler('Missing messageStorage.start function definition');
			return;
		}
		if (typeof messageStorage.stop !== 'function') {
			console.error('Missing messageStorage.stop function definition');
			_onInitErrorHandler('Missing messageStorage.stop function definition');
			return;
		}
		if (typeof messageStorage.save !== 'function') {
			console.error('Missing messageStorage.save function definition');
			_onInitErrorHandler('Missing messageStorage.save function definition');
			return;
		}
		if (typeof messageStorage.find !== 'function') {
			console.error('Missing messageStorage.find function definition');
			_onInitErrorHandler('Missing messageStorage.find function definition');
			return;
		}
		if (typeof messageStorage.findAll !== 'function') {
			console.error('Missing messageStorage.findAll function definition');
			_onInitErrorHandler('Missing messageStorage.findAll function definition');
			return;
		}

		cordova.exec(messageStorage.start, function(){}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.start']);
		cordova.exec(messageStorage.stop, function(){}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.stop']);
		cordova.exec(messageStorage.save, function(){}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.save']);
		cordova.exec(messageStorage_find, function(){}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.find']);
		cordova.exec(messageStorage_findAll, function(){}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.findAll']);
	}

	config.cordovaPluginVersion = cordova.require("cordova/plugin_list").metadata["com-infobip-plugins-mobilemessaging"];

	if (!config.applicationCode) {
		console.error('No application code provided');
		_onInitErrorHandler('No application code provided');
		return;
	}

	cordova.exec(execEventHandlerIfExists, function(){}, 'MobileMessagingCordova', 'registerReceiver', [supportedEvents]);
	cordova.exec(function() {}, _onInitErrorHandler, 'MobileMessagingCordova', 'init', [config]);
};

/**
 * Register to event coming from MobileMessaging library.
 * The following events are supported:
 *
 *   - messageReceived
 *   - notificationTapped
 *   - registrationUpdated
 *   - tokenReceived (iOS only)
 *	 - geofenceEntered
 *	 - actionTapped
 *
 * @name register
 * @param {String} eventName
 * @param {Function} handler will be called when event occurs
 */
MobileMessagingCordova.prototype.register = function(eventName, handler) {
   if (eventName != null && typeof eventName == "string" && supportedEvents.indexOf(eventName) > -1) {
	   var handlers = eventHandlers[eventName] || [];
	   handlers.push(handler);
	   eventHandlers[eventName] = handlers;
   }
};

MobileMessagingCordova.prototype.on = MobileMessagingCordova.prototype.register;

/**
 * Un register from MobileMessaging library event.
 *
 * @name unregister
 * @param {String} eventName
 * @param {Function} handler will be unregistered from event
 */
MobileMessagingCordova.prototype.unregister = function(eventName, handler) {
	var handlers = eventHandlers[eventName] || [];
	var index = handlers.indexOf(handler);
	if (index > -1) {
	   handlers.splice(index, 1);
	}
	eventHandlers[eventName] = handlers;
};

MobileMessagingCordova.prototype.off = MobileMessagingCordova.prototype.unregister;

/**
 * Sync user data to the server.
 *
 * @name syncUserData
 * @param {Object} userData object containing user data
 * @param {Function} callback will be called with synchronized user data on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.syncUserData = function(userData, callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'syncUserData', [userData])
};

/**
 * Fetch user data from the server.
 *
 * @name fetchUserData
 * @param {Function} callback will be called with fetched user data on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.fetchUserData = function(callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchUserData', [])
};

/**
 * Log out user. Function erases currently stored user data on SDK and server associated with push registration, along with messages in SDK storage.
 *
 * @name logout
 * @param {Function} callback will be called upon completion
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.logout = function(callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'logout', [])
};

/**
 * Mark messages as seen
 *
 * @name markMessagesSeen
 * @param {Array} messageIds of identifiers of message to mark as seen
 * @param {Function} callback will be called upon completion
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.markMessagesSeen = function(messageIds, callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'markMessagesSeen', messageIds)
};

MobileMessagingCordova.prototype.defaultMessageStorage = function() {
	var config = this.configuration;
	if (!config.defaultMessageStorage) {
		return undefined;
	}

	var defaultMessageStorage = {
		find: function(messageId, callback) {
			cordova.exec(callback, function(){}, 'MobileMessagingCordova', 'defaultMessageStorage_find', [messageId]);
		},

		findAll: function(callback) {
			cordova.exec(callback, function(){}, 'MobileMessagingCordova', 'defaultMessageStorage_findAll', []);
		},

		delete: function(messageId, callback) {
			cordova.exec(callback, function(){}, 'MobileMessagingCordova', 'defaultMessageStorage_delete', [messageId]);
		},

		deleteAll: function(callback) {
			cordova.exec(callback, function(){}, 'MobileMessagingCordova', 'defaultMessageStorage_deleteAll', []);
		}
	};
	return defaultMessageStorage;
};

function messageStorage_find(messageId) {
	var messageStorage = this.configuration.messageStorage;
	messageStorage.find(messageId, function(message) {
		cordova.exec(function(){}, function(){}, 'MobileMessagingCordova', 'messageStorage_findResult', [message]);
	});
}

function messageStorage_findAll() {
	var messageStorage = this.configuration.messageStorage;
	messageStorage.findAll(function(messages) {
		cordova.exec(function(){}, function(){}, 'MobileMessagingCordova', 'messageStorage_findAllResult', messages);
	});
}

MobileMessaging = new MobileMessagingCordova();
module.exports = MobileMessaging;
