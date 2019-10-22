# Mobile Messaging SDK plugin for Cordova

[![npm](https://img.shields.io/npm/v/com-infobip-plugins-mobilemessaging.svg)](https://www.npmjs.com/package/com-infobip-plugins-mobilemessaging)

Mobile Messaging SDK is designed and developed to easily enable push notification channel in your mobile application. In almost no time of implementation you get push notification in your application and access to the features of [Infobip IP Messaging Platform](https://portal.infobip.com/push/). 
The document describes library integration steps for your Cordova project.

  * [Requirements](#requirements)
  * [Quick start guide](#quick-start-guide)
  * [Initialization configuration](#initialization-configuration)

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

1. Make sure to [setup application at Infobip portal](https://dev.infobip.com/push-messaging), if you haven't already.

2. Add MobileMessaging plugin to your project, run in terminal:
    ```bash
    $ cordova plugin add com-infobip-plugins-mobilemessaging --save
    ```

3. Configure platforms

    1. **iOS**: [Integrate Notification Service Extension](https://github.com/infobip/mobile-messaging-cordova-plugin/wiki/Delivery-improvements-and-rich-content-notifications) into your app in order to obtain:
        - more accurate processing of messages and delivery stats
        - support of rich notifications on the lock screen
    2. **Android**: add [`Firebase Sender ID`](https://dev.infobip.com/push-messaging/firebase-cloud-messaging-fcm-server-api-key-setup) via plugin variable in `config.xml` :
    ```xml
    <plugin name="com-infobip-plugins-mobilemessaging" spec="...">
        <variable name="ANDROID_FIREBASE_SENDER_ID" value="Firebase Sender ID" />
    </plugin>
    ```

4. Add code to your project to initialize the library after `deviceready` event with configuration options and library event listener:

    ```javascript
    onDeviceReady: function() {
        ...
        MobileMessaging.init({
                applicationCode: '<your_application_code>',
                geofencingEnabled: '<true/false>',
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
        ios: {
            notificationTypes: <Array; values: 'alert', 'badge', 'sound'; notification types to indicate how the app should alert user when push message arrives>
        },
        android: { // optional
            notificationIcon: <String; a resource name for a status bar icon (without extension), located in '/platforms/android/app/src/main/res/mipmap'>,
            multipleNotifications: <Boolean; set to 'true' to enable multiple notifications>,
            notificationAccentColor: <String; set to hex color value in format '#RRGGBB' or '#AARRGGBB'>
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

#### More details on SDK features and FAQ you can find on [Wiki](https://github.com/infobip/mobile-messaging-cordova-plugin/wiki)

<br>
<p align="center"><b>NEXT STEPS: <a href="https://github.com/infobip/mobile-messaging-cordova-plugin/wiki/User-profile">User profile</a></b></p>
<br>

| If you have any questions or suggestions, feel free to send an email to support@infobip.com or create an <a href="https://github.com/infobip/mobile-messaging-cordova-plugin/issues" target="_blank">issue</a>. |
|---|
