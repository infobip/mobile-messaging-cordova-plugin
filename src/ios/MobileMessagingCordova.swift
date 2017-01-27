
import Foundation
import UIKit
import MobileMessaging

class MMConfiguration {
	let appCode: String
    var geofencingEnabled: Bool = false
	var notificationType: UIUserNotificationType = []
	init?(rawConfig: [String: AnyObject]) {
		guard let appCode = rawConfig["applicationCode"] as? String,
			let ios = rawConfig["ios"] as? [String: AnyObject] else {
				return nil
		}
        
		self.appCode = appCode
        if let geofencingEnabled = rawConfig["geofencingEnabled"] as? Bool {
            self.geofencingEnabled = geofencingEnabled
        }
		
		let notificationTypes = ios["notificationTypes"] as? [String]
		notificationTypes?.forEach({ (type) in
			switch type {
			case "badge": notificationType.insert(.badge)
			case "sound": notificationType.insert(.sound)
			case "alert": notificationType.insert(.alert)
			default: break
			}
		})
	}
}

@objc(MobileMessagingCordova) class MobileMessagingCordova : CDVPlugin {
	var notificationObservers: [String: AnyObject]?
	
	override func pluginInitialize() {
		super.pluginInitialize()
		notificationObservers = [String: AnyObject]()
	}
	
	@objc(init:) func start(command: CDVInvokedUrlCommand) {
		guard let configDict = command.arguments[0] as? [String: AnyObject],
			let configuration = MMConfiguration(rawConfig: configDict) else {
				let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Can't parse configuration")
				self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
				return
		}
		
        MobileMessagingCordovaApplicationDelegate.install()
        if (configuration.geofencingEnabled) {
            MobileMessaging.withApplicationCode(configuration.appCode, notificationType: configuration.notificationType)?.withGeofencingService().start()
        } else {
            MobileMessaging.withApplicationCode(configuration.appCode, notificationType: configuration.notificationType)?.start()
        }
		
		let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK)
		self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
	}
	
	func register(_ command: CDVInvokedUrlCommand) {
		let callbackId = command.callbackId
		let pluginResult = CDVPluginResult(status: CDVCommandStatus_ERROR)
		guard let event = command.arguments[0] as? String else {
			self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
			return
		}
		
		guard let mmNotificationName = mmNotificationName(event: event) else {
			self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
			return
		}
		
		unregister(mmNotificationName)
		
		let observer = NotificationCenter.default.addObserver(forName: NSNotification.Name(rawValue: mmNotificationName), object: nil, queue: nil) { (notification) in
            var notificationResult:CDVPluginResult?
			switch mmNotificationName {
			case MMNotificationMessageReceived:
				if let message = notification.userInfo?[MMNotificationKeyMessage] as? MTMessage {
					notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: message.dictionary())
				}
			case MMNotificationDeviceTokenReceived:
				if let token = notification.userInfo?[MMNotificationKeyDeviceToken] as? String {
					notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: token)
				}
			case MMNotificationRegistrationUpdated:
				if let internalId = notification.userInfo?[MMNotificationKeyRegistrationInternalId] as? String {
					notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: internalId)
				}
            case MMNotificationGeographicalRegionDidEnter:
                if let region = notification.userInfo?[MMNotificationKeyGeographicalRegion] as? MMRegion {
                    notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: region.dictionary())
                }
			default: break
			}
			notificationResult?.setKeepCallbackAs(true)
			self.commandDelegate?.send(notificationResult, callbackId: callbackId)
		}
		
		notificationObservers?[mmNotificationName] = observer
	}
	
	func unregister(_ command: CDVInvokedUrlCommand) {
		var pluginResult = CDVPluginResult(status: CDVCommandStatus_ERROR)
		guard let event = command.arguments[0] as? String else {
			self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
			return
		}
		
		guard let mmNotificationName = mmNotificationName(event: event) else {
			self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
			return
		}
		
		unregister(mmNotificationName)
		
		pluginResult = CDVPluginResult(status: CDVCommandStatus_OK)
		self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
	}
    
    func syncUserData(_ command: CDVInvokedUrlCommand) {
        guard let userDataDictionary = command.arguments[0] as? [String: AnyObject?] else {
            let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Cannot retrieve user data dictionary")
            self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
            return
        }
        
        MobileMessaging.currentUser?.set(dictionary: userDataDictionary)
        MobileMessaging.currentUser?.save({ error in
            if let error = error {
                let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: error.description)
                self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
            } else {
                let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: MobileMessaging.currentUser?.dictionary())
                self.commandDelegate?.send(successResult, callbackId: command.callbackId)
            }
        })
    }
    
    func fetchUserData(_ command: CDVInvokedUrlCommand) {
        MobileMessaging.currentUser?.fetchFromServer(completion: { error in
            if let error = error {
                let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: error.description)
                self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
            } else {
                let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: MobileMessaging.currentUser?.dictionary())
                self.commandDelegate?.send(successResult, callbackId: command.callbackId)
            }
        })
    }
    
    func markMessagesSeen(_ command: CDVInvokedUrlCommand) {
        guard let messageIds = command.arguments as? [String] else {
            let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Cannot retrieve message ids")
            self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
            return
        }
        
        if (messageIds.isEmpty) {
            let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "No message ids provided")
            self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
            return
        }
        
        MobileMessaging.setSeen(messageIds: messageIds)
        let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: messageIds)
        self.commandDelegate?.send(successResult, callbackId: command.callbackId)
    }

	//MARK: Utils
	private func unregister(_ mmNotificationName: String) {
		guard let observer = notificationObservers?[mmNotificationName] else {
			return
		}
		
		NotificationCenter.default.removeObserver(observer, name: NSNotification.Name(rawValue: mmNotificationName), object: nil)
		let _ = notificationObservers?.removeValue(forKey: mmNotificationName)
	}
	
	private func mmNotificationName(event: String) -> String? {
		switch event {
		case "messageReceived" : return MMNotificationMessageReceived
		case "tokenReceived" : return MMNotificationDeviceTokenReceived
		case "registrationUpdated" : return MMNotificationRegistrationUpdated
        case "geofenceEntered" : return MMNotificationGeographicalRegionDidEnter
		default: break
		}
		return nil
	}
}

