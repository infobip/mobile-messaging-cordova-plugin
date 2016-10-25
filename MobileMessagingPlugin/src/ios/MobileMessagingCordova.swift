
import Foundation
import UIKit
import MobileMessaging

class MMConfiguration {
	let appCode: String
	var notificationType: UIUserNotificationType = []
	init?(rawConfig: [String: AnyObject]) {
		guard let appCode = rawConfig["applicationCode"] as? String,
			let ios = rawConfig["ios"] as? [String: AnyObject] else {
				return nil
		}
		self.appCode = appCode
		
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
		MobileMessaging.withApplicationCode(configuration.appCode, notificationType: configuration.notificationType).start()
		
		let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK)
		self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
	}
	
	func register(command: CDVInvokedUrlCommand) {
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
			var result: [String: Any]?
			switch mmNotificationName {
			case MMNotificationMessageReceived:
				if let userInfo = notification.userInfo,
					let message = userInfo[MMNotificationKeyMessage] as? MTMessage {
					result = message.dictionary()
				}
			case MMNotificationDeviceTokenReceived:
				if let userInfo = notification.userInfo,
					let token = userInfo[MMNotificationKeyDeviceToken] as? String {
					result = ["token": token]
				}
			case MMNotificationRegistrationUpdated:
				if let userInfo = notification.userInfo,
					let internalId = userInfo[MMNotificationKeyRegistrationInternalId] as? String {
					result = ["internalId": internalId]
				}
			default: break
			}
			let notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: result)
			notificationResult?.setKeepCallbackAs(true)
			self.commandDelegate?.send(notificationResult, callbackId: callbackId)
		}
		
		notificationObservers?[mmNotificationName] = observer
	}
	
	func unregister(command: CDVInvokedUrlCommand) {
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
		case "tokenReceived" : return MMNotificationKeyDeviceToken
		case "registrationUpdated" : return MMNotificationRegistrationUpdated
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
