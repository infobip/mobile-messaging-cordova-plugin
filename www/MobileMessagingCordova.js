var supportedEvents = ["messageReceived", "notificationTapped", "tokenReceived", "registrationUpdated", "geofenceEntered", "actionTapped", "installationUpdated", "userUpdated", "personalized", "depersonalized"];
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
 * @param {JSON} config. Configuration for Mobile Messaging
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
 *          logging: <Boolean>
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
 * @param {Function} onInitError. Error callback
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
 * Saves user data to the server.
 *
 * @name saveUser
 * @param {Object} userData. An object containing user data
 * {
 *   externalUserId: "myID",
 *   firstName: "John", 
 *   lastName: "Smith",
 *   middleName: "D",
 *   gender: "Male",
 *   birthday: "1985-01-15"
 *   phones: ["79210000000", "79110000000"],
 *   emails: ["one@email.com", "two@email.com"],
 *   tags: ["Sports", "Food"],
 *   customAttributes: {
 *     "stringAttribute": "string",
 *     "numberAttribute": 1,
 *     "dateAttribute": "1985-01-15",
 *     "booleanAttribute": true
 *   }
 * }
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.saveUser = function(userData, callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'saveUser', [userData])
};

/**
 * Fetch user data from the server.
 *
 * @name fetchUser
 * @param {Function} callback will be called with fetched user data on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.fetchUser = function(callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchUser', [])
};

/**
 * Gets user data from the locally stored cache.
 *
 * @name getUser
 * @param {Function} callback will be called with fetched user data on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.getUser = function(callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'getUser', [])
};

/**
 * Saves installation to the server.
 *
 * @name saveInstallation
 * @param {Object} installation. An object containing installation data
 * {
 *   isPrimaryDevice: true,
 *   isPushRegistrationEnabled: true, 
 *   notificationsEnabled: true,
 *   geoEnabled: false,
 *   sdkVersion: "1.2.3",
 *   appVersion: "2.3.4"
 *   os: "iOS",
 *   osVersion: "12",
 *   deviceManufacturer: "Apple",
 *   deviceModel: "iPhone 5s",
 *   deviceSecure: true,
 *   language: "EN",
 *   deviceTimezoneId: "GMT",
 *   applicationUserId: "MyID",
 *   deviceName: "John's iPhone 5s",
 *   customAttributes: {
 *     "stringAttribute": "string",
 *     "numberAttribute": 1,
 *     "dateAttribute": "1985-01-15",
 *     "booleanAttribute": true
 *   }
 * }
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.saveInstallation = function(installation, callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'saveInstallation', [installation])
};

/**
 * Fetches installation from the server.
 *
 * @name fetchInstallation
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.fetchInstallation = function(callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchInstallation', [])
};

/**
 * Gets locally cached installation.
 *
 * @name getInstallation
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.getInstallation = function(callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'getInstallation', [])
};

/**
 * Sets any installation as primary for this user.
 *
 * @name setInstallationAsPrimary
 * @param {String} pushRegistrationId of an installation
 * @param {Boolean} primary or not
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.setInstallationAsPrimary = function(pushRegistrationId, primary, callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'setInstallationAsPrimary', [pushRegistrationId, primary])
};

/**
 * Performs personalization of the current installation on the platform.
 *
 * @name personalize
 * @param {Object} context. An object containing user identity information as well as additional user attributes.
 * { 
 *   userIdentity: {
 * 	   phones: ["79210000000", "79110000000"],
 *     emails: ["one@email.com", "two@email.com"],
 *     externalUserId: "myID"	
 *   },
 *   userAttributes: {
 *	   firstName: "John",
 *     lastName: "Smith" 
 *   },
 *   forceDepersonalize: false
 * }
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.personalize = function(context, callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'personalize', [context])
};

/**
 * Performs depersonalization of the current installation on the platform.
 *
 * @name depersonalize
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.depersonalize = function(callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'depersonalize', [])
};

/**
 * Performs depersonalization of the installation referenced by pushRegistrationId.
 *
 * @param {String} pushRegistrationId of the remote installation to depersonalize
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.depersonalizeInstallation = function(pushRegistrationId, callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'depersonalizeInstallation', [pushRegistrationId])
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

/**
 * Displays built-in error dialog so that user can resolve errors during sdk initialization.
 *
 * @name showDialogForError
 * @param {Number} errorCode to display dialog for
 * @param {Function} callback will be called upon completion
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.showDialogForError = function(errorCode, callback, errorCallback) {
	cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'showDialogForError', [errorCode])
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
