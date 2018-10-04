
import Foundation
import UIKit
import MobileMessaging
import Dispatch

class MMConfiguration {
	struct Keys {
		static let privacySettings = "privacySettings"
		static let userDataPersistingDisabled = "userDataPersistingDisabled"
		static let carrierInfoSendingDisabled = "carrierInfoSendingDisabled"
		static let systemInfoSendingDisabled = "systemInfoSendingDisabled"
		static let applicationCodePersistingDisabled = "applicationCodePersistingDisabled"
		static let geofencingEnabled = "geofencingEnabled"
		static let applicationCode = "applicationCode"
		static let forceCleanup = "forceCleanup"
		static let logging = "logging"
		static let defaultMessageStorage = "defaultMessageStorage"
		static let notificationTypes = "notificationTypes"
		static let messageStorage = "messageStorage"
		static let cordovaPluginVersion = "cordovaPluginVersion"
		static let notificationExtensionAppGroupId = "notificationExtensionAppGroupId"
		static let notificationCategories = "notificationCategories"
	}
	
	let appCode: String
	let geofencingEnabled: Bool
	let messageStorageEnabled: Bool
	let defaultMessageStorage: Bool
	let notificationType: UserNotificationType
	let forceCleanup: Bool
	let logging: Bool
	let privacySettings: [String: Any]
	let cordovaPluginVersion: String
	let notificationExtensionAppGroupId: String?
	let categories: [NotificationCategory]?
	
	init?(rawConfig: [String: AnyObject]) {
		guard let appCode = rawConfig[MMConfiguration.Keys.applicationCode] as? String,
			let ios = rawConfig["ios"] as? [String: AnyObject] else
		{
			return nil
		}
		
		self.appCode = appCode
		self.geofencingEnabled = rawConfig[MMConfiguration.Keys.geofencingEnabled].unwrap(orDefault: false)
		self.forceCleanup = ios[MMConfiguration.Keys.forceCleanup].unwrap(orDefault: false)
		self.logging = ios[MMConfiguration.Keys.logging].unwrap(orDefault: false)
		self.defaultMessageStorage = rawConfig[MMConfiguration.Keys.defaultMessageStorage].unwrap(orDefault: false)
		self.messageStorageEnabled = rawConfig[MMConfiguration.Keys.messageStorage] != nil ? true : false
		self.notificationExtensionAppGroupId = ios[MMConfiguration.Keys.notificationExtensionAppGroupId] as? String
		
		if let rawPrivacySettings = rawConfig[MMConfiguration.Keys.privacySettings] as? [String: Any] {
			var ps = [String: Any]()
			ps[MMConfiguration.Keys.userDataPersistingDisabled] = rawPrivacySettings[MMConfiguration.Keys.userDataPersistingDisabled].unwrap(orDefault: false)
			ps[MMConfiguration.Keys.carrierInfoSendingDisabled] = rawPrivacySettings[MMConfiguration.Keys.carrierInfoSendingDisabled].unwrap(orDefault: false)
			ps[MMConfiguration.Keys.systemInfoSendingDisabled] = rawPrivacySettings[MMConfiguration.Keys.systemInfoSendingDisabled].unwrap(orDefault: false)
			ps[MMConfiguration.Keys.applicationCodePersistingDisabled] = rawPrivacySettings[MMConfiguration.Keys.applicationCodePersistingDisabled].unwrap(orDefault: false)
			
			privacySettings = ps
		} else {
			privacySettings = [:]
		}
		
		self.cordovaPluginVersion = rawConfig[MMConfiguration.Keys.cordovaPluginVersion].unwrap(orDefault: "unknown")
		
		self.categories = (rawConfig[MMConfiguration.Keys.notificationCategories] as? [[String: Any]])?.flatMap(NotificationCategory.init)
		
		if let notificationTypeNames =  ios[MMConfiguration.Keys.notificationTypes] as? [String] {
			let options = notificationTypeNames.reduce([], { (result, notificationTypeName) -> [UserNotificationType] in
				var result = result
				switch notificationTypeName {
				case "badge": result.append(UserNotificationType.badge)
				case "sound": result.append(UserNotificationType.sound)
				case "alert": result.append(UserNotificationType.alert)
				default: break
				}
				return result
			})
			
			self.notificationType = UserNotificationType(options: options)
		} else {
			self.notificationType = UserNotificationType.none
		}
	}
}

