# Mobile Messaging SDK plugin for Cordova

Mobile Messaging SDK is designed and developed to easily enable push notification channel in your mobile application. In almost no time of implementation you get push notification in your application and access to the features of [Infobip IP Messaging Platform](https://portal.infobip.com/push/). 
The document describes library integration steps for your Cordova project.

## Requirements

- Cordova installed
- Android or iOS project
- Cocoapods 1.1.1 or higher installed

## Quick start guide

This guide is designed to get you up and running with Mobile Messaging SDK plugin for Cordova.

1. Prepare your push credentials for Android and iOS
	1. Get Sender ID and Server API Key for Android ([Cloud Messaging credentials](https://github.com/infobip/mobile-messaging-sdk-android/wiki/Firebase-Cloud-Messaging)).
	2. Prepare your App ID, provisioning profiles and APNs certificate ([APNs Certificate Guide](https://github.com/infobip/mobile-messaging-sdk-ios/wiki/APNs-Certificate-guide)).

2. Prepare your Infobip account (https://portal.infobip.com/push/) to get your Application Code:
    1. [Create new application](https://dev.infobip.com/v1/docs/push-introduction-create-app) on Infobip Push portal.
    2. Navigate to your Application where you will get the Application Code.
    3. Mark the "Available on Android" checkbox and insert previously obtained GCM Server Key (Server API Key).
    <center><img src="https://github.com/infobip/mobile-messaging-sdk-android/wiki/images/GCMAppSetup.png" alt="CUP Settings"/></center>

    4. Mark the "Available on iOS" checkbox. Click on "UPLOAD" under "APNS Certificates" and locate the .p12 certificate you exported from your Keychain earlier (Mark the "Sandbox" checkbox if you are using sandbox environment for the application).
	<center><img src="https://github.com/infobip/mobile-messaging-sdk-ios/wiki/Images/CUPCertificate.png?raw=true" alt="CUP Settings"/></center>

3. Create new application with Cordova
    * You can find more info on this link https://cordova.apache.org/#getstarted

4. Add Mobile Messaging plugin to your project
	```bash
	cordova plugin add https://github.com/infobip/mobile-messaging-cordova-plugin.git --save
	```

5. Steps to setup iOS project: 
	1. Change the `config.xml` to add cocoapods support:

	```xml
	<platform name="ios">
		<preference name="pods_ios_min_version" value="8.4" />
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

	4. Change "Use Legacy Swift Language Version" to "NO"
	<center><img src="https://i.gyazo.com/fb5a9e2d6ec994c83ba495ce0dd70b0a.png" alt="Legacy Swift Version"/></center>

	5. Change minimum deployment target version to 8.4

	6. For Swift3 support call 'pod update' manually from command line, inside platforms/ios folder

	7. Configure your project to support Push Notifications:

			i. Click on "Capabilities", then turn on Push Notifications.

			ii. Turn on Background Modes and check the Remote notifications checkbox.

6. Add code to your project to initialize the library after 'deviceready' event with configuration options and library event listener

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
	android: {
		senderId: '<Cloud Messaging Sender ID obtained in step 1>'
	},
	ios: {
		notificationTypes: '<notification types to indicate how the app should alert user when push message arrives>'
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
| 'messageReceived' | message object | Occurs when new message arrives, see separate section for all available message fields |
| 'tokenReceived' | Cloud token | Occurs when an APNs device token is received. Contains device token - a hex-encoded string received from APNS. Returns device token as hex-encoded string.|
| 'registrationUpdated' | Infobip internal ID | Occurs when the registration is updated on backend server. Returns internallId - string for the registered user.|
| 'geofenceEntered' | geo object |Occurs when device enters a geofence area. |

### 'messageReceived' event
```javascript
MobileMessaging.register('messageReceived', 
	function(message) {
		console.log('Message Received: ' + message.body);
	}
);
```
Supported message fields are described below.
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
	customData: '<any custom data provided with message>',
	originalPayload: '<original payload of message (iOS only)>'
}
```

### 'tokenReceived' event
```javascript
MobileMessaging.register('tokenReceived',
     function(token) {
         console.log('Token: ' + token);
     }
);
```

### 'registrationUpdated' event
```javascript
MobileMessaging.register('registrationUpdated',
     function(internalId) {
         console.log('Internal ID: ' + internalId);
     }
);
```

### 'geofenceEntered' event
```javascript
MobileMessaging.register('geofenceEntered',
     function(geo) {
         console.log('Geo area entered: ' + geo.area.title);
     }
);
```
Supported geo fields are described below.
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
	},
	message: {
		// notification message
		// same as in 'messageReceived' event
	}
}
```

## Synchronizing user data
It is possible to sync user data to the server as well as fetch latest user data from the server

### Sync user data
Set of predefined data fields is currently supported as well as custom fields containing string, number or date. Root level of user data contains all predefined fields as listed below. 'customData' object shall contain all custom fields.
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
Mobile Messaging SDK has an API to mark messages as seen by user. This is usually done when user opens a particular message. Message can be obtained either via "messageReceived" event or together with geo area with "geofenceEntered" event (via geo.message).
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
It is possible to enable geofencing engine inside Mobile Messaging. In this case "geofencingEnabled" shall be set to true in configuration. Appropriate permissions should be also requested or configured for your application prior to initialization of library. Initialization will fail if there are no appropriate permissions.

### Android
Make sure that location permission is added to android configuration in "config.xml".
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