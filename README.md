# Mobile Messaging SDK plugin for Cordova

Mobile Messaging SDK is designed and developed to easily enable push notification channel in your mobile application. In almost no time of implementation you get push notification in your application and access to the features of [Infobip IP Messaging Platform](https://portal.infobip.com/push/). 
The document describes library integration steps for your Cordova project.

## Requirements

- Cordova installed
- Android or iOS project

## Quick start guide

This guide is designed to get you up and running with Mobile Messaging SDK plugin for Cordova.

1. Prepare your push credentials for Android and iOS
	1. Get Sender ID and Server API Key for Android: [Cloud Messaging credentials](https://github.com/infobip/mobile-messaging-sdk-android/wiki/Firebase-Cloud-Messaging).
	2. Prepare your App ID, provisioning profiles and APNs certificate: ([APNs Certificate Guide](https://github.com/infobip/mobile-messaging-sdk-ios/wiki/APNs-Certificate-guide)).

2. Prepare your Infobip account (https://portal.infobip.com/push/) to get your Application Code:
    1. [Create new application](https://dev.infobip.com/v1/docs/push-introduction-create-app) on Infobip Push portal.
    2. Navigate to your Application where you will get the Application Code.
    3. Mark the "Available on Android" checkbox and insert previously obtained GCM Server Key (Server API Key).
    <center><img src="https://github.com/infobip/mobile-messaging-sdk-android/wiki/images/GCMAppSetup.png" alt="CUP Settings"/></center>

    4. Mark the "Available on iOS" checkbox. Click on "UPLOAD" under "APNS Certificates" and locate the .p12 certificate you exported from your Keychain earlier (Mark the "Sandbox" checkbox if you are using sandbox environment for the application).
	<center><img src="https://github.com/infobip/mobile-messaging-sdk-ios/wiki/Images/CUPCertificate.png?raw=true" alt="CUP Settings"/></center>

3. Create new application with Cordova
    * You can find more info on this link https://cordova.apache.org/#getstarted

4. Add Mobile Messaging plugin to your porject
	1. You can add plugin directly from a git repository 
	
	```bash
	cordova plugin add https://git.ib-ci.com/scm/mml/infobip-mobile-messaging-cordova-plugin.git:MobileMessagingPlugin --save
	```

	2. Or you can add plugin from a local directory if you already have a local copy

	```bash
	cordova plugin add ../infobip-mobile-messaging-cordova-plugin/MobileMessagingPlugin
	```

5. Steps to setup iOS project: 
	1. Change the `config.xml` to add cocoapods support:

	```xml
	<platform name="ios">
		<preference name="pods_ios_min_version" value="8.0" />
		<preference name="pods_use_frameworks" value="true" />
		...
		<allow-intent href="itms:*" />
		<allow-intent href="itms-apps:*" />
	</platform>
	```

	2. To have the cocoaPods installed do 
	```bash
	cordova build
	```

	3. Open workspace and add Objective-C Bridging Header manually
	<center><img src="https://i.gyazo.com/35c5eb3af1dc841aa030c15250791424.png" alt="Bridging Header setup"/></center>

	4. 	Change "Use Legacy Swift Language Version" to "NO"
	<center><img src="https://i.gyazo.com/fb5a9e2d6ec994c83ba495ce0dd70b0a.png" alt="Legacy Swift Version"/></center>

	5. 	For support Swift 3 call 'pod update' manually from command line, inside platforms/ios folder

	6. Configure your project to support Push Notifications:

			i. Click on "Capabilities", then turn on Push Notifications.

			ii. Turn on Background Modes and check the Remote notifications checkbox.

5. Add code to your project to initialize the library after 'deviceready' event with configuration options and library event listener

```javascript
onDeviceReady: function() {
	...
        
    mobileMessaging.init({
			applicationCode: '<your_application_code>',
			android: {
				senderId: '<sender id>'
			},
			ios: {
				notificationTypes: ['alert', 'badge', 'sound']
			}
		},
		function() {
			console.log('error')
		}
	);

	mobileMessaging.register('messageReceived', 
		function(result) {
			console.log('Message Received ' + result.body);
		}
	);
}
```

## Supported configuration options

| Option | Description |
| --- | --- |
| applicationCode | Infobip Application Code from the Customer Portal obtained in step 2 |
| android.senderId | Cloud Messaging Sender ID obtained in step 1 | 
| ios.notificationTypes | Preferable notification types that indicating how the app alerts the user when a push notification arrives. |


## Supported events
| Event | Description |
| --- | --- |
| 'messageReceived' | Occurs when new message arrives, see separate section for all available message fields |
| 'tokenReceived' | Posted when an APNs device token is received. Contains a hex-encoded device token string received from APNS. Available fields: 'token' - device token hex-encoded string.|
| 'registrationUpdated' | Posted when the registration is updated on backend server. Available fields: 'internallId' - string for the registered user.|

### 'messageReceived' event fields
| Field | Description |
| --- | --- |
| messageId | Unique ID of a message |
| title | Title of a message (if available) |
| body | Message text |
| sound | The name of a sound file to be played when message arrives |
| vibrate | Flag that indicates if vibration should be used for notification (Android only)|
| icon | Dedicated icon ID to be used for notification (Android only)|
| silent | Flag that indicates if message is silent |
| category | Notification category (Android only)|
| receivedTimestamp | Absolute timestamp in milliseconds that indicates when the message was received |
| customData | Any custom data provided with a message |
| originalPayload | Original payload of the message (iOS only)|
