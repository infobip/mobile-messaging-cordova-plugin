
import Foundation
import UIKit
import MobileMessaging
import Dispatch

class MMConfiguration {
	let appCode: String
	var geofencingEnabled: Bool = false
	var messageStorageEnabled: Bool = false
	var defaultMessageStorage: Bool = false
	var notificationType: UIUserNotificationType = []
	var forceCleanup: Bool = false
	
	//TODO: configuration needs following attrs:
	//TODO: withoutStoringUserData condition
	//TODO: withoutCarrierInfo condition
	//TODO: withoutSystemInfo condition
	//TODO: appcode persisting

	init?(rawConfig: [String: AnyObject]) {
		guard let appCode = rawConfig["applicationCode"] as? String,
			let ios = rawConfig["ios"] as? [String: AnyObject] else
		{
			return nil
		}
		
		self.appCode = appCode
		if let geofencingEnabled = rawConfig["geofencingEnabled"] as? Bool {
			self.geofencingEnabled = geofencingEnabled
		}
		
		if let forceCleanup = rawConfig["forceCleanup"] as? Bool {
			self.forceCleanup = geofenforceCleanupcingEnabled
		}
		
		if let defaultMessageStorage = rawConfig["defaultMessageStorage"] as? Bool {
			self.defaultMessageStorage = defaultMessageStorage
		}
		
		if rawConfig["messageStorage"] != nil {
			self.messageStorageEnabled = true
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
	var notificationObserver: AnyObject?
	var messageStorageAdapter: MessageStorageAdapter? = nil
	var mmNotifications : [String: String]?
	
	override func pluginInitialize() {
		super.pluginInitialize()
		messageStorageAdapter = MessageStorageAdapter(plugin: self)
		mmNotifications = ["messageReceived": MMNotificationMessageReceived,
		                   "tokenReceived":  MMNotificationDeviceTokenReceived,
		                   "registrationUpdated":  MMNotificationRegistrationUpdated,
		                   "geofenceEntered": MMNotificationGeographicalRegionDidEnter,
		                   "notificationTapped": MMNotificationMessageTapped]
	}
	
	@objc(init:) func start(command: CDVInvokedUrlCommand) {
		guard let configDict = command.arguments[0] as? [String: AnyObject],
			let configuration = MMConfiguration(rawConfig: configDict) else
		{
			let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Can't parse configuration")
			self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
			return
		}
		
		MobileMessagingCordovaApplicationDelegate.install()
		
		//TODO: configuration needs following attrs:
		//TODO: withoutStoringUserData condition
		//TODO: withoutCarrierInfo condition
		//TODO: withoutSystemInfo condition
		//TODO: appcode persisting
		
		var mobileMessaging = MobileMessaging.withApplicationCode(configuration.appCode, notificationType: configuration.notificationType, forceCleanup: configuration.forceCleanup)
		if configuration.geofencingEnabled {
			mobileMessaging = mobileMessaging?.withGeofencingService()
		}
		if self.messageStorageAdapter != nil && configuration.messageStorageEnabled {
			mobileMessaging = mobileMessaging?.withMessageStorage(self.messageStorageAdapter!)
		} else if configuration.defaultMessageStorage {
			mobileMessaging = mobileMessaging?.withDefaultMessageStorage()
		}
		mobileMessaging?.start()
		
		let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK)
		self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
	}
	
	func registerReceiver(_ command: CDVInvokedUrlCommand) {
		if let events = command.arguments[0] as? [String] {
			register(forEvents: Set(events), callbackId: command.callbackId)
		}
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
	
	func messageStorage_register(_ command: CDVInvokedUrlCommand) {
		messageStorageAdapter?.register(command)
	}
	
	func messageStorage_unregister(_ command: CDVInvokedUrlCommand) {
		messageStorageAdapter?.unregister(command)
	}
	
	func messageStorage_findResult(_ command: CDVInvokedUrlCommand) {
		messageStorageAdapter?.findResult(command)
	}
	
	func defaultMessageStorage_find(_ command: CDVInvokedUrlCommand) {
		guard let messageId = command.arguments[0] as? String else {
			let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Cannot retrieve messageId")
			self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
			return
		}
		
		MobileMessaging.defaultMessageStorage?.findMessages(withIds: [messageId], completion: { messages in
			var result: CDVPluginResult = CDVPluginResult(status: CDVCommandStatus_OK)
			if let messages = messages, messages.count > 0 {
				result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: messages[0].dictionary())
			}
			
			self.commandDelegate?.send(result, callbackId: command.callbackId)
		})
	}
	
	func defaultMessageStorage_findAll(_ command: CDVInvokedUrlCommand) {
		MobileMessaging.defaultMessageStorage?.findAllMessages(completion: { messages in
			let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: messages?.map({$0.dictionary()}))
			self.commandDelegate?.send(successResult, callbackId: command.callbackId)
		})
	}
	
