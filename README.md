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
- node (version 16.10.0 or higher)

For iOS project:
- Xcode 16.x
- Cocoapods 1.14.x
- Minimum deployment target 12.0
- [cordova-ios@7.x.x](https://cordova.apache.org/announcements/2023/07/10/cordova-ios-7.0.0.html)
- Ruby (2.7.x - 3.1.x)

For Android project: 
- Android Studio
- Supported API Levels: 22 ( Android 5.1 - [Lollipop](https://developer.android.com/about/versions/lollipop)) - 34 (Android 14.0)
- [cordova-android@12.x.x](https://cordova.apache.org/announcements/2023/05/22/cordova-android-12.0.0.html)

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

    1. **iOS**: [Integrate Notification Service Extension](https://github.com/infobip/mobile-messaging-cordova-plugin/wiki/Delivery-improvements-and-rich-content-notifications) into your app in order to obtain:
        - more accurate processing of messages and delivery stats
        - support of rich notifications on the lock screen
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
       }}, (err) => {
         ...
       });
     
       this.mobileMessaging.register('messageReceived', function (message: any) {
         ...
       });
    ```
    </p>
    </details>

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
<p align="center"><b>NEXT STEPS: <a href="https://github.com/infobip/mobile-messaging-cordova-plugin/wiki/Users-and-installations">Users and installations</a></b></p>
<br>

| If you have any questions or suggestions, feel free to send an email to support@infobip.com or create an <a href="https://github.com/infobip/mobile-messaging-cordova-plugin/issues" target="_blank">issue</a>. |
|---|
