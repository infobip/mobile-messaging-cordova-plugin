# Mobile Messaging SDK plugin for Cordova

[![npm](https://img.shields.io/npm/v/com-infobip-plugins-mobilemessaging.svg)](https://www.npmjs.com/package/com-infobip-plugins-mobilemessaging)

Mobile Messaging SDK is designed and developed to easily enable push notification channel in your mobile application. In almost no time of implementation you get push notification in your application and access to the features of [Infobip IP Messaging Platform](https://portal.infobip.com/push/). 
The document describes library integration steps for your Cordova project.

> ### Notice
> We highly encourage to configure [Notification Service Extension](#delivery-improvements-and-rich-content-notifications) for iOS. Apart from providing support for rich content it also dramatically improves delivery reporting for Push Notification on iOS. Upon implementing Notification Service Extension, SDK will be able to report delivery even when the application is killed.

  * [Requirements](#requirements)
  * [Quick start guide](#quick-start-guide)
  * [Initialization configuration](#initialization-configuration)
  * [Events](#events)
  * [Managing installation](#managing-installation)
    + [Installation data model](#installation-data-model)
    + [Getting installation](#getting-installation)
    + [Updating installation](#updating-installation)
  * [Managing user](#managing-user)
    + [User data model](#user-data-model)
    + [Getting user](#getting-user)
    + [Updating user](#updating-user)
    + [Personalize/Depersonalize](#personalizedepersonalize)
    + [Managing other installations](#managing-other-installations)
    + [Interacting with tags and custom attributes](#interacting-with-tags-and-custom-attributes)
  * [Mark messages as seen](#mark-messages-as-seen)
  * [Geofencing](#geofencing)
    + [Android](#android)
    + [iOS](#ios)
  * [Message storage](#message-storage)
    + [Default message storage](#default-message-storage)
    + [External message storage](#external-message-storage)
    + [External message storage implementation with local storage](#external-message-storage-implementation-with-local-storage)
  * [Privacy settings](#privacy-settings)
  * [Delivery improvements and rich content notifications](#delivery-improvements-and-rich-content-notifications)
    + [Enabling notification extension in iOS for rich content and reliable delivery](#enabling-notification-extension-in-ios-for-rich-content-and-reliable-delivery)
    + [Sending content](#sending-content)
    + [Receiving on Android](#receiving-on-android)
    + [Receiving on iOS](#receiving-on-ios)
  * [Interactive notifications](#interactive-notifications)
    + [Predefined categories](#predefined-categories)
    + [Custom categories](#custom-categories)
  * [In-app notifications](#in-app-notifications)
  * [Migration guide from 0.x.x](#migration-guide-from-0xx)
  * [FAQ](#faq)
    + [How to open application webView on message tap](#how-to-open-application-webview-on-message-tap)
    + [What if my android build fails after adding the SDK?](#what-if-my-android-build-fails-after-adding-the-sdk)
    + [How do I get Infobip's unique (push registration) ID?](#how-do-i-get-infobips-unique-push-registration-id)
    + [How to archive my app with command line?](#how-to-archive-my-app-with-command-line)
    + [How do I handle Google services - related errors on Android during initialization?](#how-do-i-handle-google-services---related-errors-on-android-during-initialization)

## Requirements
- Cordova 7.0+ (`sudo npm install -g cordova`)
- npm (tested with 4.1.2)
- node (tested with 7.5.0)

For iOS project:
- Xcode 10
- Carthage (`brew install carthage`)
- Minimum deployment target 9.0

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
    $ cordova plugin add com-infobip-plugins-mobilemessaging --save
    ```

4. Configure your iOS project, to enable Push Notifications: go to "Capabilities" tab (main target settings) and turn on "Push Notifications" section (we strongly recommend to re-enable it even though it is already enabled).

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
                console.log('Init error: ' + error.description);
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
MobileMessaging.init({
        applicationCode: <String; Infobip Application Code from the Customer Portal obtained in step 2>,
        android: {
            senderId: <String; Cloud Messaging Sender ID obtained in step 1>
        },
        ios: {
            notificationTypes: <Array; values: 'alert', 'badge', 'sound'; notification types to indicate how the app should alert user when push message arrives>
        },
        geofencingEnabled: <Boolean; set to 'true' to enable geofencing inside the library>, // optional
        messageStorage: <Object; message storage implementation>, // optional
        defaultMessageStorage: <Boolean; set to 'true' to enable default message storage implementation>, // optional
        notificationCategories: [ // optional
           {
               identifier: <String; a unique category string identifier>,
               actions: [
                   {
                       identifier: <String; a unique action identifier>,
                       title: <String; an action title, represents a notification action button label>,
                       foreground: <Boolean; to bring the app to foreground or leave it in background state (or not)>,
                       textInputPlaceholder: <String; custom input field placeholder>,
                       moRequired: <Boolean; to trigger MO message sending (or not)>,
                                               
                       // iOS only
                       authenticationRequired: <Boolean; to require device to be unlocked before performing (or not)>,
                       destructive: <Boolean; to be marked as destructive (or not)>,
                       textInputActionButtonTitle: <String; custom label for a sending button>,
                       
                       // Android only
                       icon:
                        <String; a resource name for a special action icon>
                   }
               ]   
           }
        ],
        privacySettings: { // optional
            carrierInfoSendingDisabled: <Boolean; defines if MM SDK should send carrier information to the server; false by default>,
            systemInfoSendingDisabled: <Boolean; defines if MM SDK should send system information to the server; false by default>,
            userDataPersistingDisabled: <Boolean; defines if MM SDK should persist User Data locally. Persisting user data locally gives you quick access to the data and eliminates a need to implement the persistent storage yourself; false by default>
        }
    },
    function(error) {
        console.log('Init error: ' + error.description);
    }
);
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
| `notificationTapped` | message object | Occurs when notification is tapped. |
| `tokenReceived` | Cloud token | Occurs when an APNs device token is received. Contains device token - a hex-encoded string received from APNS. Returns device token as hex-encoded string.|
| `registrationUpdated` | Infobip internal ID | Occurs when the registration is updated on backend server. Returns internalId - string for the registered user.|
| `geofenceEntered` | geo object | Occurs when device enters a geofence area. |
| `actionTapped` | message, actionId, text | Occurs when user taps on action inside notification or enters text as part of the notification response. |
| `installationUpdated` | installation | Occurs when save request to the server is successfully sent. |
| `userUpdated` | user | Occurs when save request to the server is successfully sent. |
| `personalized` | | Occurs when request for personalization is successfully sent to the server. |
| `depersonalized` | | Occurs when request for depersonalization is successfully sent to the server. |


Supported message fields are described below:
```
message: {
    messageId: <unique message id>,
    title: <title>,
    body: <message text>,
    sound: <notification sound>,
    vibrate: <true/false, notification vibration setting (Android only)>,
    icon: <notification icon, optional (Android only)>,
    silent: <true/false, disables notification for message>,
    category: <notification category (Android only)>,
    receivedTimestamp: <absolute timestamp in milliseconds that indicates when the message was received>,
    customPayload: <any custom data provided with message>,
    originalPayload: <original payload of message (iOS only)>,
    contentUrl: <media content url if media provided>,
    seen: <true/false, was message seen or not>,
    seenDate: <absolute timestamp in milliseconds that indicates when the message was seen>,
    geo: <true/false, indicates was message triggered by geo event or not>
}
```

Supported geo fields are described below:
```
geo: 
    area: {
        id: <area id>,
        center: 
            lat: <area latitude>,
            lon: <area longitude>
        },
        radius: <area radius>,
        title: <area title>
    }
}
```

## Managing installation

### Installation data model

```
{
    pushRegistrationId: <string | read-only. Unique Infobip identifier of the installation>
    isPrimaryDevice: <boolean | flag signalizing that the device is marked as primary on Infobip portal>,
    isPushRegistrationEnabled: <boolean | flag signalizing that device will receive notifications>,
    customAttributes: <object | Set of custom attributes assigned to user with values. Values can be one of type: string, number, boolean, date formatted string ('yyyy-MM-dd')>
}
```

Example of custom attributes: 

```javascript
{
    stringAttribute: "string",
    numberAttribute: 1,
    dateAttribute: "1985-01-15",
    booleanAttribute: true
}
```

### Getting installation

There are currently two methods for getting current installation: `MobileMessaging.prototype.fetchInstallation(callback, errorCallback)` and `MobileMessaging.prototype.getInstallation(callback, errorCallback)`. They both supply installation data model in the callback but the difference between them is that the `fetchInstallation` performs request to the server whereas `getInstallation` retrieves installation data model from local cache.

### Updating installation

The method `MobileMessaging.prototype.saveInstallation(callback, errorCallback)` is intended to save user attributes to the server. Note that the user model supplied as the first argument may contain only several fields set and in this case only those fields will be updated on server.

## Managing user

It is possible to save user data to the server, fetch latest user data from the server.

It is also possible to personalize/depersonalize current installation with already existing user (can be used in login/logout procedures of your application). Depersonalize procedure will wipe out current user data whereas personalize procedure will fetch the latest user data that this installation was personalized with.

### User data model

```
{
   externalUserId: <string | unique user identifier in external (non-Infobip) service>,
   firstName: <string>, 
   lastName: <string>,
   middleName: <string>,
   gender: <"Male"/"Female">,
   birthday: <date with format "yyyy-MM-dd" | Example: "1985-01-15">,
   phones: <string[] | User's mobile phones. Must be unique among all users. Example: ["79210000000", "79110000000"]>,
   emails: <string[] | User's emails. Must be unique among all users. Example: ["one@email.com", "two@email.com"]>,
   tags: <string[] | Tags assigned to user. Example: ["Sports", "Food"]>,
   customAttributes: <object | Set of custom attributes assigned to user with values. Values can be one of type: string, number, boolean, date formatted string ('yyyy-MM-dd')>,
   installations: <object[] | Array of installations personalized by the user. This array also includes current installation>
}
```

Example of custom attributes: 

```javascript
{
    stringAttribute: "string",
    numberAttribute: 1,
    dateAttribute: "1985-01-15",
    booleanAttribute: true
}
```

### Getting user

There are currently two methods for getting user: `MobileMessaging.prototype.fetchUser(callback, errorCallback)` and `MobileMessaging.prototype.getUser(callback, errorCallback)`. They both supply user data model in the callback but the difference between them is that the `fetchUser` performs request to the server whereas `getUser` retrieves user data model from local cache.

### Updating user

The method `MobileMessaging.prototype.saveUser(user, callback, errorCallback)` is intended to save user attributes to the server. Note that the user model supplied as the first argument may contain only several fields set and in this case only those fields will be updated on server.

> ### Notice
> You cannot change the array of installations in this method. Also if you want to add a new tag, don't forget to include all the existing tags in the `tags` array. Otherwise if you include only the tag you want to add, all the other tags will be removed. The same applies to `phones` and `emails` arrays.

### Personalize/Depersonalize

Methods `MobileMessaging.prototype.personalize(context, callback, errorCallback)` and `MobileMessaging.prototype.depersonalize(callback, errorCallback)` are intended to include this installation to the list of installations of the person or remove this installation from this list. This method is intended to be used on login/logout of the application respectively if the application provides such features.

The `context` argument of the `personalize` method has next data model:

```
{
    userIdentity: {
        externalUserId: <string>,
        phones: <string[]>,
        emails: <string[]>
    },
    userAttributes: <object | attributes of userModel except ones that contains in userIdentity>,
    forceDepersonalize: <boolean | false by default>
}
```

The fields of `userIdentity` will be used to identify the user, so it has to include at least one field for successful identification. `userAttributes` should contain fields of user model that should be modified in the identified user

The prerequisite for the invocation of this function is that the current user should not contain any phones, emails and externalUserId (it should be depersonalized), otherwise the result would be error. To overcome this restriction you can set `forceDepersonalize` flag to `true`.

### Managing other installations

It is possible to manage other installations belonging to the current user if there are any. There are two methods intended to be used for this.

`MobileMessaging.prototype.setInstallationAsPrimary(pushRegistrationId, callback, errorCallback)` is intended to set other installation as primary. Note that only one installation can be primary so this call is going to remove the previous `isPrimaryDevice` flag. You can obtain `pushRegistrationId` of the installation from the list of installations in user data model.

`MobileMessaging.prototype.depersonalizeInstallation(pushRegistrationId, callback, errorCallback)` is intended to depersonalize other installation that is currently personalized with current user (remote logout).

### Interacting with tags and custom attributes

Custom attributes and tags, that you assign to the user can be used for future targeting. After you set the first tag, you can filter by this tag on the [people page](https://portal.infobip.com/people) on portal, you can also see this tag appear on [tag management page](https://portal.infobip.com/people/tags). The same is applied to `customAttributes`. After the first attribute is set, you can view it on [configuration](https://portal.infobip.com/people/configuration) page.

For example after executing next snippet of code on client device

```javascript
MobileMessaging.saveUser({ tags: ["NewCustomer"] });
```

you can view this tag on [tag management page](https://portal.infobip.com/people/tags).

## Mark messages as seen

Mobile Messaging SDK has an API to mark messages as seen by user. This is usually done when user opens a particular message. Message can be obtained either via `messageReceived` event or together with geo area with `geofenceEntered` event (via geo.message).
```javascript
var message = ...;

MobileMessaging.markMessagesSeen([message.messageId], function(messageIds){
    console.log("message ids marked as seen: " + messageIds);
}, function(error){
    console.log(error.description);
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
        console.log('Init error: ' + error.description);
    }
);
...

/**
 * Retrieves all messages from message storage
 */
MobileMessaging.defaultMessageStorage().findAll(function(messages){
    console.log('Currently have ' + messages.length + ' messages in default storage');
});

//**
 * Retrieves message from the storage using provided message id
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
        console.log('Init error: ' + error.description);
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
        console.log('Init error: ' + error.description);
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
        console.log('Init error: ' + error.description);
    }
);
...
```

- `carrierInfoSendingDisabled`: A boolean variable that indicates whether the MobileMessaging SDK will be sending the carrier information to the server. Default value is `false`.
- `systemInfoSendingDisabled`: A boolean variable that indicates whether the MobileMessaging SDK will be sending the system information such as OS version, device model, application version to the server. Default value is `false`.
- `userDataPersistingDisabled`: A boolean variable that indicates whether the MobileMessaging SDK will be persisting the [User Data](https://github.com/infobip/mobile-messaging-cordova-plugin#managing-user) locally. Persisting user data locally gives you quick access to the data and eliminates a need to implement the persistent storage yourself. Default value is `false`.

## Delivery improvements and rich content notifications

Mobile Messaging SDK provides support for rich content inside push notifications on iOS and Android. Only static images are supported on Android, while iOS supports static images and GIF animations.

SDK supports rich content on Android out of the box. iOS platform **must be** additionally configured for it.

### Enabling notification extension in iOS for rich content and reliable delivery

Additional Notification Service Extension **must be** be configured for iOS platform (to display rich content and have reliable delivery). You need to add following parameters to your `config.xml` under the plugin section to activate the extension:
```xml
...
    <plugin name="com-infobip-plugins-mobilemessaging" spec="...">

        <variable name="IOS_EXTENSION_APP_CODE" value="{YOUR APPLICATION CODE FROM INFOBIP PORTAL}" />
        <variable name="IOS_EXTENSION_APP_GROUP" value="{APP GROUP ID FROM APPLE PORTAL}" />

    </plugin>
...
```
More details about the extension and iOS App Group can be found here [here](https://github.com/infobip/mobile-messaging-sdk-ios/wiki/Notification-Service-Extension-for-Rich-Notifications-and-better-delivery-reporting-on-iOS-10).

> ### Notice
> iOS notification extension is configured for your application automatically by the plugin hooks. Plugin needs to know main iOS target for the project and the path to the iOS project. Cordova application name and `platforms\ios\{applicationName}.xcodeproj` will be used by default. If you need to change these default settings, you can use `IOS_EXTENSION_PROJECT_MAIN_TARGET` and `IOS_EXTENSION_PROJECT_PATH` parameters respectively. You can set these parameters in `config.xml` under the plugin section or provide them via command line when building the project.

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

## Interactive notifications

Interactive notifications are push notifications that provide an option for end user to interact with application through button tap action. This interaction can be accomplished by using Mobile Messaging SDK predefined interactive notification categories or creating your own.

Tapping the action should trigger `actionTapped` event where you can act upon the received action identifier.

### Predefined categories

Mobile Messaging SDK provides only one predefined interaction category for now, but this list will be extended in future.
 
Displaying of Interactive Notifications with predefined categories can be tested without any additional implementation on application side through Push API.

> A = action

| Category.id | A.id | A.title | A.foreground | A.authenticationRequired | A.destructive | A.moRequired |
| --- | --- | --- | --- | --- | --- | --- |
| mm_accept_decline | mm_accept | Accept | true | true | false | true |
|  | mm_decline | Decline | false | true | true | true |

### Custom categories

Interactive notifications should be registered at the SDK initialization step by providing `notificationCategories` configuration:

```javascript
MobileMessaging.init({
    applicationCode: ...,
    android: ...,
    ios: ...,
    notificationCategories: [{ // a list of custom interactive notification categories that your application has to support
        identifier: <String; a unique category string identifier>,
        actions: [ // a list of actions that a custom interactive notification category may consist of
            {
                identifier: <String; a unique action identifier>,
                title: <String; an action title, represents a notification action button label>,
                foreground: <Boolean; to bring the app to foreground or leave it in background state (or not)>,
                textInputPlaceholder: <String; custom input field placeholder>,
                moRequired: <Boolean; to trigger MO message sending (or not)>,
                
                // iOS only
                authenticationRequired: <Boolean; to require device to be unlocked before performing (or not)>,
                destructive: <Boolean; to be marked as destructive (or not)>,
                textInputActionButtonTitle: <String; custom label for a sending button>,
                
                // Android only
                icon: <String; a resource name for a special action icon>
            }
            ...
        ]
    }]
    },
    function(error) {
        console.log('Init error: ' + error.description);
    }
);
...
```

## In-app notifications

In-app notifications are alerts shown in foreground when user opens the app. Only the last received message with in-app enabled flag is displayed. If the sent notification didn’t have any category, in-app alert will be shown with default actions (localized texts): 

| Action | Android action ID | iOS action ID | Foreground |
| --- | --- | --- | --- |
| `Cancel` | `mm_cancel` | `com.apple.UNNotificationDismissActionIdentifier` | false |
| `Open` | `mm_open` | `com.apple.UNNotificationDefaultActionIdentifier` | true |

For [interactive notifications](#interactive-notifications), actions defined for category will be displayed.


Tapping the action should trigger `actionTapped` event where you can act upon the received action identifier.

You can send in-app messages through our [Push HTTP API](https://dev.infobip.com/docs/send-push-notifications) with `showInApp` boolean parameter that needs to be set up to `true` under `notificationOptions`.

## Migration guide from 0.x.x

### Changed events

| Events removed from 0.x.x | Event to use instead in 1.x.x |
| --- | --- |
| `logoutCompleted` | `depersonalized` |
| `primaryChanged` | `installationUpdated` |

`depersonalized` event is the direct replacement for `logoutCompleted` event. No more changes are required except event renaming.

`installationUpdated` is more common event that is intended to replace `primaryChanged` event. Handler of the `installationUpdated` event will receive the whole installation as an argument. So this handler

```javascript
MobileMessaging.register('primaryChanged',
    function() {
        // primary changed on the server, request new value
    }
);
```

can be replaced with the following

```javascript
MobileMessaging.register('installationUpdated',
    function(installation) {
        // here installation.isPrimaryDevice is available for utilization
    }
);
```

### Installation management changes

Version 1.x.x introduced new installation data model that combines fields `installation.pushRegistrationId`, `installation.isPrimaryDevice`, `installation.isPushRegistrationEnabled`. These fields can be used instead of methods in 0.x.x to get/set primary status of device and `isPushRegistrationEnabled` flag to get `pushRegistrationId`.

| Methods used in 0.x.x | Field of installation in 1.x.x |
| --- | --- |
| `enablePushRegistration`, `disablePushRegistration`, `isPushRegistrationEnabled` | `installation.isPushRegistrationEnabled` |
| `setPrimary`, `isPrimary`, `syncPrimary` | `installation.isPrimaryDevice` |
| `getPushRegistrationId` | `installation.getPushRegistrationId` |

Instead of `enablePushRegistration`, `disablePushRegistration` and `isPushRegistrationEnabled` you can use `isPushRegistrationEnabled` flag of the installation data model. The same applies to `setPrimary`, `isPrimary` and `syncPrimary`, you can use `isPrimaryDevice` flag instead. Instead of `getPushRegistrationId` you can use `pushRegistrationId` of installation. It is available only as readonly. You cannot change this field on server.

### User management changes

In version 1.x.x user data model was changed in the next way:

| User data in 0.x.x | User data model in 1.x.x |
| --- | --- |
| `msisdn: string` For example `msisdn: '385989000000'` | `phones: string[]` For example `phones: ['79210000000', '79110000000']` |
| `email: string` For example `email: 'john.smith@infobip.com'` | `emails: string[]` For example `emails: ['one@email.com', 'two@email.com']` |
| `gender: 'M' or 'F'` | `gender: 'Male' or 'Female'` |
| `birthdate: Date` For example `birthdate: Date()` | `birthday: string` where string is in date format `yyyy-MM-dd`. For example `birthday: "1985-01-15"` |

Also some methods were removed but new ones introduced instead:

| Methods used in 0.x.x | Methods to use in 1.x.x |
| --- | --- |
| `syncUserData` | `saveUser`, `personalize` |
| `fetchUserData` | `fetchUser` |
| `logout` | `depersonalize` |

> ### Notice
> Functionality of `syncUserData` was split between `personalize` and `saveUser` to avoid potential problems with merged person and make the intent to attach to person explicit. To learn more, read about [updating user](#updating-user) and [personalizing/depersonalizing installation](#personalizedepersonalize)

## FAQ

### How to open application webView on message tap
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

### What if my android build fails after adding the SDK?
One of possible reasons for that is dependency conflict between plugins. SDK provides special properties which you can use to enfore specific versions of dependencies for the SDK:
- `ANDROID_SUPPORT_VER_OVERRIDE` - set to specific version e.g. "26.1.+" to use this version of android support libraries within SDK
- `ANDROID_GMS_VER_OVERRIDE` - set to specific version e.g. "10.+" to use this version of Google dependencies for push and geofencing

You can set these properties when adding the plugin:
```bash
$ cordova plugin add com-infobip-plugins-mobilemessaging --variable ANDROID_SUPPORT_VER_OVERRIDE="26.1.+" --variable ANDROID_GMS_VER_OVERRIDE="10.+"
```

Or you can set properties in `config.xml` of your application inside the plugin section of the SDK:
```xml
<plugin name="com-infobip-plugins-mobilemessaging" spec="https://github.com/infobip/mobile-messaging-cordova-plugin.git">
    <variable name="ANDROID_SUPPORT_VER_OVERRIDE" value="26.1.+" />
    <variable name="ANDROID_GMS_VER_OVERRIDE" value="10.+" />
</plugin>
```
> #### Notice
> Make sure to remove and add the plugin if you want to change any of these parameters.

### How do I get Infobip's unique (push registration) ID?
In order to get Infobip's unique push registration identifier issued by the server you need to implement the following code:

```javascript
MobileMessaging.fetchInstallation(
    function(installation) {
        // Here you can get pushRegistrationId with installation.pushRegistrationId
    });
```

This identifier:
- matches one to one with FCM/APNs cloud token of the particular application installation
- is only available after `registrationUpdated` event
- does not change for the whole lifetime of the application installation

### How to archive my app with command line?
Run following command line to build your app with xcode:
```
xcodebuild build `
    ` -project "platforms/ios/MyApp.xcodeproj"`
    ` -scheme "MyApp"`
    ` -archivePath "platforms/ios/MyApp.xcarchive"`
    ` -destination "generic/platform=iOS"`
    ` -target="MyApp"`
    ` ENABLE_BITCODE=NO`
    ` PRODUCT_BUNDLE_IDENTIFIER="YOUR_APP_ID"`
    ` PRODUCT_NAME="MyApp"`
    ` DEVELOPMENT_TEAM="YOUR_TEAM_ID"`
    ` CODE_SIGN_IDENTITY="iPhone Distribution"`
    ` IPHONEOS_DEPLOYMENT_TARGET="IOS_VERSION" 
```
Adjust command line accordingly to your app setup, with appropriate names for the project, scheme, archive path and target. Also make sure to provide proper team ID and bundle as well as deployment target.

### How do I handle Google services - related errors on Android during initialization?
SDK provides a method which you can call to display a system dialog which will help users resolve such issues. You will need to handle an error code provided by the library when initialization fails.
```javascript
MobileMessaging.init({
    ...
    },
    function(error) {
        console.log('Init error: ' + error.description);
        if (error.code) {
            displayErrorDialog(error.code);
        }
    }
);

function displayErrorDialog(errorCode) {
    MobileMessaging.showDialogForError(errorCode, function(){
          console.log("The issue was resolved by user");

          // re-init SDK
      }, function(error){
          console.log("User failed to resolve the issue: " + error.description);
      });
};
...
```