fileprivate class MobileMessagingEventsManager {
	private var plugin: MobileMessagingCordova!
	private typealias CallbackId = String
	private typealias CordovaEventName = String
	private typealias CallbackData = (cordovaCallbackId: CallbackId, cordovaEventName: CordovaEventName)
	private typealias MMNotificationNameString = String
	private var notificationCallbacks = [MMNotificationNameString: CallbackData]()
	private var cachedMobileMessagingNotifications = [Notification]()
	
	/// Must be in sync with `supportedEvents` (MobileMessagingCordova.js)
	private let supportedNotifications: [String: String] = [
		"messageReceived": MMNotificationMessageReceived,
		"tokenReceived":  MMNotificationDeviceTokenReceived,
		"registrationUpdated":  MMNotificationRegistrationUpdated,
		"geofenceEntered": MMNotificationGeographicalRegionDidEnter,
		"notificationTapped": MMNotificationMessageTapped,
		"actionTapped": MMNotificationActionTapped,
		"primaryChanged": MMNotificationPrimaryDeviceSettingUpdated
	]
	
	init(plugin: MobileMessagingCordova) {
		self.plugin = plugin
		setupObservingMMNotifications()
	}
	
	func start() {
		setupObservingMMNotifications()
		cachedMobileMessagingNotifications.forEach { (n) in
			handleMMNotification(n: n)
		}
		cachedMobileMessagingNotifications = []
	}
	
	func stop() {
		setupObservingMMNotifications(stopObservations: true)
		cachedMobileMessagingNotifications = []
	}
	
	func registerReceiver(_ command: CDVInvokedUrlCommand) {
		if let events = command.arguments[0] as? [String] {
			register(forEvents: Set(events), callbackId: command.callbackId)
		}
	}
	
	private func setupObservingMMNotifications(stopObservations: Bool = false) {
		supportedNotifications.forEach { (kv) in
			let name = NSNotification.Name(rawValue: kv.value)
			NotificationCenter.default.removeObserver(self, name: name, object: nil)
			if !stopObservations {
				NotificationCenter.default.addObserver(self, selector: #selector(MobileMessagingEventsManager.handleMMNotification(n:)), name: name, object: nil)
			}
		}
	}
	
	private func register(forEvents events: Set<String>, callbackId: CallbackId) {
		events.flatMap({ (cordovaEventName: CordovaEventName) -> (nName: MMNotificationNameString, callbackData: CallbackData)? in
			guard let mmNotificationNameString = supportedNotifications[cordovaEventName] else {
				return nil
			}
			
			return (mmNotificationNameString, (callbackId, cordovaEventName))
		}).forEach({ (notificatinCallbackDataTuple) in
			self.register(callbackData: notificatinCallbackDataTuple.callbackData, forMMNotificationNameString: notificatinCallbackDataTuple.nName)
		})
	}
	
	@objc func handleMMNotification(n: Notification) {
		if plugin.isStarted == false {
			cachedMobileMessagingNotifications.append(n)
		}
		guard let callbackData = notificationCallbacks[n.name.rawValue] else {
			return
		}
		handleMMNotification(cordovaEventName: callbackData.cordovaEventName, callbackId: callbackData.cordovaCallbackId, notification: n)
	}
	
	private func handleMMNotification(cordovaEventName: String, callbackId: String, notification: Notification) {
		var notificationResult: CDVPluginResult?
		switch notification.name.rawValue {
		case MMNotificationMessageReceived:
			if let message = notification.userInfo?[MMNotificationKeyMessage] as? MTMessage {
				notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, message.dictionary()])
			}
		case MMNotificationDeviceTokenReceived:
			if let token = notification.userInfo?[MMNotificationKeyDeviceToken] as? String {
				notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, token])
			}
		case MMNotificationRegistrationUpdated:
			if let internalId = notification.userInfo?[MMNotificationKeyRegistrationInternalId] as? String {
				notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, internalId])
			}
		case MMNotificationGeographicalRegionDidEnter:
			if let region = notification.userInfo?[MMNotificationKeyGeographicalRegion] as? MMRegion {
				notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, region.dictionary()])
			}
		case MMNotificationMessageTapped:
			if let message = notification.userInfo?[MMNotificationKeyMessage] as? MTMessage {
				notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, message.dictionary()])
			}
		case MMNotificationActionTapped:
			if let message = notification.userInfo?[MMNotificationKeyMessage] as? MTMessage, let actionIdentifier = notification.userInfo?[MMNotificationKeyActionIdentifier] as? String {
				var parameters = [cordovaEventName, message.dictionary(), actionIdentifier] as [Any]
				if let textInput = notification.userInfo?[MMNotificationKeyActionTextInput] as? String {
					parameters.append(textInput)
				}
				notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: parameters)
			}
		case MMNotificationPrimaryDeviceSettingUpdated:
			notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName])
		default: break
		}
		
		notificationResult?.setKeepCallbackAs(true)
		
		plugin.commandDelegate?.send(notificationResult, callbackId: callbackId)
	}
	
	private func register(callbackData: CallbackData, forMMNotificationNameString mmNotificationNameString: String) {
		notificationCallbacks[mmNotificationNameString] = callbackData
	}
}

