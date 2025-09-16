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
 *      applicationCode: '<The application code of your Application from Push Portal website>',
 *      inAppChatEnabled: true,
 *      fullFeaturedInAppsEnabled: true,
 *      messageStorage: '<Message storage save callback>',
 *      defaultMessageStorage: true,
 *      userDataJwt: '<JWT token for authorization of user data related operations>',
 *      trustedDomains: ['example.com', 'trusted.org'],
 *      loggingEnabled: false,
 *      ios: {
 *          notificationTypes: ['alert', 'sound', 'badge'],
 *          forceCleanup: <Boolean>,
 *          registeringForRemoteNotificationsDisabled: <Boolean>,
 *          overridingNotificationCenterDelegateDisabled: <Boolean>,
 *          unregisteringForRemoteNotificationsDisabled: <Boolean>
 *      },
 *      android: {
 *          withBannerForegroundNotificationsEnabled: <Boolean>
 *      },
 *      privacySettings: {
 *          applicationCodePersistingDisabled: <Boolean>,
 *          userDataPersistingDisabled: <Boolean>,
 *          carrierInfoSendingDisabled: <Boolean>,
 *          systemInfoSendingDisabled: <Boolean>
 *      },
 *      notificationCategories: [
 *          {
 *              identifier: <String>,
 *              actions: [
 *                  {
 *                      identifier: <String>,
 *                      title: <String>,
 *                      foreground: <Boolean>,
 *                      authenticationRequired: <Boolean>,
 *                      moRequired: <Boolean>,
 *                      destructive: <Boolean>,
 *                      icon: <String>,
 *                      textInputActionButtonTitle: <String>,
 *                      textInputPlaceholder: <String>
 *                  }
 *              ]
 *          }
 *      ]
 *  }
 *  @param {Function} callback. Called after successful start of Mobile Messaging SDK initialization. Notice: no Mobile Messaging SDK
 *  methods can be called in this callback as it is not yet initialized. To know when Mobile Messaging SDK is fully initialized, subscribe
 *  to "registrationUpdated" event.
 * @param {Function} onInitError. Error callback
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
 *   - tokenReceived (iOS only)
 *   - actionTapped
 *
 * @name register
 * @param {String} eventName
 * @param {Function} handler will be called when event occurs
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
 * @param {Function} handler will be unregistered from event
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
MobileMessagingCordova.prototype.saveUser = function (userData, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'saveUser', [userData])
};

/**
 * Fetch user data from the server.
 *
 * @name fetchUser
 * @param {Function} callback will be called with fetched user data on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.fetchUser = function (callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchUser', [])
};

/**
 * Gets user data from the locally stored cache.
 *
 * @name getUser
 * @param {Function} callback will be called with fetched user data on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.getUser = function (callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'getUser', [])
};

/**
 * Fetch mobile inbox data from the server.
 *
 * @name fetchInboxMessages
 * @param token access token (JWT in a strictly predefined format) required for current user to have access to the Inbox messages
 * @param externalUserId External User ID is meant to be an ID of a user in an external (non-Infobip) service
 * @param filterOptions filtering options applied to messages list in response. Nullable, will return default number of messages
 * @param callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.fetchInboxMessages = function (token, externalUserId, filterOptions, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchInboxMessages', [token, externalUserId, filterOptions])
};

/**
 * Fetch mobile inbox without token from the server.
 *
 * @name fetchInboxMessagesWithoutToken
 * @param externalUserId External User ID is meant to be an ID of a user in an external (non-Infobip) service
 * @param filterOptions filtering options applied to messages list in response. Nullable, will return default number of messages
 * @param callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.fetchInboxMessagesWithoutToken = function (externalUserId, filterOptions, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchInboxMessagesWithoutToken', [externalUserId, filterOptions])
};

/**
 * Asynchronously marks inbox messages as seen
 *
 * @param externalUserId External User ID is meant to be an ID of a user in an external (non-Infobip) service
 * @param messageIds array of inbox messages identifiers that need to be marked as seen
 * @param callback will be called on success
 * @param {Function} errorCallback will be called on error
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
 *   isPrimaryDevice: true,
 *   isPushRegistrationEnabled: true,
 *   notificationsEnabled: true,
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
MobileMessagingCordova.prototype.saveInstallation = function (installation, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'saveInstallation', [installation])
};

/**
 * Fetches installation from the server.
 *
 * @name fetchInstallation
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.fetchInstallation = function (callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'fetchInstallation', [])
};

/**
 * Gets locally cached installation.
 *
 * @name getInstallation
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.getInstallation = function (callback, errorCallback) {
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
MobileMessagingCordova.prototype.setInstallationAsPrimary = function (pushRegistrationId, primary, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'setInstallationAsPrimary', [pushRegistrationId, primary])
};

/**
 * Performs personalization of the current installation on the platform.
 *
 * @name personalize
 * @param {Object} context. An object containing user identity information as well as additional user attributes.
 * {
 *   userIdentity: {
 *     phones: ["79210000000", "79110000000"],
 *     emails: ["one@email.com", "two@email.com"],
 *     externalUserId: "myID"
 *   },
 *   userAttributes: {
 *     firstName: "John",
 *     lastName: "Smith"
 *   },
 *   forceDepersonalize: false
 * }
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.personalize = function (context, callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'personalize', [context])
};

/**
 * Performs depersonalization of the current installation on the platform.
 *
 * @name depersonalize
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.depersonalize = function (callback, errorCallback) {
    cordova.exec(callback, errorCallback, 'MobileMessagingCordova', 'depersonalize', [])
};

/**
 * Performs depersonalization of the installation referenced by pushRegistrationId.
 *
 * @param {String} pushRegistrationId of the remote installation to depersonalize
 * @param {Function} callback will be called on success
 * @param {Function} errorCallback will be called on error
 */
MobileMessagingCordova.prototype.depersonalizeInstallation = function (pushRegistrationId, callback, errorCallback) {
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
MobileMessagingCordova.prototype.markMessagesSeen = function (messageIds, callback, errorCallback) {
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
 *   definitionId: "eventDefinitionId"
 *   properties: {
 *     "stringAttribute": "string",
 *     "numberAttribute": 1,
 *     "dateAttribute": "2020-02-26T09:41:57Z",
 *     "booleanAttribute": true
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
 *   definitionId: "eventDefinitionId"
 *   properties: {
 *     "stringAttribute": "string",
 *     "numberAttribute": 1,
 *     "dateAttribute": "2020-02-26T09:41:57Z",
 *     "booleanAttribute": true
 *   }
 * }
 * @param {Function} successCallback will be called upon completion
 * @param {Function} errorCallback will be called on error, you have to handle error and do retries yourself
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
 * @param {String} jwt - JWT token in a predefined format
 * @param {Function} errorCallback will be called on error
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
