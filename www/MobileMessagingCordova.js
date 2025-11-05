//
//  MobileMessagingCordova.js
//  MobileMessagingCordova
//
// Copyright (c) 2016-2025 Infobip Limited
// Licensed under the Apache License, Version 2.0
//

var supportedEvents = ["messageReceived", "notificationTapped", "tokenReceived", "registrationUpdated", "actionTapped", "installationUpdated", "userUpdated", "personalized", "depersonalized", "deeplink", "inAppChat.unreadMessageCounterUpdated"];
var eventHandlers = {};

function execEventHandlerIfExists(parameters) {
    if (parameters == null || parameters.length == 0) {
        return;
    }
    var eventName = parameters[0];
    var handlers = eventHandlers[eventName] || [];

    handlers.forEach(function (handler) {
        if (typeof handler !== 'function') {
            return;
        } else {
            var eventParameters = parameters.slice(1);
            setTimeout(function () {
                handler.apply(null, eventParameters);
            }, 100);
        }
    });
}

function isEmpty(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }

    return true;
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
 *  {
 *      applicationCode: <String; the application code of your Application from Push Portal website>,
 *      inAppChatEnabled: <Boolean; set to true to enable in-app chat feature>,
 *      fullFeaturedInAppsEnabled: <Boolean; set to true to enable full featured in-app messages>,
 *      messageStorage: <Object; custom message storage implementation> {
 *          start: function() {},                          // Called when storage should be initialized
 *          stop: function() {},                           // Called when storage should be deinitialized
 *          save: function(messages) {},                   // Called with array of message objects to save
 *          find: function(messageId, callback) {},        // Called to find message by ID, must call callback(message) with found message
 *          findAll: function(callback) {}                 // Called to retrieve all messages, must call callback(messages) with array of messages
 *      },
 *      defaultMessageStorage: <Boolean; set to true to use built-in message storage>,
 *      userDataJwt: <String; JWT token for authorization of user data related operations>,
 *      trustedDomains: <Array<String>; list of trusted domain strings for web views, e.g. ['example.com', 'trusted.org']>,
 *      loggingEnabled: <Boolean; set to true to enable debug logging>,
 *      ios: <Object; iOS-specific configuration settings> {
 *          notificationTypes: <Array<String>; preferable notification types that indicating how the app alerts the user when a push notification arrives, e.g. ['alert', 'sound', 'badge']>,
 *          forceCleanup: <Boolean; defines whether the SDK must be cleaned up on startup. Default: false>,
 *          registeringForRemoteNotificationsDisabled: <Boolean; set to true to disable automatic registration for remote notifications. Default: false>,
 *          overridingNotificationCenterDelegateDisabled: <Boolean; set to true to prevent SDK from overriding UNUserNotificationCenterDelegate. Default: false>,
 *          unregisteringForRemoteNotificationsDisabled: <Boolean; set to true to prevent SDK from unregistering for remote notifications when stopping SDK or after depersonalization, useful when using MobileMessaging SDK with another push provider. Default: false>,
 *          webViewSettings: <Object; settings for web view configuration in in-app messages> {
 *              title: <String; custom title for the web view toolbar>,
 *              barTintColor: <String; hex color string for the toolbar background color>,
 *              titleColor: <String; hex color string for the toolbar title text color>,
 *              tintColor: <String; hex color string for the toolbar button color>
 *          }
 *      },
 *      android: <Object; Android-specific configuration settings> {
 *          notificationIcon: <String; a resource name for a status bar icon (without extension), located in '/platforms/android/app/src/main/res/mipmap'>
 *          notificationChannelId: <String; identifier for notification channel>,
 *          notificationChannelName: <String; user visible name for notification channel>,
 *          notificationSound: <String; a resource name for a notification sound (without extension), located in '/platforms/android/app/src/main/res/raw'>,
 *          multipleNotifications: <Boolean; set to true when you want to show multiple notifications in status bar>,
 *          notificationAccentColor: <String; hex color string to be used as accent color for notifications>,
 *          withBannerForegroundNotificationsEnabled: <Boolean>
 *      },
 *      privacySettings: <Object; privacy-related configuration settings> {
 *          userDataPersistingDisabled: <Boolean; set to true to disable persisting User Data locally. Default: false>,
 *          carrierInfoSendingDisabled: <Boolean; set to true to disable sending carrier information to server. Default: false>,
 *          systemInfoSendingDisabled: <Boolean; set to true to disable sending system information (OS version, device model, app version) to server. Default: false>
 *      },
 *      notificationCategories: <Array; notification categories with interactive actions for push notifications> [
 *          <Object; notification category> {
 *              identifier: <String; category identifier>,
 *              actions: <Array; notification actions> [
 *                  <Object; notification action> {
 *                      identifier: <String; a unique action identifier>,
 *                      title: <String; an action title, represents a notification action button label>,
 *                      foreground: <Boolean; if true, to bring the app to foreground or leave it in background state (or not): false>,
 *                      textInputPlaceholder: <String; custom input field placeholder>
 *                      moRequired: <Boolean; to trigger MO message sending (or not). Default: false>,
 *                      authenticationRequired: <Boolean; iOS only - to require device to be unlocked before performing (or not). Default: false>,
 *                      textInputActionButtonTitle: <String; iOS only - custom label for a sending button>,
 *                      destructive: <Boolean; iOS only - to be marked as destructive (or not). Default: false>,
 *                      icon: <String; Android only - a resource name for a special action icon'>,
 *                  }
 *              ]
 *          }
 *      ]
 *  }
 *  @param {Function} callback. Called after successful start of Mobile Messaging SDK initialization. Notice: no Mobile Messaging SDK
 *  methods can be called in this callback as it is not yet initialized. To know when Mobile Messaging SDK is fully initialized, subscribe
 *  to "registrationUpdated" event.
 * @param {Function} onInitError. Error callback.
 */