@objcMembers
@objc(MobileMessagingCordova) class MobileMessagingCordova : CDVPlugin {
	private var messageStorageAdapter: MessageStorageAdapter?
	private var eventsManager: MobileMessagingEventsManager?
	fileprivate var isStarted: Bool = false
	
	private struct Constants {
		static let cordovaConfigKey = "com.mobile-messaging.corodovaPluginConfiguration"
	}
	
	override func pluginInitialize() {
		super.pluginInitialize()
		self.messageStorageAdapter = MessageStorageAdapter(plugin: self)
		MobileMessagingCordovaApplicationDelegate.install()
		self.eventsManager = MobileMessagingEventsManager(plugin: self)
		performEarlyStartIfPossible()
	}
	
	@objc(init:) func start(command: CDVInvokedUrlCommand) {
		guard let userConfigDict = command.arguments[0] as? [String: AnyObject],
			let userConfiguration = MMConfiguration(rawConfig: userConfigDict) else
		{
			let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Can't parse configuration")
			self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
			return
		}
		
		if let cachedConfigDict = UserDefaults.standard.object(forKey: MobileMessagingCordova.Constants.cordovaConfigKey) as? [String: AnyObject], (userConfigDict as NSDictionary) != (cachedConfigDict as NSDictionary)
		{
			// this `start(:)` is called from JS, it happens later after `pluginInitialize` called, here we may have most relevant configuration for the plugin. In case the configuration has changes we restart the MobileMessaging library (stop-start)
			stop()
			start(configuration: userConfiguration)
		} else if UserDefaults.standard.object(forKey: MobileMessagingCordova.Constants.cordovaConfigKey) == nil {
			// this `start(:)` should be called when there is no cached configuration and library was not started from `pluginInitialize`
			start(configuration: userConfiguration)
		}
		
		// always store the configuration provided by the user
		UserDefaults.standard.set(userConfigDict, forKey: MobileMessagingCordova.Constants.cordovaConfigKey)
		
		// this procedure guarantees delivery for the library events in cases when JavaScript environment set itself up later than real native events happen.
		eventsManager?.start()
		
		isStarted = true
		commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
	}
	
