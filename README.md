# Mobile Messaging SDK plugin for Cordova

[![GitHub release](https://img.shields.io/github/release/infobip/mobile-messaging-cordova-plugin.svg)](https://github.com/infobip/mobile-messaging-cordova-plugin/releases)

Mobile Messaging SDK is designed and developed to easily enable push notification channel in your mobile application. In almost no time of implementation you get push notification in your application and access to the features of [Infobip IP Messaging Platform](https://portal.infobip.com/push/). 
The document describes library integration steps for your Cordova project.

## Features
- [Receiving push messages](#messagereceived-event)
- [Marking messages as seen](#mark-messages-as-seen)
- [Setting user data for targeting](#synchronizing-user-data)
- [Geofencing](#geofencing)
- [Message storage](#message-storage)
- [Privacy settings](#privacy-settings)
- [Delivery improvements and rich content notifications](#delivery-improvements-and-rich-content-notifications)

## Requirements
- Cordova 7.0+ (`sudo npm install -g cordova`)
- npm (tested with 4.1.2)
- node (tested with 7.5.0)

For iOS project:
- Xcode 9.0+
- Carthage (`brew install carthage`)
- Minimum deployment target 8.0+

For Android project: 
- Android Studio
- API Level: 14 (Android 4.0 - Ice Cream Sandwich)

## Quick start guide
This guide is designed to get you up and running with Mobile Messaging SDK plugin for Cordova:

1. Prepare your push credentials for Android and iOS:
    1. Get Sender ID and Server API Key for Android ([Cloud Messaging credentials](https://github.com/infobip/mobile-messaging-sdk-android/wiki/Firebase-Cloud-Messaging)).
    2. Prepare your App ID, provisioning profiles and APNs certificate ([APNs Certificate Guide](https://github.com/infobip/mobile-messaging-sdk-ios/wiki/APNs-Certificate-guide)).

2. Prepare your Infobip account (https://portal.infobip.com/push/) to get your Application Code:
    1. [Create new application](https://dev.infobip.com/v1/docs/push-introduction-create-app) on Infobip Push portal.
    2. Navigate to your Application where you will get the Application Code.
    3. Mark the "Available on Android" checkbox and insert previously obtained GCM Server Key (Server API Key):
    <center><img src="https://github.com/infobip/mobile-messaging-sdk-android/wiki/images/GCMAppSetup.png" alt="CUP Settings"/></center>

    4. Mark the "Available on iOS" checkbox. Click on "UPLOAD" under "APNS Certificates" and locate the .p12 file you exported from your Keychain earlier (Mark the "Sandbox" checkbox if you are using sandbox environment for the application):
    <center><img src="https://github.com/infobip/mobile-messaging-sdk-ios/wiki/Images/CUPCertificate.png?raw=true" alt="CUP Settings"/></center>

3. Add MobileMessaging plugin to your project, run in terminal:
    ```bash
    $ cordova plugin add https://github.com/infobip/mobile-messaging-cordova-plugin.git#0.4.0 --nofetch --save
    ```

4. Configure your iOS project:
    1. To enable Push Notifications, go to "Capabilities" tab (target settings) and turn on "Push Notifications" section.
    2. On your application targets’ “Build Phases” settings tab, click the “+” icon and choose “New Run Script Phase”. Create a Run Script in which you specify your shell (ex: `/bin/sh`), add the following contents to the script area below the shell:
        ```bash
        /usr/local/bin/carthage copy-frameworks
        ```
        Please note, that [Carthage](https://github.com/Carthage/Carthage) must be installed on your machine.
    3. Add the path to the framework under “Input Files”:
        ```
        $(SRCROOT)/MyApp/Plugins/com-infobip-plugins-mobilemessaging/MobileMessaging.framework
        ```
    4. Add the path to the copied framework to the “Output Files”:
        ```
        $(BUILT_PRODUCTS_DIR)/$(FRAMEWORKS_FOLDER_PATH)/MobileMessaging.framework
        ```

5. Add code to your project to initialize the library after `deviceready` event with configuration options and library event listener:

    ```javascript
    onDeviceReady: function() {
        ...
        MobileMessaging.init({
                applicationCode: '<your_application_code>',
                geofencingEnabled: '<true/false>',
                android: {
                    senderId: '<sender id>'
                },
                ios: {
                    notificationTypes: ['alert', 'badge', 'sound']
                }
            },
            function(error) {
                console.log('Init error: ' + error);
            }
        );

        MobileMessaging.register('messageReceived', 
            function(message) {
                console.log('Message Received: ' + message.body);
            }
        );

        ...
    }
    ```

## Initialization configuration
```javascript
configuration: {
    applicationCode: '<Infobip Application Code from the Customer Portal obtained in step 2>',
    geofencingEnabled: '<set to 'true' to enable geofencing inside the library, optional>',
    messageStorage: '<message storage implementation>',
    defaultMessageStorage: '<set to 'true' to enable default message storage implementation>',
    android: {
        senderId: '<Cloud Messaging Sender ID obtained in step 1>'
    },
    ios: {
        notificationTypes: '<notification types to indicate how the app should alert user when push message arrives>',
        notificationExtensionAppGroupId: '<app group id to sync data between main app and notification service extension>' 
    }
}
```

## Events
```javascript
MobileMessaging.register('<event name>',
     function(eventData) {
         console.log('Event: ' + eventData);
     }
);
```

| Event name | Event data | Description |
| --- | --- | --- |
| `messageReceived` | message object | Occurs when new message arrives, see separate section for all available message fields |
| `notificationTapped` | message object |Occurs when notification is tapped. |
| `tokenReceived` | Cloud token | Occurs when an APNs device token is received. Contains device token - a hex-encoded string received from APNS. Returns device token as hex-encoded string.|
| `registrationUpdated` | Infobip internal ID | Occurs when the registration is updated on backend server. Returns internallId - string for the registered user.|
| `geofenceEntered` | geo object |Occurs when device enters a geofence area. |

### `messageReceived` event
```javascript
MobileMessaging.register('messageReceived', 
    function(message) {
        console.log('Message Received: ' + message.body);
    }
);
```

### `notificationTapped` event
```javascript
MobileMessaging.register('notificationTapped',
     function(message) {
         console.log('Notification tapped: ' + message.body);
     }
);
```

Supported message fields are described below:
```javascript
message: {
    messageId: '<unique message id>',
    title: '<title, optional>',
    body: '<message text>',
    sound: '<notification sound, optional>',
    vibrate: '<true/false, notification vibration setting (Android only)>',
    icon: '<notification icon, optional (Android only)>',
    silent: '<true/false, disables notification for message>',
    category: '<notification category (Android only)>',
    receivedTimestamp: '<absolute timestamp in milliseconds that indicates when the message was received>',
    customPayload: '<any custom data provided with message>',
    originalPayload: '<original payload of message (iOS only)>',
    contentUrl: '<media content url if media provided>',
	seen: '<true/false, was message seen or not>',
	seenDate: '<absolute timestamp in milliseconds that indicates when the message was seen>',
	geo: '<true/false, indicates was message triggered by geo event or not>'
}
```

### `tokenReceived` event
```javascript
MobileMessaging.register('tokenReceived',
     function(token) {
         console.log('Token: ' + token);
     }
);
```

### `registrationUpdated` event
```javascript
MobileMessaging.register('registrationUpdated',
     function(internalId) {
         console.log('Internal ID: ' + internalId);
     }
);
```

### `geofenceEntered` event
```javascript
MobileMessaging.register('geofenceEntered',
     function(geo) {
         console.log('Geo area entered: ' + geo.area.title);
     }
);
```

Supported geo fields are described below:
```javascript
geo: {
    area: {
        id: '<area id>',
        center: {
            lat: '<area latitude>',
            lon: '<area longitude>'
        },
        radius: '<area radius>',
        title: '<area title>'
    }
}
```

## Synchronizing user data
It is possible to sync user data to the server as well as fetch latest user data from the server.

### Sync user data
Set of predefined data fields is currently supported as well as custom fields containing string, number or date. Root level of user data contains all predefined fields as listed below. `customData` object shall contain all custom fields.
```javascript
MobileMessaging.syncUserData({
        externalUserId:'johnsmith',
        firstName:'John',
        lastName:'Smith',
        middleName:'Matthew',
        msisdn:'385989000000',
        gender:'M',
        birthdate:'1985-12-31',
        email:'john.smith@infobip.com',
        telephone:'385989111111',
        customData: {
            customString: 'CustomString',
            customDate: new Date(),
            customNumber: 3
        }
    },
    function(data) {
        alert('User data synchronized:' + JSON.stringify(data));
    },
    function(error) {
        alert('Error while syncing user data: ' + error);
    }
);
```

### Fetch user data
```javascript
MobileMessaging.fetchUserData(
    function(data) {
        alert('User data fetched:' + JSON.stringify(data));
    },
    function(error) {
        alert('Error while syncing user data: ' + error);
    }
);
```

## Mark messages as seen
Mobile Messaging SDK has an API to mark messages as seen by user. This is usually done when user opens a particular message. Message can be obtained either via `messageReceived` event or together with geo area with `geofenceEntered` event (via geo.message).
```javascript
var message = ...;

MobileMessaging.markMessagesSeen([message.messageId], function(messageIds){
    console.log("message ids marked as seen: " + messageIds);
}, function(error){
    console.log(error);
});
```
Note that corresponding SDK function accepts array of message IDs as input parameter. You can also set success and error callbacks. Success callback will provide array of message IDs that were marked as seen. Error callback will notify about an error and provide description of error if any. 

## Geofencing
It is possible to enable geofencing engine inside Mobile Messaging. In this case `geofencingEnabled` shall be set to true in [initialization configuration](#initialization-configuration). Appropriate permissions should be also requested or configured for your application prior to initialization of library. Initialization will fail if there are no appropriate permissions.

### Android
Make sure that location permission is added to android configuration in "config.xml":
```xml
<widget ... xmlns:android="http://schemas.android.com/apk/res/android">
    ...
    <platform name="android">
        <config-file target="AndroidManifest.xml" parent="/*">
            <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
        </config-file>
    </platform>
    ...
</widget>
```

After that Mobile Messaging plugin can be initialized with geofencing enabled. Be aware that the plugin might request runtime permissions by itself on Android 6.0 and above right before initialization.

### iOS
Make sure to include NSLocationWhenInUseUsageDescription and NSLocationAlwaysUsageDescription keys in your app’s Info.plist. These keys let you describe the reason your app accesses the user’s location information. Mobile Messaging library will request location permission by itself. iOS will use the values of these keys in the alert panel displayed to the user when requesting permission to use location services.

## Message storage
Mobile Messaging SDK for Cordova supports a message storage feature. If the storage is enabled in configuration, then the plugin will save all push messages to the configured message storage. Plugin will handle and save messages that are received both during background and during foreground operation of the app. Two types of message storage configuration are supported: default storage and an external one.

### Default message storage
Mobile Messaging SDK supports a built-in message storage. `defaultMessageStorage` option shall be set to true in [initialization configuration](#initialization-configuration) to enable it. If default message storage is enabled, then it will be possible to access all the messages received by the library using methods described below.

```javascript
MobileMessaging.init({
        applicationCode: '<your_application_code>',
        defaultMessageStorage: true,
        android: {
            senderId: '<sender id>'
        },
        ios: {
            notificationTypes: ['alert', 'badge', 'sound']
        }
    },
    function(error) {
        console.log('Init error: ' + error);
    }
);
...

/**
 * Retireves all messages from message storage
 */
MobileMessaging.defaultMessageStorage().findAll(function(messages){
    console.log('Currently have ' + messages.length + ' messages in default storage');
});

//**
 * Retireves message from the storage using provided message id
 */
MobileMessaging.defaultMessageStorage().find('existing-message-id', function(message) {
    console.log('Found message by id: ' + JSON.stringify(message));
});

/**
 * Deletes all messages
 */
MobileMessaging.defaultMessageStorage().deleteAll(function() {
    console.log('Deleted all messages')
});

/**
 * Deletes a messaging with the provided message id
 */
MobileMessaging.defaultMessageStorage().delete('existing-message-id', function() {
    console.log('Deleted all messages')
});

```
 > ### Notice
 > Default message storage is a simple wrapper implementation over Core Data on iOS and SQLite on Android and is currently not designed to support large numbers of received messages. Note that performance of default message storage may decrease with the increasing number of messages stored inside. It is recommended to use [external message storage](#external-message-storage) to have full control over received messages.

### External message storage
Mobile Messaging SDK for Cordova can be initialized with a custom external implementation of message storage. In this case the plugin will use the supplied message storage to save all the received messages. This option is recommended because in this case developer has full control over how and where messages are stored and which procedures apply. External message storage has to comply with the interface below in order to be used with Mobile Messaging SDK for Cordova.

```javascript
var myStorageImplementation = {

    /**
     * Will be called by the plugin when messages are received and it's time to save them to the storage
     *
     * @param {Array} array of message objects to save to storage
     */
    save: function(messages) {
    
    },

    /**
     * Will be called by the plugin to find a message by message id
     *
     * @param {Function} callback has to be called on completion with one parameter - found message object
     */
    find: function(messageId, callback) {
    
    },

    /**
     * Will be called by the plugin to find all messages in the storage
     *
     * @param {Function} callback has to be called on completion with one parameter - an array of available messages
     */
    findAll: function(callback) {
    
    },

    /**
     * Will be called by the plugin when its time to initialize the storage
     */
    start: function() {
    
    },

    /**
     * Will be called by the plugin when its time to deinitialize the storage
     */
    stop: function() {
    
    }
}

```
Then an external message storage has to be supplied with [initialization configuration](#initialization-configuration) so that SDK will be able to use it to store received messages.

```javascript
MobileMessaging.init({
        applicationCode: '<your_application_code>',
        messageStorage: myStorageImplementation,
        android: {
            senderId: '<sender id>'
        },
        ios: {
            notificationTypes: ['alert', 'badge', 'sound']
        }
    },
    function(error) {
        console.log('Init error: ' + error);
    }
);
```

### External message storage implementation with local storage
This section covers an example implementation of external message storage with the key-value local storage of the underlying web view provided by cordova.

```javascript
var localStorage = {

    save: function(messages) {
        console.log('Saving messages: ' + JSON.stringify(messages));
        for (var i = 0; i < messages.length; i++) {
            window.localStorage.setItem(messages[i].messageId, JSON.stringify(messages[i]));
        }
    },

    find: function(messageId, callback) {
        console.log('Find message: ' + messageId);
        var message = window.localStorage.getItem(messageId);
        if (message) {
            console.log('Found message: ' + message);
            callback(JSON.parse(message));
        } else {
            callback({});
        }
    },

    findAll: function(callback) {
        console.log('Find all');
        this.findAllByKeys(0, [], function(messages) {
            console.log('Found ' + messages.length + ' messages');
            callback(messages);
        });
    },

    start: function() {
        console.log('Start');
    },

    stop: function() {
        console.log('Stop');
    },

    findAllByKeys: function(ind, foundMessages, callback) {
        if (ind >= window.localStorage.length) {
            callback(foundMessages);
            return;
        }
        this.find(window.localStorage.key(ind), function(message) {
            if (message) {
                foundMessages.push(message);
            }
            storage.findAllByKeys(ind + 1, foundMessages, callback);
        })
    }
}
```

And Mobile Messaging can be initialized to use this storage as below:

```javascript
MobileMessaging.init({
        applicationCode: '<your_application_code>',
        messageStorage: localStorage,
        android: {
            senderId: '<sender id>'
        },
        ios: {
            notificationTypes: ['alert', 'badge', 'sound']
        }
    },
    function(error) {
        console.log('Init error: ' + error);
    }
);
```

## Privacy settings
Mobile Messaging SDK has several options to provide different levels of users privacy for your application. The settings are represented by `PrivacySettings` object and may be set up as follows:
```javascript
MobileMessaging.init({
        applicationCode: ...,
        android: ...,
        ios: ...,
        privacySettings: {
            carrierInfoSendingDisabled: true,
            systemInfoSendingDisabled: true,
            userDataPersistingDisabled: true
        }
    },
    function(error) {
        console.log('Init error: ' + error);
    }
);
...
```

- `carrierInfoSendingDisabled`: A boolean variable that indicates whether the MobileMessaging SDK will be sending the carrier information to the server. Default value is `false`.
- `systemInfoSendingDisabled`: A boolean variable that indicates whether the MobileMessaging SDK will be sending the system information such as OS version, device model, application version to the server. Default value is `false`.
- `userDataPersistingDisabled`: A boolean variable that indicates whether the MobileMessaging SDK will be persisting the [User Data](https://github.com/infobip/mobile-messaging-cordova-plugin#synchronizing-user-data) locally. Persisting user data locally gives you quick access to the data and eliminates a need to implement the persistent storage yourself. Default value is `false`.

## Delivery improvements and rich content notifications

Mobile Messaging SDK provides support for rich content inside push notifications on iOS and Android. Only static images are supported on Android, while iOS supports static images and GIF animations.

SDK supports rich content on Android out of the box. iOS platform **must be** additionally configured for it.

### Enabling notification extension in iOS for rich content and reliable delivery

Additional Notification Service Extension **must be** be configured for iOS platform as described [here](https://github.com/infobip/mobile-messaging-sdk-ios/wiki/Using-Notification-Service-Extension-for-Rich-Notifications-and-better-delivery-reporting-on-iOS-10). Note that you don't need to configure your main application to pass App Group ID to SDK. Instead you will have to provide `notificationExtensionAppGroupId` as part of your application configuration. Refer to [configuration section](#initialization-configuration) for details.

> ### Notice
> We highly encourage to configure Notification Service Extension for iOS. Apart from providing support for rich content it also dramatically improves delivery reporting for Push Notification on iOS. Upon implementing Notification Service Extension, SDK will be able to report delivery even when the application is killed.

### Sending content

In order to receive media content through Push messages, you need to create a new campaign on Customer portal or [send a message](https://dev.infobip.com/docs/send-push-notifications) through Push HTTP API
with `contentUrl` parameter.

<center><img src="https://github.com/infobip/mobile-messaging-sdk-ios/wiki/Images/RichNotifCUP.png?raw=true" alt="Rich notification - CUP"/></center>

### Receiving on Android

Provided image will be displayed in the notification drawer where default rich notification’s design correlates with OS version. As of API 16 - Jelly Bean, image downloaded from provided URL will be displayed not only in normal view, but also in expanded, big view. 

<table class="image">
<tr>
<td><img src="https://github.com/infobip/mobile-messaging-sdk-android/wiki/images/RichNotifAndroid7_1.gif?raw=true" alt="Rich notification - Android 7.1"/></td>
<td><img src="https://github.com/infobip/mobile-messaging-sdk-android/wiki/images/RichNotifAndroid4_4.gif?raw=true" alt="Rich notification - Android 4.4"/></td>
</tr>
<caption align="bottom"><b>Preview of rich notifications on Android 7.1 and Android 4.4</b></caption>
</table>

### Receiving on iOS

Provided content will be displayed on devices with iOS 10.+ in the notification center.

<center><img src="https://github.com/infobip/mobile-messaging-sdk-ios/wiki/Images/RichNotifIos10.gif?raw=true" alt="Rich notification - iOS10"/></center>

### FAQ

#### How to open application webView on message tap
- Install "cordova-plugin-inappbrowser" plugin
- Register event handler for notification tapping in MobileMessaging
```javascript
MobileMessaging.register("notificationTapped", function(message) {
  if (message.customPayload && message.customPayload.url) {
    var url = message.customPayload.url;
    cordova.InAppBrowser.open(url, "_blank", "location=yes");
  }
});
```
- Now you can send push message with custom payload and "url" field through api or portal
```json
"customPayload":{
   "url": "http://infobip.com/"
}
```