extension MTMessage {
	func dictionary() -> [String: Any] {
		var result = [String: Any]()
		result["messageId"] = messageId
		result["body"] = text
		result["sound"] = sound
		result["silent"] = isSilent
		result["receivedTimestamp"] = createdDate.timeIntervalSince1970
		result["customData"] = customPayload
		result["originalPayload"] = originalPayload
		return result
	}
}

extension MMUser {
    
    func dateFormatter() -> DateFormatter {
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"
        return dateFormatter
    }
    
    func predefinedKeysDictionary() -> [MMUserPredefinedDataKeys: String] {
        return [
            MMUserPredefinedDataKeys.MSISDN: "msisdn",
            MMUserPredefinedDataKeys.FirstName: "firstName",
            MMUserPredefinedDataKeys.LastName: "lastName",
            MMUserPredefinedDataKeys.MiddleName: "middleName",
            MMUserPredefinedDataKeys.Gender: "gender",
            MMUserPredefinedDataKeys.Birthdate: "birthdate",
            MMUserPredefinedDataKeys.Email: "email",
            MMUserPredefinedDataKeys.Telephone: "telephone"
        ]
    }
    
    func set(dictionary: [String:AnyObject?]) {
        for (key, jsonKey) in predefinedKeysDictionary() {
            if let value = dictionary[jsonKey] as? String? {
                set(predefinedData: value, forKey: key)
            }
        }
        
        if let externalUserId = dictionary["externalUserId"] as? String {
            self.externalId = externalUserId
        }
        
        guard let customData = dictionary["customData"] as? [String:AnyObject?] else {
            return
        }
        
        let formatter = dateFormatter()
        for (key, data) in customData {
            if data == nil {
                set(customData: nil, forKey: key)
                continue
            }
            if let double = data as? Double {
                set(customData: CustomUserDataValue(double: double), forKey: key)
                continue
            }
            if let int = data as? Int {
                set(customData: CustomUserDataValue(integer: int), forKey: key)
                continue
            }
            if let string = data as? String {
                if let date = formatter.date(from: string) {
                    set(customData: CustomUserDataValue(date: date as NSDate), forKey: key)
                } else {
                    set(customData: CustomUserDataValue(string: string), forKey: key)
                }
            }
        }
    }
    
    func dictionary() -> [String: Any] {
        var result = [String: Any]()
        
        for (key, jsonKey) in predefinedKeysDictionary() {
            if let value = MobileMessaging.currentUser?.predefinedData(forKey: key) {
                result[jsonKey] = value
            }
        }
        
        if let externalUserId = MobileMessaging.currentUser?.externalId {
            result["externalUserId"] = externalUserId
        }
        
        guard let customData = MobileMessaging.currentUser?.customData else {
            return result
        }
        
        let formatter = dateFormatter()
        var customDictionary = [String: Any]()
        for (key, value) in customData {
            if let number = value.number {
                customDictionary[key] = number
            } else if let date = value.date {
                customDictionary[key] = formatter.string(from: date as Date)
            } else if let string = value.string {
                customDictionary[key] = string
            }
        }
        
        result["customData"] = customDictionary
        
        return result
    }
}

extension MMRegion {
    func dictionary() -> [String: Any] {
        var areaCenter = [String: Any]()
        areaCenter["lat"] = center.latitude
        areaCenter["lon"] = center.longitude
        
        var area = [String: Any]()
        area["id"] = identifier
        area["center"] = areaCenter
        area["radius"] = radius
        area["title"] = title
        
        var result = [String: Any]()
        result["area"] = area
        result["message"] = message?.dictionary()
        return result
    }
}