	func defaultMessageStorage_delete(_ command: CDVInvokedUrlCommand) {
		guard let messageId = command.arguments[0] as? String else {
			let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Cannot retrieve messageId")
			self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
			return
		}
		
		MobileMessaging.defaultMessageStorage?.remove(withIds: [messageId])
		let successResult = CDVPluginResult(status: CDVCommandStatus_OK)
		self.commandDelegate?.send(successResult, callbackId: command.callbackId)
	}
	
	func defaultMessageStorage_deleteAll(_ command: CDVInvokedUrlCommand) {
		MobileMessaging.defaultMessageStorage?.removeAllMessages()
		let successResult = CDVPluginResult(status: CDVCommandStatus_OK)
		self.commandDelegate?.send(successResult, callbackId: command.callbackId)
	}
	
	func setPrivacySettings(_ command: CDVInvokedUrlCommand) {
		guard let privacySettingsDict = command.arguments[0] as? [String: Bool], let ps = PrivacySettings(dictRepresentation: privacySettingsDict) else {
			return
		}
		MobileMessaging.privacySettings = ps
	}
	
	func getPrivacySettings(_ command: CDVInvokedUrlCommand) {
		self.commandDelegate.send(
			CDVPluginResult(
				status: CDVCommandStatus_OK,
				messageAs: MobileMessaging.privacySettings.dictionaryRepresentation
			),
			callbackId: command.callbackId
		)
	}
	
	//MARK: Utils
	private func unregister(_ mmNotificationName: String) {
		guard let observer = notificationObserver else {
			return
		}
		
		NotificationCenter.default.removeObserver(observer, name: NSNotification.Name(rawValue: mmNotificationName), object: nil)
		notificationObserver = nil
	}
	
	private func register(forEvents events: Set<String>, callbackId: String) {
		for event in events {
			guard let mmNotificationName = mmNotifications?[event] else {
				continue
			}

			unregister(mmNotificationName)
			notificationObserver = NotificationCenter.default.addObserver(forName: NSNotification.Name(rawValue: mmNotificationName), object: nil, queue: nil) { (notification) in
				var notificationResult:CDVPluginResult?
				switch mmNotificationName {
				case MMNotificationMessageReceived:
					if let message = notification.userInfo?[MMNotificationKeyMessage] as? MTMessage {
						notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [event, message.dictionary()])
					}
				case MMNotificationDeviceTokenReceived:
					if let token = notification.userInfo?[MMNotificationKeyDeviceToken] as? String {
						notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [event, token])
					}
				case MMNotificationRegistrationUpdated:
					if let internalId = notification.userInfo?[MMNotificationKeyRegistrationInternalId] as? String {
						notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [event, internalId])
					}
				case MMNotificationGeographicalRegionDidEnter:
					if let region = notification.userInfo?[MMNotificationKeyGeographicalRegion] as? MMRegion {
						notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [event, region.dictionary()])
					}
				case MMNotificationMessageTapped:
					if let message = notification.userInfo?[MMNotificationKeyMessage] as? MTMessage {
						notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [event, message.dictionary()])
					}
				default: break
				}
				
				notificationResult?.setKeepCallbackAs(true)
				self.commandDelegate?.send(notificationResult, callbackId: callbackId)
			}
		}
	}
}