	func registerReceiver(_ command: CDVInvokedUrlCommand) {
		eventsManager?.registerReceiver(command)
		
		let result = CDVPluginResult(status: CDVCommandStatus_OK)
		result?.setKeepCallbackAs(true)
		commandDelegate?.send(result, callbackId: command.callbackId)
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
	
	func logout(_ command: CDVInvokedUrlCommand) {
		MobileMessaging.logout()
		self.commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
	}

	func setPrimary(_ command: CDVInvokedUrlCommand) {
		guard let isPrimary = command.arguments[0] as? Bool else {
			let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Cannot retrieve isPrimary parameter")
			commandDelegate?.send(errorResult, callbackId: command.callbackId)
			return
		}
		MobileMessaging.setAsPrimaryDevice(isPrimary)
		self.commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
	}

	func isPrimary(_ command: CDVInvokedUrlCommand) {
		self.commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK, messageAs: MobileMessaging.isPrimaryDevice), callbackId: command.callbackId)
	}

	func syncPrimary(_ command: CDVInvokedUrlCommand) {
		MobileMessaging.currentInstallation?.syncPrimarySettingWithServer()
		self.commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
	}

	func enablePushRegistration(_ command: CDVInvokedUrlCommand) {
		MobileMessaging.enablePushRegistration()
		self.commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
	}
	
	func disablePushRegistration(_ command: CDVInvokedUrlCommand) {
		MobileMessaging.disablePushRegistration()
		self.commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
	}

	func getPushRegistrationId(_ command: CDVInvokedUrlCommand) {
		self.commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK, messageAs: MobileMessaging.currentUser?.pushRegistrationId), callbackId: command.callbackId)
	}
	
	func isPushRegistrationEnabled(_ command: CDVInvokedUrlCommand) {
		self.commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK, messageAs: MobileMessaging.isPushRegistrationEnabled), callbackId: command.callbackId)
	}
	
	func markMessagesSeen(_ command: CDVInvokedUrlCommand) {
		guard let messageIds = command.arguments as? [String] else {
			let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Cannot retrieve message ids")
			commandDelegate?.send(errorResult, callbackId: command.callbackId)
			return
		}
		
		if (messageIds.isEmpty) {
			let errorResult = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "No message ids provided")
			commandDelegate?.send(errorResult, callbackId: command.callbackId)
			return
		}
		
		MobileMessaging.setSeen(messageIds: messageIds)
		let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: messageIds)
		commandDelegate?.send(successResult, callbackId: command.callbackId)
	}
	
	//MARK: MessageStorage
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
			commandDelegate?.send(errorResult, callbackId: command.callbackId)
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
			commandDelegate?.send(errorResult, callbackId: command.callbackId)
			return
		}
		
		MobileMessaging.defaultMessageStorage?.remove(withIds: [messageId]) { _ in
			self.commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
		}
	}
	
	func defaultMessageStorage_deleteAll(_ command: CDVInvokedUrlCommand) {
		MobileMessaging.defaultMessageStorage?.removeAllMessages() { _ in
			self.commandDelegate?.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
		}
	}
	
	//MARK: Utils
	
	private func performEarlyStartIfPossible() {
		if let configDict = UserDefaults.standard.object(forKey: MobileMessagingCordova.Constants.cordovaConfigKey) as? [String: AnyObject],
			let configuration = MMConfiguration(rawConfig: configDict),
			!isStarted
		{
			start(configuration: configuration)
		}
	}
	
	private func start(configuration: MMConfiguration) {
		MobileMessaging.privacySettings.applicationCodePersistingDisabled = configuration.privacySettings[MMConfiguration.Keys.applicationCodePersistingDisabled].unwrap(orDefault: false)
		MobileMessaging.privacySettings.systemInfoSendingDisabled = configuration.privacySettings[MMConfiguration.Keys.systemInfoSendingDisabled].unwrap(orDefault: false)
		MobileMessaging.privacySettings.carrierInfoSendingDisabled = configuration.privacySettings[MMConfiguration.Keys.carrierInfoSendingDisabled].unwrap(orDefault: false)
		MobileMessaging.privacySettings.userDataPersistingDisabled = configuration.privacySettings[MMConfiguration.Keys.userDataPersistingDisabled].unwrap(orDefault: false)
		
		var mobileMessaging = MobileMessaging.withApplicationCode(configuration.appCode, notificationType: configuration.notificationType, forceCleanup: configuration.forceCleanup)
		
		if configuration.geofencingEnabled {
			mobileMessaging = mobileMessaging?.withGeofencingService()
		}
		if let storageAdapter = messageStorageAdapter, configuration.messageStorageEnabled {
			mobileMessaging = mobileMessaging?.withMessageStorage(storageAdapter)
		} else if configuration.defaultMessageStorage {
			mobileMessaging = mobileMessaging?.withDefaultMessageStorage()
		}
		if #available(iOS 10.0, *), let notificationExtensionAppGroupId = configuration.notificationExtensionAppGroupId, !notificationExtensionAppGroupId.isEmpty {
			mobileMessaging = mobileMessaging?.withAppGroupId(notificationExtensionAppGroupId)
		}
		if let categories = configuration.categories {
			mobileMessaging = mobileMessaging?.withInteractiveNotificationCategories(Set(categories))
		}
		MobileMessaging.userAgent.cordovaPluginVersion = configuration.cordovaPluginVersion
		if (configuration.logging) {
			MobileMessaging.logger = MMDefaultLogger()
		}
		mobileMessaging?.start()
		MobileMessaging.sync()
	}
	
	private func stop() {
		MobileMessaging.stop()
		eventsManager?.stop()
		isStarted = false
	}
}

extension MTMessage {
	override func dictionary() -> [String: Any] {
		var result = [String: Any]()
		result["messageId"] = messageId
		result["body"] = text
		result["sound"] = sound
		result["silent"] = isSilent
		result["receivedTimestamp"] = UInt64(sendDateTime * 1000)
		result["customPayload"] = customPayload
		result["originalPayload"] = originalPayload
		result["contentUrl"] = contentUrl
		result["seen"] = seenStatus != .NotSeen
		result["seenDate"] = seenDate?.timeIntervalSince1970
		result["geo"] = isGeoMessage
		return result
	}
	
	var isGeoMessage: Bool {
		let geoAreasDicts = (originalPayload["internalData"] as? [String: Any])?["geo"] as? [[String: Any]]
		return geoAreasDicts != nil
	}
	
}

extension BaseMessage {
	class func createFrom(dictionary: [String: Any]) -> BaseMessage? {
		guard let messageId = dictionary["messageId"] as? String,
			let originalPayload = dictionary["originalPayload"] as? StringKeyPayload else
		{
			return nil
		}
		
