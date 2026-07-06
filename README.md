# Mobile Messaging SDK plugin for Cordova

[![npm](https://img.shields.io/npm/v/com-infobip-plugins-mobilemessaging.svg)](https://www.npmjs.com/package/com-infobip-plugins-mobilemessaging)

Mobile Messaging SDK is designed and developed to easily enable push notification channel in your mobile application. In almost no time of implementation you get push notification in your application and access to the features of [Infobip IP Messaging Platform](https://www.infobip.com/en/products/mobile-app-messaging). 
The document describes library integration steps for your Cordova project.

  * [Requirements](#requirements)
  * [Quick start guide](#quick-start-guide)
  * [Initialization configuration](#initialization-configuration)

## Requirements
- cordova 12.0.0 (`sudo npm install -g cordova`)
- npm (version 8.13.x or higher)
- node (version 16.13.0 or higher)

For iOS project:
- Xcode 16.x
- Minimum deployment target 15.0
- If using CocoaPods: 
    - [cordova-ios@7.1.1](https://cordova.apache.org/announcements/2024/07/24/cordova-ios-7.1.1.html) 
    - Cocoapods 1.14.x
- If using Swift Package Manager (SPM):
    - [cordova-ios@8.x.x](https://cordova.apache.org/announcements/2025/11/23/cordova-ios-8.0.0.html)
    - Cocoapods 1.16.x (this requirement will be removed in future releases, once the CocoaPods Trunk permanently becomes read-only)

For Android project: 
- Android Studio
- Supported API Levels: 22 ( Android 5.1 - [Lollipop](https://developer.android.com/about/versions/lollipop)) - 35 (Android 15)
- [cordova-android@14.x.x](https://cordova.apache.org/announcements/2025/04/30/cordova-android-14.0.1.html)

For Huawei:
- Android Studio
- Installed <a href="https://huaweimobileservices.com/appgallery/" target="_blank">AppGallery</a> with HMS Core at device
- Supported API Levels: 22 ( Android 5.1 - [Lollipop](https://developer.android.com/about/versions/lollipop)) - 31 (Android 12.0)

## Quick start guide
This guide is designed to get you up and running with Mobile Messaging SDK plugin for Cordova:

1. Make sure to [setup application at Infobip portal](https://www.infobip.com/docs/mobile-app-messaging/getting-started#create-and-enable-a-mobile-application-profile), if you haven't already.

2. Add MobileMessaging plugin to your project, run in terminal:
    ```bash
    $ cordova plugin add com-infobip-plugins-mobilemessaging --save
    ```
    
    You can add typings if you are using TypeScript in yours project
    ```bash
    npm install --save-dev @types/mobile-messaging-cordova
    ```
    
    <details><summary>expand to see Ionic code</summary>
    <p>

    ```bash
    ionic cordova plugin add com-infobip-plugins-mobilemessaging --save
    npm install @awesome-cordova-plugins/mobile-messaging --save
    ```

    </p>
    </details>
3. Configure platforms

    1. **iOS**:
        1. Add `IOS_EXTENSION_APP_GROUP` variable to the plugin section and required preferences to your `config.xml`:
            ```xml
               <plugin name="com-infobip-plugins-mobilemessaging" spec="<current plugin version>">
                  <variable name="IOS_EXTENSION_APP_GROUP" value="group.your.bundle.id" />
               </plugin>
               <platform name="ios">
                  <preference name="SwiftVersion" value="5.0" />
                  <preference name="deployment-target" value="15.0" />
                  ...
               </platform>
            ```
            - `SwiftVersion` and `deployment-target` are required for the plugin to build correctly
            - `IOS_EXTENSION_APP_GROUP` enables automatic [Notification Service Extension](https://github.com/infobip/mobile-messaging-cordova-plugin/wiki/Delivery-improvements-and-rich-content-notifications) integration, providing more accurate delivery stats and rich notifications on the lock screen
        2. Run `cordova platform add ios` (for new projects) or `cordova prepare ios` (if the iOS platform is already added). This will automatically create the Notification Service Extension target if `IOS_EXTENSION_APP_GROUP` is set.
        3. Setup signing for **both** the main app target and the `MobileMessagingNotificationServiceExtension` target (select your Team and configure provisioning profiles).
        4. After signing is configured, you need to build the app:
            ```bash
            $ cordova build ios
            ```

        > ### Notice (CocoaPods and Swift Package Manager integration):
        > From version `8.5.0`, the plugin supports both **Swift Package Manager** ([cordova-ios@8.x.x](https://cordova.apache.org/announcements/2025/11/23/cordova-ios-8.0.0.html) and above) and **CocoaPods** (cordova-ios v7). The correct integration is selected automatically, and no extra configuration is needed. After December 2nd 2026, CocoaPods will permanently become read-only so migration to SPM in recommended to get the latest plugin updates. See the [Swift Package Manager integration guide](https://github.com/infobip/mobile-messaging-cordova-plugin/wiki/Swift-Package-Manager-integration) for details on migrating from CocoaPods to Swift Package Manager.

    2. **Android**: 
       1. Get the Firebase configuration file (google-services.json) as described in <a href="https://firebase.google.com/docs/android/setup#add-config-file" target="_blank">`Firebase documentation`</a> and put it to the root application folder.
       2. Add following to your config.xml
           ```xml
              <platform name="android">
                 <resource-file src="google-services.json" target="app/google-services.json" />
                 <preference name="GradlePluginGoogleServicesEnabled" value="true"/>
                 ...
              </platform>
           ```
   > ### Notice (when targeting Android 13):
   > Starting from Android 13, Google requires to ask user for notification permission. Follow <a href="https://github.com/infobip/mobile-messaging-cordova-plugin/wiki/Android-13-Notification-Permission-Handling" target="_blank">this guide</a> to make a permission request.

4. Configure Huawei build

    1. Configure <a href="https://developer.huawei.com/consumer/en/doc/development/HMSCore-Guides/android-config-agc-0000001050170137" target="_blank">Huawei application</a>
    2. Change `plaform/android/build.gradle`
        ```gradle
            
            buildscript {
                repositories {
                    mavenCentral()
                    google()
                    maven { url 'https://developer.huawei.com/repo/' } // Added for Huawei support
                }
            
                dependencies {
                    ...
                    classpath 'com.huawei.agconnect:agcp:1.6.0.300' // Added for Huawei support
                }
            }
       
            allprojects {
                repositories {
                    mavenCentral()
                    google()
                    maven {url 'https://developer.huawei.com/repo/'} // Added for Huawei support
                }
                ...
            }
       
       ```    
    3. Change `plaform/android/app/build.gradle`
        ```gradle
       
            apply plugin: 'com.android.application'
            apply plugin: 'com.huawei.agconnect' // Added for Huawei support
            
            dependencies {
                   implementation 'com.huawei.hms:push:6.3.0.302' // Added for Huawei support
            }
       
       ```
    4. Sign your app to provide config for <a href="https://developer.huawei.com/consumer/en/doc/development/HMSCore-Guides/android-config-agc-0000001050170137#EN-US_TOPIC_0000001050170137__section193351110105114"  target="_blank">Generated Signing Certificate Fingerprint</a> at previous step.
You can change `plaform/android/app/build.gradle` or write sign config to `build.json`
        ```gradle
       
           android {

               signingConfigs {
                   release {
                       storeFile file(<path to *.jks file>)
                       storePassword "<password>"
                       keyAlias "<alias>"
                       keyPassword "<password>"
                   }
               }
               buildTypes {
                   release {
                       signingConfig signingConfigs.release
                   }
                   debug {
                       signingConfig signingConfigs.release
                   }
               }
       
               ...
       
        ```
    5. Download `agconnect-services.json` from <a href="https://developer.huawei.com/consumer/ru/service/josp/agc/index.html"  target="_blank">AppGallery Connect </a> and copy it to `platforms/android/app`.
        
        a. Find your App from the list and click the link under Android App in the Mobile phone column.
        
        b. Go to Develop > Overview.
        
        c. In the App information area, Click `agconnect-services.json` to download the configuration file.
    6. Add [`Huawei App ID`](https://developer.huawei.com/consumer/en/doc/development/HMSCore-Guides/android-config-agc-0000001050170137) via plugin variable in `config.xml` :   
        ```xml
           <plugin name="com-infobip-plugins-mobilemessaging" spec="...">
               <variable name="HUAWEI_SENDER_ID" value="Huawei App ID" />
           </plugin>
        ```
        You can take this value from `agconnect-services.json`.
    7. Remove, if following was added to `config.xml`
       ```xml
          <platform name="android">
              <resource-file src="google-services.json" target="app/google-services.json" />
              <preference name="GradlePluginGoogleServicesEnabled" value="true"/>
              ...
          </platform>
        ```
        
    8. Run `cordova build android --hms` to make build for HMS.
        
        **Note** that if you are developing / testing FCM and HMS at the same device then better to remove cache for installed app, remove app and after that install build with other push cloud. 

5. Add code to your project to initialize the library after `deviceready` event with configuration options and library event listener:

    ```javascript
    onDeviceReady: function () {
        ...
        MobileMessaging.init({
                applicationCode: '<your_application_code>',
                geofencingEnabled: '<true/false>',
                ios: {
                    notificationTypes: ['alert', 'badge', 'sound']
                },
                android: {
                    notificationIcon: <String; a resource name for a status bar icon (without extension), located in '/platforms/android/app/src/main/res/mipmap'>,
                    multipleNotifications: <Boolean; set to 'true' to enable multiple notifications>,
                    notificationAccentColor: <String; set to hex color value in format '#RRGGBB' or '#AARRGGBB'>
                }
            },
            function() {
                console.log(`Mobile Messaging SDK has started initialization process. Register for registrationUpdated event to know when it's ready to be used.`);
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
    <details><summary>expand to see Ionic code</summary>
    <p>

    #### Add this code to app.module.ts::
    ```typescript
    import { MobileMessaging } from '@ionic-native/mobile-messaging/ngx';

    ...

    @NgModule({
     ...

      providers: [
        ...
        MobileMessaging
        ...
      ]
      ...
    })
    export class AppModule { }
    ```
 
    #### Usage sample:
    ```typescript
    import {Message, MobileMessaging, UserData} from '@ionic-native/mobile-messaging/ngx';

    ...
 
    @Component({
      selector: 'app-root',
      templateUrl: 'app.component.html',
      styleUrls: ['app.component.scss']
    })
    export class AppComponent {
      constructor(
        private platform: Platform,
        private splashScreen: SplashScreen,
        private statusBar: StatusBar,
        private mobileMessaging: MobileMessaging
      ) {
        this.initializeApp();
      }
   
    ...
    
      this.mobileMessaging.init({
        applicationCode: '<your_application_code>',
        ios: {
          notificationTypes: ['alert', 'badge', 'sound']
        },
        android: {
          notificationIcon: <String; a resource name for a status bar icon (without extension), located in '/platforms/android/app/src/main/res/mipmap'>,
          multipleNotifications: <Boolean; set to 'true' to enable multiple notifications>,
          notificationAccentColor: <String; set to hex color value in format '#RRGGBB' or '#AARRGGBB'>
       }}, 
        () => {},
        (err) => {
         ...
       });
     
       this.mobileMessaging.register('messageReceived', function (message: any) {
         ...
       });
    ```
    </p>
    </details>

## Initialization configuration
> ### Notice:
> The callback function will be called after successful start of Mobile Messaging SDK initialization. When the callback is called,
> it does not mean that the Mobile Messaging SDK is fully initialized and no Mobile Messaging SDK methods should be called inside the callback.
> To know when the Mobile Messaging SDK is fully initialized, you should subscribe to the [registrationUpdated](https://github.com/infobip/mobile-messaging-cordova-plugin/wiki/Library-events) event.

```javascript
MobileMessaging.init({
        applicationCode: <String; Infobip Application Code from the Customer Portal obtained in step 2>,

        // General configuration
        inAppChatEnabled: <Boolean; set to true to enable in-app chat feature>, // optional
        fullFeaturedInAppsEnabled: <Boolean; set to true to enable full featured in-app messages>, // optional
        loggingEnabled: <Boolean; set to true to enable debug logging>, // optional
        userDataJwt: <String; JWT token for authorization of user data related operations>, // optional
        trustedDomains: <Array<String>; list of trusted domain strings for web views, e.g. ['example.com', 'trusted.org']>, // optional
        messageStorage: <Object; message storage implementation>, // optional
        defaultMessageStorage: <Boolean; set to 'true' to enable default message storage implementation>, // optional

        // iOS-specific configuration
        ios: {
            notificationTypes: <Array; values: 'alert', 'badge', 'sound'; notification types to indicate how the app should alert user when push message arrives>,
            forceCleanup: <Boolean; defines whether the SDK must be cleaned up on startup. Default: false>, // optional
            registeringForRemoteNotificationsDisabled: <Boolean; set to true to disable automatic registration for remote notifications. Default: false>, // optional
            overridingNotificationCenterDelegateDisabled: <Boolean; set to true to prevent SDK from overriding UNUserNotificationCenterDelegate. Default: false>, // optional
            unregisteringForRemoteNotificationsDisabled: <Boolean; set to true to prevent SDK from unregistering for remote notifications when stopping SDK or after depersonalization, useful when using MobileMessaging SDK with another push provider. Default: false>, // optional
            webViewSettings: { // optional; settings for web view configuration in in-app messages
                title: <String; custom title for the web view toolbar>,
                barTintColor: <String; hex color string for the toolbar background color>,
                titleColor: <String; hex color string for the toolbar title text color>,
                tintColor: <String; hex color string for the toolbar button color>
            }
        },

        // Android-specific configuration
        android: { // optional
            notificationIcon: <String; a resource name for a status bar icon (without extension), located in '/platforms/android/app/src/main/res/mipmap'>,
            notificationChannelId: <String; identifier for notification channel>, // optional
            notificationChannelName: <String; user visible name for notification channel>, // optional
            notificationSound: <String; a resource name for a notification sound (without extension), located in '/platforms/android/app/src/main/res/raw'>, // optional
            multipleNotifications: <Boolean; set to 'true' to enable multiple notifications>,
            notificationAccentColor: <String; set to hex color value in format '#RRGGBB' or '#AARRGGBB'>,
            withBannerForegroundNotificationsEnabled: <Boolean; set to true to always display Push notifications as Banner> // optional
        },

        // Interactive notifications
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
                       icon: <String; a resource name for a special action icon>
                   }
               ]
           }
        ],

        // Privacy settings
        privacySettings: { // optional
            userDataPersistingDisabled: <Boolean; set to true to disable persisting User Data locally. Default: false>,
            carrierInfoSendingDisabled: <Boolean; set to true to disable sending carrier information to server. Default: false>,
            systemInfoSendingDisabled: <Boolean; set to true to disable sending system information (OS version, device model, app version) to server. Default: false>
        }
    },
    function() {
        console.log(`Mobile Messaging SDK has started initialization process. Register for registrationUpdated event to know when it's ready to be used.`);
    },
    function(error) {
        console.log('Init error: ' + error.description);
    }
);
```

## Troubleshooting

### iOS: "Could not find *-Info.plist file, or config.xml file"

This error can occur during `cordova build ios` or `cordova prepare ios` when the Notification Service Extension target is present. It is caused by the Xcode project's build configurations being reordered, which confuses Cordova's project file parser.

**To fix**, remove and re-add the iOS platform:
```bash
$ cordova platform remove ios
$ cordova platform add ios
```
Then configure signing in Xcode and rebuild.

If the issue persists, try a full clean reinstall:
```bash
$ rm -rf platforms plugins node_modules
$ npm install
$ cordova plugin add com-infobip-plugins-mobilemessaging
$ cordova platform add ios
```

As a last resort, you can manually fix the ordering in `platforms/ios/YourApp.xcodeproj/project.pbxproj`. Open the file in a text editor, find the `/* Begin XCBuildConfiguration section */`, and move the block that contains your app's `INFOPLIST_FILE` (e.g. `INFOPLIST_FILE = "YourApp/YourApp-Info.plist"`) **above** the block that contains the extension's `INFOPLIST_FILE` (e.g. `INFOPLIST_FILE = NotificationServiceExtension/MobileMessagingNotificationServiceExtension.plist`). Each block starts with a UUID and ends with `};`.

### iOS: "SWIFT_VERSION '' is unsupported"

Make sure you have added the `SwiftVersion` preference inside the `<platform name="ios">` section of your `config.xml`:
```xml
<platform name="ios">
    <preference name="SwiftVersion" value="5.0" />
</platform>
```

### iOS: Extension target not created

Ensure `IOS_EXTENSION_APP_GROUP` is set in your `config.xml` inside the plugin section:
```xml
<plugin name="com-infobip-plugins-mobilemessaging" spec="<current plugin version>">
    <variable name="IOS_EXTENSION_APP_GROUP" value="group.your.bundle.id" />
</plugin>
```
Then run `cordova prepare ios` — the extension is created during the prepare step, not during plugin installation.

#### More details on SDK features and FAQ you can find on [Wiki](https://github.com/infobip/mobile-messaging-cordova-plugin/wiki)

<br>
<p align="center"><b>NEXT STEPS: <a href="https://github.com/infobip/mobile-messaging-cordova-plugin/wiki/Users-and-installations">Users and installations</a></b></p>
<br>

| If you have any questions or suggestions, feel free to send an email to support@infobip.com or create an <a href="https://github.com/infobip/mobile-messaging-cordova-plugin/issues" target="_blank">issue</a>. |
|---|