extension MTMessage {
	override func dictionary() -> [String: Any] {
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

extension BaseMessage {
	class func createFrom(dictionary: [String: Any]) -> BaseMessage? {
		guard let messageId = dictionary["messageId"] as? String,
			let originalPayload = dictionary["originalPayload"] as? StringKeyPayload,
			let receivedTimestamp = dictionary["receivedTimestamp"] as? TimeInterval else
		{
			return nil
		}
		
		let createdDate = Date(timeIntervalSince1970: receivedTimestamp)
		return BaseMessage(messageId: messageId, direction: MessageDirection.MT, originalPayload: originalPayload, createdDate: createdDate)
	}
	
	func dictionary() -> [String: Any] {
		var result = [String: Any]()
		result["messageId"] = messageId
		result["receivedTimestamp"] = createdDate.timeIntervalSince1970
		result["customData"] = originalPayload["customPayload"]
		result["originalPayload"] = originalPayload
		
		if let aps = originalPayload["aps"] as? StringKeyPayload {
			result["body"] = aps["body"]
			result["sound"] = aps["sound"]
		}
		
		if let internalData = originalPayload["internalData"] as? StringKeyPayload,
			let _ = internalData["silent"] as? StringKeyPayload {
			result["silent"] = true
		} else if let silent = originalPayload["silent"] as? Bool {
			result["silent"] = silent
		}
		
		return result
	}
}

extension MMUser {

	static var dateFormatter: DateFormatter = {
		let dateFormatter = DateFormatter()
		dateFormatter.locale = Locale(identifier: "en_US_POSIX")
		dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"
		return dateFormatter
	}()
	
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
				if let date = dateFormatter.date(from: string) {
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
		
		var customDictionary = [String: Any]()
		for (key, value) in customData {
			if let number = value.number {
				customDictionary[key] = number
			} else if let date = value.date {
				customDictionary[key] = dateFormatter.string(from: date as Date)
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
		return result
	}
}

class MessageStorageAdapter: MessageStorage {
	var registeredCallbacks = [String: String]()
	let queue = DispatchQueue(label: "MessageStoreAdapterQueue")
	let findSemaphore = DispatchSemaphore(value: 0)
	let plugin: CDVPlugin
	var foundMessage:BaseMessage?
	
	init(plugin: CDVPlugin) {
		self.plugin = plugin
	}
	
	func start() {
		sendCallback(for: "messageStorage.start")
	}
	
	func stop() {
		sendCallback(for: "messageStorage.stop")
	}
	
	func insert(incoming messages: [MTMessage]) {
		sendCallback(for: "messageStorage.save", withArray: messages.map({
			$0.dictionary()
		}))
	}
	
	func findMessage(withId messageId: MessageId) -> BaseMessage? {
		queue.sync() {
			sendCallback(for: "messageStorage.find", withMessage: messageId)
			findSemaphore.wait(wallTimeout: DispatchWallTime.now() + DispatchTimeInterval.seconds(30))
		}
		return foundMessage
	}
	
	func insert(outgoing messages: [MOMessage]) {
		// MO not supported yet
	}
	
	func update(messageSeenStatus status: MMSeenStatus, for messageId: MessageId) {
		// Message seen status not supported
	}
	
	func update(deliveryReportStatus isDelivered: Bool, for messageId: MessageId) {
		// Delivery report status not supported
	}
	
	func update(messageSentStatus status: MOMessageSentStatus, for messageId: MessageId) {
		// MO not supported
	}
	
	func register(_ command: CDVInvokedUrlCommand) {
		let callbackId = command.callbackId
		let pluginResult = CDVPluginResult(status: CDVCommandStatus_ERROR)
		guard let event = command.arguments[0] as? String else {
			plugin.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
			return
		}
		
		queue.sync() {
			registeredCallbacks[event] = callbackId
		}
	}
	
	func unregister(_ command: CDVInvokedUrlCommand) {
		let pluginResult = CDVPluginResult(status: CDVCommandStatus_ERROR)
		guard let event = command.arguments[0] as? String else {
			plugin.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
			return
		}
		
		queue.sync() {
			registeredCallbacks.removeValue(forKey: event)
		}
	}
	
	func findResult(_ command: CDVInvokedUrlCommand) {
		let pluginResult = CDVPluginResult(status: CDVCommandStatus_ERROR)
		guard let dictionary = command.arguments[0] as? [String: Any] else {
			plugin.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
			return
		}
		
		foundMessage = BaseMessage.createFrom(dictionary: dictionary)
		findSemaphore.signal()
	}
	
	func sendCallback(for method: String, withArray array: [Any] = []) {
		guard let callbackId = registeredCallbacks[method] else {
			return
		}
		
		let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: array)
		result?.setKeepCallbackAs(true)
		plugin.commandDelegate?.send(result, callbackId: callbackId)
	}
	
	func sendCallback(for method: String, withMessage string: String) {
		guard let callbackId = registeredCallbacks[method] else {
			return
		}
		
		let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: string)
		result?.setKeepCallbackAs(true)
		plugin.commandDelegate?.send(result, callbackId: callbackId)
	}
}