MobileMessagingCordova.prototype.init = function (config, callback, onInitError) {
    var messageStorage = config.messageStorage;
    var _onInitErrorHandler = onInitError || function () {};
    var _successCallback = callback || function () {};

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

        cordova.exec(messageStorage.start, function () {}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.start']);
        cordova.exec(messageStorage.stop, function () {}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.stop']);
        cordova.exec(messageStorage.save, function () {}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.save']);
        cordova.exec(messageStorage_find, function () {}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.find']);
        cordova.exec(messageStorage_findAll, function () {}, 'MobileMessagingCordova', 'messageStorage_register', ['messageStorage.findAll']);
    }

    config.cordovaPluginVersion = cordova.require("cordova/plugin_list").metadata["com-infobip-plugins-mobilemessaging"];

    if (!config.applicationCode) {
        console.error('No application code provided');
        _onInitErrorHandler('No application code provided');
        return;
    }

    cordova.exec(execEventHandlerIfExists, function () {
    }, 'MobileMessagingCordova', 'registerReceiver', [supportedEvents]);
    cordova.exec(_successCallback, _onInitErrorHandler, 'MobileMessagingCordova', 'init', [config]);
};

/**
 * Register to event coming from MobileMessaging library.
 * The following events are supported:
 *
 *   - messageReceived
 *   - notificationTapped
 *   - registrationUpdated
 *   - tokenReceived
 *   - actionTapped
 *   - installationUpdated
 *   - userUpdated
 *   - personalized
 *   - depersonalized
 *
 * @name register
 * @param {String} eventName
 * @param {Function} handler. Will be called when event occurs.
 */
MobileMessagingCordova.prototype.register = function (eventName, handler) {
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
 * @param {Function} handler. Will be unregistered from event.
 */
MobileMessagingCordova.prototype.unregister = function (eventName, handler) {
    var handlers = eventHandlers[eventName] || [];
    var index = handlers.indexOf(handler);
    if (index > -1) {
        handlers.splice(index, 1);
    }
    eventHandlers[eventName] = handlers;
};

MobileMessagingCordova.prototype.off = MobileMessagingCordova.prototype.unregister;

/**
 * Un register all handlers for MobileMessaging library event.
 *
 * @name unregisterAllHandlers
 * @param {String} eventName
 */
MobileMessagingCordova.prototype.unregisterAllHandlers = function (eventName) {
    eventHandlers[eventName] = [];
};

/**
 * Saves user data to the server.
 *
 * @name saveUser
 * @param {Object} userData. An object containing user data
 * {
 *   externalUserId: <String; external user ID, e.g. "myID">,
 *   firstName: <String; user's first name, e.g. "John">,
 *   lastName: <String; user's last name, e.g. "Smith">,
 *   middleName: <String; user's middle name, e.g. "D">,
 *   gender: <String; user's gender, can be "Male" or "Female">,
 *   birthday: <String; user's birthday in format "YYYY-MM-DD", e.g. "1985-01-15">,
 *   tags: <Array<String>; list of user tags, e.g. ["Sports", "Food"]>,
 *   phones: <Array<String>; list of user phone numbers, e.g. ["79210000000", "79110000000"]>,
 *   emails: <Array<String>; list of user email addresses, e.g. ["one@email.com", "two@email.com"]>,
 *   customAttributes: <Object; map of custom user attributes. Each attribute can be one of the following types: String, Number, Date (in "YYYY-MM-DD" format), DateTime (in ISO8601 UTC format), Boolean, or List. You can provide any combination of these types based on your needs> {
 *     "someStringAttribute": "value",
 *     "someNumberAttribute": 123,
 *     "someDateAttribute": "1985-01-15",
 *     "someDateTimeAttribute": "2025-01-15T10:30:00Z",
 *     "someBooleanAttribute": true,
 *     "someListAttribute": [{"key1": "stringValue", "key2": 456}, {"key1": "anotherString", "key2": true}] // List is an array of objects where each object contains key-value pairs. Values can be String, Number, Date (in "YYYY-MM-DD" format), DateTime (in ISO8601 UTC format), or Boolean
 *   }
 * }
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.saveUser = function (userData, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'saveUser', [userData])
};

/**
 * Fetch user data from the server.
 *
 * @name fetchUser
 * @param {Function} callback. Will be called with fetched user data on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.fetchUser = function (callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchUser', [])
};

/**
 * Gets user data from the locally stored cache.
 *
 * @name getUser
 * @param {Function} callback. Will be called with fetched user data on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.getUser = function (callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'getUser', [])
};

/**
 * Fetch mobile inbox data from the server.
 *
 * @name fetchInboxMessages
 * @param {String} token. Access token (JWT in a strictly predefined format) required for current user to have access to the Inbox messages.
 * @param {String} externalUserId. External User ID is meant to be an ID of a user in an external (non-Infobip) service.
 * @param {Object} filterOptions. Filtering options applied to messages list in response. Nullable, will return default number of messages - 20.
 * {
 *   fromDateTime: <String; filter messages received after this datetime in ISO8601 format with timezone, e.g. "2024-03-11T12:00:00+01:00">,
 *   toDateTime: <String; filter messages received before this datetime in ISO8601 format with timezone, e.g. "2024-03-20T12:00:00+01:00">,
 *   topic: <String; filter messages by a single topic. Mutually exclusive with 'topics' - if 'topic' is provided, 'topics' must be null>,
 *   topics: <Array<String>; filter messages by multiple topics, e.g. ["topic1", "topic2"]. Mutually exclusive with 'topic' - if 'topics' is provided, 'topic' must be null>,
 *   limit: <Number; maximum number of messages to return, by default 20>,
 * }
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.fetchInboxMessages = function (token, externalUserId, filterOptions, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchInboxMessages', [token, externalUserId, filterOptions])
};

/**
 * Fetch mobile inbox without token from the server.
 *
 * @name fetchInboxMessagesWithoutToken
 * @param {String} externalUserId. External User ID is meant to be an ID of a user in an external (non-Infobip) service.
 * @param {Object} filterOptions. Filtering options applied to messages list in response. Nullable, will return default number of messages - 20.
 * {
 *   fromDateTime: <String; filter messages received after this datetime in ISO8601 format with timezone, e.g. "2024-03-11T12:00:00+01:00">,
 *   toDateTime: <String; filter messages received before this datetime in ISO8601 format with timezone, e.g. "2024-03-20T12:00:00+01:00">,
 *   topic: <String; filter messages by a single topic. Mutually exclusive with 'topics' - if 'topic' is provided, 'topics' must be null>,
 *   topics: <Array<String>; filter messages by multiple topics, e.g. ["topic1", "topic2"]. Mutually exclusive with 'topic' - if 'topics' is provided, 'topic' must be null>,
 *   limit: <Number; maximum number of messages to return, by default 20>,
 * }
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.fetchInboxMessagesWithoutToken = function (externalUserId, filterOptions, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchInboxMessagesWithoutToken', [externalUserId, filterOptions])
};

/**
 * Asynchronously marks inbox messages as seen
 *
 * @name setInboxMessagesSeen
 * @param {String} externalUserId. External User ID is meant to be an ID of a user in an external (non-Infobip) service.
 * @param {Array<String>} messageIds. Array of inbox message identifiers that need to be marked as seen, e.g. ["messageId1", "messageId2"].
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.setInboxMessagesSeen = function (externalUserId, messageIds, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'setInboxMessagesSeen', [externalUserId, messageIds])
};

/**
 * Sets the JWT provider used to authenticate in-app chat sessions.
 *
 * The `jwtProvider` is a callback function that returns a JSON Web Token (JWT)
 * used for chat authentication. It supports both **synchronous** and **asynchronous** approaches:
 *
 * ### Synchronous usage:
 * ```ts
 * MobileMessaging.setChatJwtProvider(() => {
 *   return "your_token"; // Return a valid JWT string directly
 * });
 * ```
 *
 * ### Asynchronous usage:
 * ```ts
 * MobileMessaging.setChatJwtProvider(async () => {
 *   const jwt = await getChatToken(...);
 *   return jwt; // Return a Promise<string> that resolves to a valid JWT
 * });
 * ```
 *
 * > ⚠️ This callback may be invoked multiple times during the widget's lifecycle 
 * (e.g., due to screen orientation changes or network reconnection).
 * It is important to return a **fresh and valid JWT** each time.
 *
 * @param jwtProvider A callback function that returns a JWT string or a Promise that resolves to one.
 * @param errorCallback Optional error handler for catching exceptions thrown during JWT generation.
 */
MobileMessagingCordova.prototype.setChatJwtProvider = function (jwtProvider, errorCallback) {
    const errorHandler = function (e) {
        cordova.exec(null, null, "MobileMessagingCordova", "setChatJwt", [null]);
        if (errorCallback) {
            errorCallback(e);
        } else {
            console.error('Error in setChatJwtProvider(), could not obtain chat JWT: ' + e);
        }
    };

    cordova.exec(
        function onEventFromNative(event) {
            if (event == 'inAppChat.internal.jwtRequested') {
                try {
                    const jwtPromise = jwtProvider();
                    if (jwtPromise && typeof jwtPromise.then === 'function') { // Handle asynchronous JWT provider of type Promise<string>
                        jwtPromise
                            .then(
                                function (jwt) {
                                    cordova.exec(null, null, "MobileMessagingCordova", "setChatJwt", [jwt]);
                                }
                            )
                            .catch(errorHandler);
                    } else { // Handle synchronous JWT provider of type () => string
                        cordova.exec(null, null, "MobileMessagingCordova", "setChatJwt", [jwtPromise]);
                    }
                } catch (e) {
                    errorHandler(e);
                }
            }
        },
        errorHandler,
        'MobileMessagingCordova',
        'setChatJwtProvider',
        []
    );
};

function ChatException(params) {
    this.code = params.code;
    this.name = params.name;
    this.message = params.message;
    this.origin = params.origin;
    this.platform = params.platform;
}

/**
 * Sets the chat exception handler in case you want to intercept and
 * display the errors coming from the chat on your own (instead of relying on the prebuild error banners).
 * The `exceptionHandler` is a function that receives the exception. Passing `null` will remove the previously set handler.
 *
 *
 * ### Example usage:
 * ```ts
 *  MobileMessaging.setChatExceptionHandler(
 *       function (exception) {
 *           utils.log('Cordova app: Chat exception received: ' + exception);
 *       },
 *       function (error) {
 *           utils.log('Cordova app: Error setting chat exception handler: ' + error);
 *       }
 * );
 * ```
 *
 * @param exceptionHandler A function that returns an exception when it is triggered.
 * @param errorCallback Optional error handler for catching exceptions thrown when handling exceptions from native side.
 */
MobileMessagingCordova.prototype.setChatExceptionHandler = function (exceptionHandler, errorCallback) {
    const errorHandler = function (e) {
        if (errorCallback) {
            errorCallback(e);
        } else {
            console.error('Error in setChatExceptionHandler(), could not set exception handler: ' + e);
        }
    };

    cordova.exec(
        function onEventFromNative(event) {
            if (event && event.internalEventId === 'inAppChat.internal.exceptionReceived') {
               const exception = new ChatException(event);
               exceptionHandler(exception);
            }
        },
        errorHandler,
        'MobileMessagingCordova',
        'setChatExceptionHandler',
        [exceptionHandler !== null]
    );
};

/**
 * Saves installation to the server.
 *
 * @name saveInstallation
 * @param {Object} installation. An object containing installation data
 * {
 *   isPrimaryDevice: <Boolean; whether this is the primary device for the user, e.g. true>,
 *   isPushRegistrationEnabled: <Boolean; whether push registration is enabled, e.g. true>,
 *   notificationsEnabled: <Boolean; whether notifications are enabled, e.g. true>,
 *   sdkVersion: <String; SDK version, e.g. "1.2.3">,
 *   appVersion: <String; application version, e.g. "2.3.4">,
 *   os: <String; operating system, e.g. "iOS" or "Android">,
 *   osVersion: <String; operating system version, e.g. "12">,
 *   deviceManufacturer: <String; device manufacturer, e.g. "Apple">,
 *   deviceModel: <String; device model, e.g. "iPhone 5s">,
 *   deviceSecure: <Boolean; whether device has security features enabled, e.g. true>,
 *   language: <String; device language, e.g. "EN">,
 *   deviceTimezoneOffset: <String; UTC-related timezone offset that identifies a current timezone of a device>,
 *   applicationUserId: <String; application-specific user identifier, e.g. "MyID">,
 *   deviceName: <String; custom device name, e.g. "John's iPhone 5s">,
 *   customAttributes: <Object; map of custom installation attributes. Each attribute can be one of the following types: String, Number, Date (in "YYYY-MM-DD" format), DateTime (in ISO8601 UTC format), Boolean, or List. You can provide any combination of these types based on your needs> {
 *     "someStringAttribute": "value",
 *     "someNumberAttribute": 123,
 *     "someDateAttribute": "1985-01-15",
 *     "someDateTimeAttribute": "2025-01-15T10:30:00Z",
 *     "someBooleanAttribute": true,
 *     "someListAttribute": [{"key1": "stringValue", "key2": 456}, {"key1": "anotherString", "key2": true}] // List is an array of objects where each object contains key-value pairs. Values can be String, Number, Date (in "YYYY-MM-DD" format), DateTime (in ISO8601 UTC format), or Boolean
 *   }
 * }
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.saveInstallation = function (installation, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'saveInstallation', [installation])
};

/**
 * Fetches installation from the server.
 *
 * @name fetchInstallation
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.fetchInstallation = function (callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchInstallation', [])
};

/**
 * Gets locally cached installation.
 *
 * @name getInstallation
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.getInstallation = function (callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'getInstallation', [])
};

/**
 * Sets any installation as primary for this user.
 *
 * @name setInstallationAsPrimary
 * @param {String} pushRegistrationId. Infobip's pushRegistrationId of an installation.
 * @param {Boolean} primary. Set installation as primary or not.
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.setInstallationAsPrimary = function (pushRegistrationId, primary, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'setInstallationAsPrimary', [pushRegistrationId, primary])
};

/**
 * Performs personalization of the current installation on the platform.
 *
 * @name personalize
 * @param {Object} context. An object containing user identity information as well as additional user attributes.
 * {
 *   userIdentity: <Object; user identity information> {
 *     phones: <Array<String>; list of user phone numbers, e.g. ["79210000000", "79110000000"]>,
 *     emails: <Array<String>; list of user email addresses, e.g. ["one@email.com", "two@email.com"]>,
 *     externalUserId: <String; external user ID, e.g. "myID">
 *   },
 *   userAttributes: <Object; additional user attributes> {
 *     firstName: <String; user's first name, e.g. "John">,
 *     lastName: <String; user's last name, e.g. "Smith">
 *   },
 *   forceDepersonalize: <Boolean; if true, depersonalize previous user data before personalizing with new data. Default: false>,
 *   keepAsLead: <Boolean; set to true if you want to keep the installation as a lead when personalizing it. Default: false>
 * }
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.personalize = function (context, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'personalize', [context])
};

/**
 * Performs depersonalization of the current installation on the platform.
 *
 * @name depersonalize
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.depersonalize = function (callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'depersonalize', [])
};

/**
 * Performs depersonalization of the installation referenced by pushRegistrationId.
 *
 * @param {String} pushRegistrationId. Infobip's pushRegistrationId of the remote installation to depersonalize.
 * @param {Function} callback. Will be called on success.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.depersonalizeInstallation = function (pushRegistrationId, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'depersonalizeInstallation', [pushRegistrationId])
};

/**
 * Mark messages as seen
 *
 * @name markMessagesSeen
 * @param {Array<String>} messageIds. Array of identifiers of message to mark as seen.
 * @param {Function} callback. Will be called upon completion.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.markMessagesSeen = function (messageIds, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'markMessagesSeen', messageIds)
};

/**
 * Displays built-in error dialog so that user can resolve errors during sdk initialization.
 *
 * @name showDialogForError
 * @param {Number} errorCode. The error code to display dialog for.
 * @param {Function} callback. Will be called upon completion.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.showDialogForError = function (errorCode, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'showDialogForError', [errorCode])
};

MobileMessagingCordova.prototype.defaultMessageStorage = function () {
    var config = this.configuration;
    if (!config.defaultMessageStorage) {
        return undefined;
    }

    var defaultMessageStorage = {
        find: function (messageId, callback) {
            cordova.exec(callback, function () {}, 'MobileMessagingCordova', 'defaultMessageStorage_find', [messageId]);
        },

        findAll: function (callback) {
            cordova.exec(callback, function () {}, 'MobileMessagingCordova', 'defaultMessageStorage_findAll', []);
        },

        delete: function (messageId, callback) {
            cordova.exec(callback, function () {}, 'MobileMessagingCordova', 'defaultMessageStorage_delete', [messageId]);
        },

        deleteAll: function (callback) {
            cordova.exec(callback, function () {}, 'MobileMessagingCordova', 'defaultMessageStorage_deleteAll', []);
        }
    };
    return defaultMessageStorage;
};

function messageStorage_find(messageId) {
    var messageStorage = this.configuration.messageStorage;
    messageStorage.find(messageId, function (message) {
        cordova.exec(function () {
        }, function () {
        }, 'MobileMessagingCordova', 'messageStorage_findResult', [message]);
    });
}

function messageStorage_findAll() {
    var messageStorage = this.configuration.messageStorage;
    messageStorage.findAll(function (messages) {
        cordova.exec(function () {
        }, function () {
        }, 'MobileMessagingCordova', 'messageStorage_findAllResult', messages);
    });
}

/**
 * Sends an event to the server eventually, handles possible errors and do retries for you.
 *
 * @name submitEvent
 * @param {Object} eventData. An object containing event data
 * {
 *   definitionId: <String; event definition identifier, e.g. "eventDefinitionId">,
 *   properties: <Object; map of event properties. Each property can be one of the following types: String, Number, Date (in ISO8601 UTC format), Boolean, or List (array of objects with key-value pairs where values can be String, Number, Date, or Boolean). You can provide any combination of these types based on your needs> {
 *     "someStringAttribute": "value",
 *     "someNumberAttribute": 123,
 *     "someDateAttribute": "2020-02-26T09:41:57Z",
 *     "someBooleanAttribute": true,
 *     "someListAttribute": [{"key1": "stringValue", "key2": 456}, {"key1": "anotherString", "key2": true}] // List is an array of objects where each object contains key-value pairs. Values can be String, Number, Date (in ISO8601 UTC format), or Boolean
 *   }
 * }
 */
MobileMessagingCordova.prototype.submitEvent = function (eventData) {
    cordova.exec(function () {
    }, function () {
    }, 'MobileMessagingCordova', 'submitEvent', [eventData]);
};

/**
 * Sends an event to the server immediately.
 * You have to handle possible connection or server errors, do retries yourself.
 *
 * @name submitEventImmediately
 * @param {Object} eventData. An object containing event data
 * {
 *   definitionId: <String; event definition identifier, e.g. "eventDefinitionId">,
 *   properties: <Object; map of event properties. Each property can be one of the following types: String, Number, Date (in ISO8601 UTC format), Boolean, or List (array of objects with key-value pairs where values can be String, Number, Date, or Boolean). You can provide any combination of these types based on your needs> {
 *     "someStringAttribute": "value",
 *     "someNumberAttribute": 123,
 *     "someDateAttribute": "2020-02-26T09:41:57Z",
 *     "someBooleanAttribute": true,
 *     "someListAttribute": [{"key1": "stringValue", "key2": 456}, {"key1": "anotherString", "key2": true}] // List is an array of objects where each object contains key-value pairs. Values can be String, Number, Date (in ISO8601 UTC format), or Boolean
 *   }
 * }
 * @param {Function} successCallback. Will be called upon completion.
 * @param {Function} errorCallback. Will be called on error, you have to handle error and do retries yourself.
 */
MobileMessagingCordova.prototype.submitEventImmediately = function (eventData, successCallback, errorCallback) {
    cordova.exec(successCallback, errorCallback, 'MobileMessagingCordova', 'submitEventImmediately', [eventData]);
};

/**
 * Shows In-app chat screen.
 * iOS - it's screen with top bar and `x` button on the right corner.
 * Android - it's screen with top bar and back navigation button.
 * @name showChat
 * @param {Object} presentingOptions. You can configure how chat will be presented.
 * Now only one option for iOS is supported: `shouldBePresentedModally`, false by default.
 * If it's true - in-app chat View Controller for iOS will be presented modally.
 * example:
 * {
 *     ios: {
 *         shouldBePresentedModally: true
 *     }
 * }
 */
MobileMessagingCordova.prototype.showChat = function (presentingOptions) {
    if (presentingOptions !== null && !isEmpty(presentingOptions)) {
        cordova.exec(function () {
        }, function () {
        }, 'MobileMessagingCordova', 'showChat', [presentingOptions]);
    } else {
        cordova.exec(function () {
        }, function () {
        }, 'MobileMessagingCordova', 'showChat', []);
    }
};

/**
 * You can define custom appearance for iOS chat view by providing a chat settings.
 * @name setupiOSChatSettings
 * @param {Object} chatSettings. An object with chat settings
 * Chat settings format:
 *  {
 *      title: '<chat title>',
 *      sendButtonColor: '<hex color string>',
 *      navigationBarItemsColor:'<hex color string>',
 *      navigationBarColor:'<hex color string>',
 *      navigationBarTitleColor:'<hex color string>'
 *  }
 */
MobileMessagingCordova.prototype.setupiOSChatSettings = function (chatSettings) {
    cordova.exec(function () {
    }, function () {
    }, 'MobileMessagingCordova', 'setupiOSChatSettings', [chatSettings]);
};

/**
 * @name resetMessageCounter
 * MobileMessaging plugin automatically resets the counter to 0 whenever user opens the chat screen.
 * However, use the following API in case you need to manually reset the counter.
 */
MobileMessagingCordova.prototype.resetMessageCounter = function () {
    cordova.exec(function () {
    }, function () {
    }, 'MobileMessagingCordova', 'resetMessageCounter', []);
};

/**
 * @name getMessageCounter
 * The counter increments each time the application receives in-app chat push message
 * (this usually happens when chat screen is inactive or the application is in background/terminated state).
 * In order to get current counter value use following API
 * @param {Function} resultCallback will be called upon completion with integer counter value.
 */
MobileMessagingCordova.prototype.getMessageCounter = function (resultCallback) {
    cordova.exec(resultCallback, function () {
    }, 'MobileMessagingCordova', 'getMessageCounter', []);
};

/**
 * Sets chat language.
 *
 * @name setLanguage
 * @param {String} language to be set
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.setLanguage = function (language, errorCallback) {
    cordova.exec(function () {
    }, errorCallback, 'MobileMessagingCordova', 'setLanguage', [language])
};

/**
 * Set contextual data of the widget
 *
 * @param {String} data - contextual data in the form of JSON string
 * @param {Boolean} allMultiThreadStrategy multi-thread strategy flag, true -> ALL, false -> ACTIVE
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.sendContextualData = function (data, allMultiThreadStrategy, errorCallback) {
    cordova.exec(function () {
    }, errorCallback, 'MobileMessagingCordova', 'sendContextualData', [data, allMultiThreadStrategy])
};

/**
 * Registers for Android POST_NOTIFICATIONS permission
 * @name registerForAndroidRemoteNotifications
 */
MobileMessagingCordova.prototype.registerForAndroidRemoteNotifications = function () {
    cordova.exec(function () {
    }, function () {
    }, 'MobileMessagingCordova', 'registerForAndroidRemoteNotifications', []);
}

/**
 * Updates JWT used for user data fetching and personalization.
 * @name setJwt
 * @param {String} jwt. JWT token in a predefined format.
 * @param {Function} errorCallback. Will be called on error.
 */
MobileMessagingCordova.prototype.setUserDataJwt = function (jwt, errorCallback) {
    cordova.exec(function () {}, errorCallback, 'MobileMessagingCordova', 'setUserDataJwt', [jwt]);
}

/**
 * Sets chat customization.
 *
 * @name setChatCustomization
 * @param {Object} customization - Chat customization JSON object.
 * @param {Function} successCallback - Success callback.
 * @param {Function} errorCallback - Error callback.
 */
MobileMessagingCordova.prototype.setChatCustomization = function(customization, successCallback, errorCallback) {
    cordova.exec(successCallback, errorCallback, 'MobileMessagingCordova', 'setChatCustomization', [customization]);
};

/**
* Sets widget theme.
*
* @name setWidgetTheme
* @param {String} widgetTheme - Widget theme name.
* @param {Function} errorCallback - Error callback.
*/
MobileMessagingCordova.prototype.setWidgetTheme = function(widgetTheme, errorCallback) {
    cordova.exec(function () {}, errorCallback, 'MobileMessagingCordova', 'setWidgetTheme', [widgetTheme]);
};

MobileMessaging = new MobileMessagingCordova();
module.exports = MobileMessaging;