        return BaseMessage(messageId: messageId, direction: MessageDirection.MT, originalPayload: originalPayload, deliveryMethod: .undefined)
	}
	
	func dictionary() -> [String: Any] {
		var result = [String: Any]()
		result["messageId"] = messageId
		result["customPayload"] = originalPayload["customPayload"]
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
	
	static var dateYMDFormatter: DateFormatter = {
		let result = DateFormatter()
		result.locale = Locale(identifier: "en_US_POSIX")
		result.dateFormat = "yyyy-MM-dd"
		result.timeZone = TimeZone(secondsFromGMT: 0)
		return result
	}()
	
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
			MMUserPredefinedDataKeys.Email: "email"
		]
	}
	
	func set(dictionary: [String:AnyObject?]) {
		if let userMsisdn = dictionary["msisdn"] as? String? {
			self.msisdn = userMsisdn
		}
		
		if let userFirstName = dictionary["firstName"] as? String? {
			self.firstName = userFirstName
		}
		
		if let userLastName = dictionary["lastName"] as? String? {
			self.lastName = userLastName
		}
		
		if let userMiddleName = dictionary["middleName"] as? String? {
			self.middleName = userMiddleName
		}
		
		if let userGender = dictionary["gender"] as? String? {
			if (userGender == "F") {
				self.gender = UserGender.Female
			} else if (userGender == "M") {
				self.gender = UserGender.Male
			} else {
				self.gender = nil
			}
		}
		
		if let userBirthdate = dictionary["birthdate"] as? String {
			self.birthdate = MMUser.dateFormatter.date(from: userBirthdate)
		} else {
			self.birthdate = nil
		}
		
		if let userEmail = dictionary["email"] as? String? {
			self.email = userEmail
		}
		
		if let externalUserId = dictionary["externalUserId"] as? String? {
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
				if let date = MMUser.dateFormatter.date(from: string) {
					set(customData: CustomUserDataValue(date: date as NSDate), forKey: key)
				} else {
					set(customData: CustomUserDataValue(string: string), forKey: key)
				}
			}
		}
	}
	
	func dictionary() -> [String: Any] {
		var result = [String: Any]()
		
		if let msisdn = MobileMessaging.currentUser?.msisdn {
			result["msisdn"] = msisdn
		}
		
		if let firstName = MobileMessaging.currentUser?.firstName {
			result["firstName"] = firstName
		}
		
		if let lastName = MobileMessaging.currentUser?.lastName {
			result["lastName"] = lastName
		}
		
		if let middleName = MobileMessaging.currentUser?.middleName {
			result["middleName"] = middleName
		}
		
		if let gender = MobileMessaging.currentUser?.gender {
			switch gender {
			case .Female:
				result["gender"] = "F"
			case .Male:
				result["gender"] = "M"
			}
		}
		
		if let birthdate = MobileMessaging.currentUser?.birthdate {
			result["birthdate"] = MMUser.dateYMDFormatter.string(from: birthdate as Date)
		}
		
		if let email = MobileMessaging.currentUser?.email {
			result["email"] = email
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
				customDictionary[key] = MMUser.dateFormatter.string(from: date as Date)
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
	
	func insert(outgoing messages: [BaseMessage], completion: @escaping () -> Void) {
		// MO not supported yet
	}
	
	func insert(incoming messages: [BaseMessage], completion: @escaping () -> Void) {
		sendCallback(for: "messageStorage.save", withArray: messages.map({
			$0.dictionary()
		}))
	}
	
	func update(messageSeenStatus status: MMSeenStatus, for messageId: MessageId, completion: @escaping () -> Void) {
		// Message seen status not supported
	}
	
	func update(deliveryReportStatus isDelivered: Bool, for messageId: MessageId, completion: @escaping () -> Void) {
		// Delivery report status not supported
	}
	
	func update(messageSentStatus status: MOMessageSentStatus, for messageId: MessageId, completion: @escaping () -> Void) {
		// MO not supported
	}
	
	func findMessage(withId messageId: MessageId) -> BaseMessage? {
		queue.sync() {
			sendCallback(for: "messageStorage.find", withMessage: messageId)
			_ = findSemaphore.wait(wallTimeout: DispatchWallTime.now() + DispatchTimeInterval.seconds(30))
		}
		return foundMessage
	}
    
    func findAllMessageIds(completion: @escaping ([String]) -> Void) {
        // chat not supported yet
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
		
		_ = queue.sync {
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

extension Optional {
	func unwrap<T>(orDefault fallbackValue: T) -> T {
		switch self {
		case .some(let val as T):
			return val
		default:
			return fallbackValue
		}
	}
}
