//
//  MobileMessagingCordova.swift
//  MobileMessagingCordova
//
// Copyright (c) 2016-2025 Infobip Limited
// Licensed under the Apache License, Version 2.0
//

import Foundation
import UIKit
import MobileMessaging
import Dispatch

class MMConfiguration {
    static let cordovaConfigKey = "com.mobile-messaging.corodovaPluginConfiguration"
    struct Keys {
        static let privacySettings = "privacySettings"
        static let userDataPersistingDisabled = "userDataPersistingDisabled"
        static let carrierInfoSendingDisabled = "carrierInfoSendingDisabled"
        static let systemInfoSendingDisabled = "systemInfoSendingDisabled"
        static let inAppChatEnabled = "inAppChatEnabled"
        static let fullFeaturedInAppsEnabled = "fullFeaturedInAppsEnabled"
        static let applicationCode = "applicationCode"
        static let forceCleanup = "forceCleanup"
        static let logging = "loggingEnabled"
        static let defaultMessageStorage = "defaultMessageStorage"
        static let notificationTypes = "notificationTypes"
        static let messageStorage = "messageStorage"
        static let cordovaPluginVersion = "cordovaPluginVersion"
        static let notificationCategories = "notificationCategories"
        static let webViewSettings = "webViewSettings"
        static let registeringForRemoteNotificationsDisabled = "registeringForRemoteNotificationsDisabled"
        static let overridingNotificationCenterDelegateDisabled = "overridingNotificationCenterDelegateDisabled"
        static let unregisteringForRemoteNotificationsDisabled = "unregisteringForRemoteNotificationsDisabled"
        static let userDataJwt = "userDataJwt"
        static let trustedDomains = "trustedDomains"
    }

    static let ignoreKeysWhenComparing: [String] = [Keys.applicationCode, Keys.cordovaPluginVersion]

    let inAppChatEnabled: Bool
    let fullFeaturedInAppsEnabled: Bool
    let messageStorageEnabled: Bool
    let defaultMessageStorage: Bool
    let notificationType: MMUserNotificationType
    let forceCleanup: Bool
    let logging: Bool
    let privacySettings: [String: Any]
    let cordovaPluginVersion: String
    let categories: [MMNotificationCategory]?
    let webViewSettings: [String: AnyObject]?
    let registeringForRemoteNotificationsDisabled: Bool
    let overridingNotificationCenterDelegateDisabled: Bool
    let unregisteringForRemoteNotificationsDisabled: Bool
    let userDataJwt: String?
    let trustedDomains: [String]?

    init?(rawConfig: [String: AnyObject]) {
        guard let ios = rawConfig["ios"] as? [String: AnyObject] else
        {
            return nil
        }

        self.inAppChatEnabled = rawConfig[MMConfiguration.Keys.inAppChatEnabled].unwrap(orDefault: false)
        self.fullFeaturedInAppsEnabled = rawConfig[MMConfiguration.Keys.fullFeaturedInAppsEnabled].unwrap(orDefault: false)
        self.forceCleanup = ios[MMConfiguration.Keys.forceCleanup].unwrap(orDefault: false)
        self.logging = rawConfig[MMConfiguration.Keys.logging].unwrap(orDefault: false)
        self.defaultMessageStorage = rawConfig[MMConfiguration.Keys.defaultMessageStorage].unwrap(orDefault: false)
        self.messageStorageEnabled = rawConfig[MMConfiguration.Keys.messageStorage] != nil ? true : false
        self.registeringForRemoteNotificationsDisabled = ios[MMConfiguration.Keys.registeringForRemoteNotificationsDisabled].unwrap(orDefault: false)
        self.overridingNotificationCenterDelegateDisabled = ios[MMConfiguration.Keys.overridingNotificationCenterDelegateDisabled].unwrap(orDefault: false)
        self.unregisteringForRemoteNotificationsDisabled = ios[MMConfiguration.Keys.unregisteringForRemoteNotificationsDisabled].unwrap(orDefault: false)
        self.userDataJwt = rawConfig[MMConfiguration.Keys.userDataJwt].unwrap(orDefault: nil)
        self.trustedDomains = rawConfig[MMConfiguration.Keys.trustedDomains] as? [String]

        if let rawPrivacySettings = rawConfig[MMConfiguration.Keys.privacySettings] as? [String: Any] {
            var ps = [String: Any]()
            ps[MMConfiguration.Keys.userDataPersistingDisabled] = rawPrivacySettings[MMConfiguration.Keys.userDataPersistingDisabled].unwrap(orDefault: false)
            ps[MMConfiguration.Keys.carrierInfoSendingDisabled] = rawPrivacySettings[MMConfiguration.Keys.carrierInfoSendingDisabled].unwrap(orDefault: false)
            ps[MMConfiguration.Keys.systemInfoSendingDisabled] = rawPrivacySettings[MMConfiguration.Keys.systemInfoSendingDisabled].unwrap(orDefault: false)

            self.privacySettings = ps
        } else {
            self.privacySettings = [:]
        }

        self.cordovaPluginVersion = rawConfig[MMConfiguration.Keys.cordovaPluginVersion].unwrap(orDefault: "unknown")

        self.categories = (rawConfig[MMConfiguration.Keys.notificationCategories] as? [[String: Any]])?.compactMap(MMNotificationCategory.init)

        if let notificationTypeNames =  ios[MMConfiguration.Keys.notificationTypes] as? [String] {
            let options = notificationTypeNames.reduce([], { (result, notificationTypeName) -> [MMUserNotificationType] in
                var result = result
                switch notificationTypeName {
                case "badge": result.append(MMUserNotificationType.badge)
                case "sound": result.append(MMUserNotificationType.sound)
                case "alert": result.append(MMUserNotificationType.alert)
                default: break
                }
                return result
            })

            self.notificationType = MMUserNotificationType(options: options)
        } else {
            self.notificationType = MMUserNotificationType.none
        }

        if let rawWebViewSettings = ios[MMConfiguration.Keys.webViewSettings] as? [String: AnyObject] {
            self.webViewSettings = rawWebViewSettings
        } else {
            self.webViewSettings = nil
        }
    }

    static func saveConfigToDefaults(rawConfig: [String: AnyObject]) {
        UserDefaults.standard.set(rawConfig, forKey: cordovaConfigKey)
    }

    static func getConfigFromDefaults() -> [String: AnyObject]? {
        return UserDefaults.standard.object(forKey: cordovaConfigKey) as? [String: AnyObject]
    }

    static func didConfigurationChange(userConfigDict: [String: AnyObject]) -> Bool {
        var userConfigDict = userConfigDict
        if var cachedConfigDict = getConfigFromDefaults() {
            userConfigDict.remove(keys: ignoreKeysWhenComparing)
            cachedConfigDict.remove(keys: ignoreKeysWhenComparing)

            return (userConfigDict as NSDictionary) != (cachedConfigDict as NSDictionary)
        }
        return false
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
        "notificationTapped": MMNotificationMessageTapped,
        "actionTapped": MMNotificationActionTapped,
        "depersonalized": MMNotificationDepersonalized,
        "personalized": MMNotificationPersonalized,
        "installationUpdated": MMNotificationInstallationSynced,
        "userUpdated": MMNotificationUserSynced,
        "deeplink": NSNotification.Name.CDVPluginHandleOpenURLWithAppSourceAndAnnotation.rawValue,
        "inAppChat.unreadMessageCounterUpdated": MMNotificationInAppChatUnreadMessagesCounterUpdated,
    ]
    
    struct InternalEvent {
        static let idKey = "internalEventId"
        static let chatJWTRequested = "inAppChat.internal.jwtRequested"
        static let chatExceptionReceived = "inAppChat.internal.exceptionReceived"
    }

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
        events.compactMap({ (cordovaEventName: CordovaEventName) -> (nName: MMNotificationNameString, callbackData: CallbackData)? in
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
        var notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName])
        switch notification.name.rawValue {
        case NSNotification.Name.CDVPluginHandleOpenURLWithAppSourceAndAnnotation.rawValue:
            if let dictionary = notification.object as? [String: Any],
                let url = dictionary["url"] as? URL {
                notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, url.absoluteString])
            }
        case MMNotificationMessageReceived:
            if let message = notification.userInfo?[MMNotificationKeyMessage] as? MM_MTMessage {
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
        case MMNotificationMessageTapped:
            if let message = notification.userInfo?[MMNotificationKeyMessage] as? MM_MTMessage {
                notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, message.dictionary()])
            }
        case MMNotificationActionTapped:
            if let message = notification.userInfo?[MMNotificationKeyMessage] as? MM_MTMessage, let actionIdentifier = notification.userInfo?[MMNotificationKeyActionIdentifier] as? String {
                var parameters = [cordovaEventName, message.dictionary(), actionIdentifier] as [Any]
                if let textInput = notification.userInfo?[MMNotificationKeyActionTextInput] as? String {
                    parameters.append(textInput)
                }
                notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: parameters)
            }
        case MMNotificationDepersonalized:
            notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName])
        case MMNotificationPersonalized:
            notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName])
        case MMNotificationInstallationSynced:
            if let installation = notification.userInfo?[MMNotificationKeyInstallation] as? MMInstallation {
                notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, installation.dictionaryRepresentation])
            }
        case MMNotificationUserSynced:
            if let user = notification.userInfo?[MMNotificationKeyUser] as? MMUser {
                notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, user.dictionaryRepresentation])
            }
        case MMNotificationInAppChatUnreadMessagesCounterUpdated:
            if let counter = notification.userInfo?[MMNotificationKeyInAppChatUnreadMessagesCounter] as? Int {
                notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, counter])
            }
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
    private var willUseChatExceptionHandler = false

    override func pluginInitialize() {
        super.pluginInitialize()
        self.messageStorageAdapter = MessageStorageAdapter(plugin: self)
        MobileMessagingPluginApplicationDelegate.install()
        self.eventsManager = MobileMessagingEventsManager(plugin: self)
        performEarlyStartIfPossible()
    }

    @objc(init:)
    func start(command: CDVInvokedUrlCommand) {
        guard var userConfigDict = command.arguments[0] as? [String: AnyObject],
            let applicationCode = userConfigDict.removeValue(forKey: MMConfiguration.Keys.applicationCode) as? String,
            let userConfiguration = MMConfiguration(rawConfig: userConfigDict) else
        {
            let errorResult = createErrorPluginResult(description: "Can't parse configuration")
            self.commandDelegate?.send(errorResult, callbackId: command.callbackId)
            return
        }

        let successCallback: () -> Void = { [weak self] in
            MMConfiguration.saveConfigToDefaults(rawConfig: userConfigDict)
            // this procedure guarantees delivery for the library events in cases when JavaScript environment set itself up later than real native events happen.
            self?.eventsManager?.start()
            self?.isStarted = true
            self?.commandDelegate?.sendSuccess(for: command)
        }

        let cachedConfigDict = MMConfiguration.getConfigFromDefaults()
        let shouldRestart = needsRestart(userConfigDict: userConfigDict, applicationCode: applicationCode)
        let shouldStart = cachedConfigDict == nil || MobileMessaging.getKeychainApplicationCode() == nil

        if shouldRestart
        {
            // this `start(:)` is called from JS, it happens later after `pluginInitialize` called, here we may have most relevant configuration for the plugin. In case the configuration has changes we restart the MobileMessaging library (stop-start)
            stop {
                self.start(configuration: userConfiguration, applicationCode: applicationCode, onSuccess: successCallback)
            }
        } else if shouldStart {
            // this `start(:)` should be called when there is no cached configuration and library was not started from `pluginInitialize`
            start(configuration: userConfiguration, applicationCode: applicationCode, onSuccess: successCallback)
        } else {
            successCallback()
        }
    }

    func registerReceiver(_ command: CDVInvokedUrlCommand) {
        eventsManager?.registerReceiver(command)

        let result = CDVPluginResult(status: CDVCommandStatus_OK)
        result?.setKeepCallbackAs(true)
        commandDelegate?.send(result, callbackId: command.callbackId)
    }

    func saveUser(_ command: CDVInvokedUrlCommand) {
        guard let userDataDictionary = command.arguments[0] as? [String: Any], let user = MMUser(dictRepresentation: userDataDictionary) else
        {
            self.commandDelegate?.send(errorText: "Could not retrieve user data from argument", for: command)
            return
        }

        MobileMessaging.saveUser(user, completion: { (error) in
            if let error = error {
                self.commandDelegate?.send(error: error, for: command)
            } else {
                self.commandDelegate?.send(dict: MobileMessaging.getUser()?.dictionaryRepresentation ?? [:], for: command)
            }
        })
    }

    func fetchUser(_ command: CDVInvokedUrlCommand) {
        MobileMessaging.fetchUser(completion: { (user, error) in
            if let error = error {
                self.commandDelegate?.send(error: error, for: command)
            } else {
                self.commandDelegate?.send(dict: MobileMessaging.getUser()?.dictionaryRepresentation ?? [:], for: command)
            }
        })
    }

    func getUser(_ command: CDVInvokedUrlCommand) {
        let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: MobileMessaging.getUser()?.dictionaryRepresentation)
        self.commandDelegate?.send(successResult, callbackId: command.callbackId)
    }

    func fetchInboxMessages(_ command: CDVInvokedUrlCommand) {
        guard let token = command.argument(at: 0) as? String,
              let extUserId = command.argument(at: 1) as? String else {
            self.commandDelegate?.send(errorText: "Could not retrieve inbox data from argument", for: command)
            return
        }

        let filters = MMInboxFilterOptions(dictRepresentation: command.argument(at: 2) as? [String : Any] ?? [:])

        MobileMessaging.inbox?.fetchInbox(token: token, externalUserId: extUserId, options: filters, completion: { (inbox, error) in
                   if let error = error {
                       self.commandDelegate?.send(error: error, for: command)
                   } else {
                       self.commandDelegate?.send(dict: inbox?.dictionary() ?? [:], for: command)
                   }
               })
    }

    func fetchInboxMessagesWithoutToken(_ command: CDVInvokedUrlCommand) {
        guard let extUserId = command.argument(at: 0) as? String else {
                self.commandDelegate?.send(errorText: "Could not retrieve inbox data from argument", for: command)
                return
            }

            let filters = MMInboxFilterOptions(dictRepresentation: command.argument(at: 1) as? [String : Any] ?? [:])

            MobileMessaging.inbox?.fetchInbox(externalUserId: extUserId, options: filters, completion: { (inbox, error) in
                if let error = error {
                    self.commandDelegate?.send(error: error, for: command)
                } else {
                    self.commandDelegate?.send(dict: inbox?.dictionary() ?? [:], for: command)
                }
            })
    }

    func setInboxMessagesSeen(_ command: CDVInvokedUrlCommand) {
        guard let extUserId = command.argument(at: 0) as? String,
              let mIds = command.argument(at: 1) as? [String] else {
                   self.commandDelegate?.send(errorText: "Could not retrieve messages data from argument", for: command)
                   return
              }
        MobileMessaging.inbox?.setSeen(externalUserId: extUserId, messageIds: mIds, completion: { error in
            if let error = error {
                self.commandDelegate?.send(error: error, for: command)
            } else {
                self.commandDelegate?.send(array: mIds, for: command)
            }
        })
    }

    func saveInstallation(_ command: CDVInvokedUrlCommand) {
        guard let installationDictionary = command.arguments[0] as? [String: Any], let installation = MMInstallation(dictRepresentation: installationDictionary) else
        {
            self.commandDelegate?.send(errorText: "Could not retrieve installation data from argument", for: command)
            return
        }

        MobileMessaging.saveInstallation(installation, completion: { (error) in
            if let error = error {
                self.commandDelegate?.send(error: error, for: command)
            } else {
                self.commandDelegate?.send(dict: MobileMessaging.getInstallation()?.dictionaryRepresentation ?? [:], for: command)
            }
        })
    }

    func fetchInstallation(_ command: CDVInvokedUrlCommand) {
        MobileMessaging.fetchInstallation(completion: { (installation, error) in
            if let error = error {
                self.commandDelegate?.send(error: error, for: command)
            } else {
                self.commandDelegate?.send(dict: installation?.dictionaryRepresentation ?? [:], for: command)
            }
        })
    }

    func getInstallation(_ command: CDVInvokedUrlCommand) {
        let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: MobileMessaging.getInstallation()?.dictionaryRepresentation)
        self.commandDelegate?.send(successResult, callbackId: command.callbackId)
    }

    func setInstallationAsPrimary(_ command: CDVInvokedUrlCommand) {
        guard let pushRegId = command.arguments[0] as? String, let primary = command.arguments[1] as? Bool else
        {
            self.commandDelegate?.send(errorText: "Could not retrieve required arguments", for: command)
            return
        }
        MobileMessaging.setInstallation(withPushRegistrationId: pushRegId, asPrimary: primary, completion: { (installations, error) in
            if let error = error {
                self.commandDelegate?.send(error: error, for: command)
            } else {
                self.commandDelegate?.send(array: installations?.map({ $0.dictionaryRepresentation }) ?? [], for: command)
            }
        })
    }

    func personalize(_ command: CDVInvokedUrlCommand) {
        guard let context = command.arguments[0] as? [String: Any], let uiDict = context["userIdentity"] as? [String: Any] else
        {
            self.commandDelegate?.send(errorText: "Could not retrieve context from argument", for: command)
            return
        }
        guard let ui = MMUserIdentity(phones: uiDict["phones"] as? [String], emails: uiDict["emails"] as? [String], externalUserId: uiDict["externalUserId"] as? String) else
        {
            self.commandDelegate?.send(errorText: "userIdentity must have at least one non-nil property", for: command)
            return
        }
        let uaDict = context["userAttributes"] as? [String: Any]
        let ua = uaDict == nil ? nil : MMUserAttributes(dictRepresentation: uaDict!)
        let forceDepersonalize = context["forceDepersonalize"] as? Bool ?? false
        let keepAsLead = context["keepAsLead"] as? Bool ?? false
        MobileMessaging.personalize(forceDepersonalize: forceDepersonalize, keepAsLead: keepAsLead, userIdentity: ui, userAttributes: ua) { (error) in
            if let error = error {
                self.commandDelegate?.send(error: error, for: command)
            } else {
                self.commandDelegate?.send(dict: MobileMessaging.getUser()?.dictionaryRepresentation ?? [:], for: command)
            }
        }
    }

    func depersonalize(_ command: CDVInvokedUrlCommand) {
        MobileMessaging.depersonalize(completion: { (status, error) in
            if (status == MMSuccessPending.pending) {
                self.commandDelegate?.send(message: "pending", for: command)
            } else if let error = error {
                self.commandDelegate?.send(error: error, for: command)
            } else {
                self.commandDelegate?.send(message: "success", for: command)
            }
        })
    }

    func depersonalizeInstallation(_ command: CDVInvokedUrlCommand) {
        guard let pushRegId = command.arguments[0] as? String else
        {
            self.commandDelegate?.send(errorText: "Could not retrieve required arguments", for: command)
            return
        }
        MobileMessaging.depersonalizeInstallation(withPushRegistrationId: pushRegId, completion: { (installations, error) in
            if let error = error {
                self.commandDelegate?.send(error: error, for: command)
            } else {
                self.commandDelegate?.send(array: installations?.map({ $0.dictionaryRepresentation }) ?? [], for: command)
            }
        })
    }

    func markMessagesSeen(_ command: CDVInvokedUrlCommand) {
        guard let messageIds = command.arguments as? [String], !messageIds.isEmpty else {
            self.commandDelegate?.send(errorText: "Could not retrieve message ids from arguments", for: command)
            return
        }
        MobileMessaging.setSeen(messageIds: messageIds, completion: {
            self.commandDelegate?.send(array: messageIds, for: command)
        })
    }

    func showDialogForError(_ command: CDVInvokedUrlCommand) {
        self.commandDelegate?.send(errorText: "Not supported", for: command)
    }

    func setUserDataJwt(_ command: CDVInvokedUrlCommand) {
        let jwtString = command.arguments.first as? String
        MobileMessaging.jwtSupplier = VariableJwtSupplier(jwt: jwtString)
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
            self.commandDelegate?.send(errorText: "Could not retrieve message id from arguments", for: command)
            return
        }
        guard let storage = MobileMessaging.defaultMessageStorage else {
            self.commandDelegate?.send(errorText: "Default storage not initialized", for: command)
            return
        }

        storage.findMessages(withIds: [messageId], completion: { messages in
            var result: CDVPluginResult = CDVPluginResult(status: CDVCommandStatus_OK)
            if let messageDict = messages?[0].dictionary() {
                result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: messageDict)
            }
            self.commandDelegate?.send(result, callbackId: command.callbackId)
        })
    }

    func defaultMessageStorage_findAll(_ command: CDVInvokedUrlCommand) {
        guard let storage = MobileMessaging.defaultMessageStorage else {
            self.commandDelegate?.send(errorText: "Default storage not initialized", for: command)
            return
        }

        storage.findAllMessages(completion: { messages in
            self.commandDelegate?.send(array: messages?.map({$0.dictionary()}) ?? [], for: command)
        })
    }

    func defaultMessageStorage_delete(_ command: CDVInvokedUrlCommand) {
        guard let messageId = command.arguments[0] as? String else {
            self.commandDelegate?.send(errorText: "Could not retrieve message id from arguments", for: command)
            return
        }
        guard let storage = MobileMessaging.defaultMessageStorage else {
            self.commandDelegate?.send(errorText: "Default storage not initialized", for: command)
            return
        }

        storage.remove(withIds: [messageId]) { _ in
            self.commandDelegate?.sendSuccess(for: command)
        }
    }

    func defaultMessageStorage_deleteAll(_ command: CDVInvokedUrlCommand) {
        MobileMessaging.defaultMessageStorage?.removeAllMessages() { _ in
            self.commandDelegate?.sendSuccess(for: command)
        }
    }

    func submitEvent(_ command: CDVInvokedUrlCommand) {
        guard let eventDataDictionary = command.arguments[0] as? [String: Any],
            let event = MMCustomEvent(dictRepresentation: eventDataDictionary) else
        {
            self.commandDelegate?.send(errorText: "Could not retrieve event data from argument", for: command)
            return
        }
        MobileMessaging.submitEvent(event)
    }

    func submitEventImmediately(_ command: CDVInvokedUrlCommand) {
        guard let eventDataDictionary = command.arguments[0] as? [String: Any],
            let event = MMCustomEvent(dictRepresentation: eventDataDictionary) else
        {
            self.commandDelegate?.send(errorText: "Could not retrieve event data from argument", for: command)
            return
        }
        MobileMessaging.submitEvent(event) { (error) in
            if let error = error {
                self.commandDelegate?.send(error: error, for: command)
            } else {
                self.commandDelegate?.sendSuccess(for: command)
            }
        }
    }

    //MARK: Utils

    private func performEarlyStartIfPossible() {
        let keychainAppCode = MobileMessaging.getKeychainApplicationCode()
        if let configDict = MMConfiguration.getConfigFromDefaults(), let configuration = MMConfiguration(rawConfig: configDict),
           !isStarted,
           let appCode = keychainAppCode
        {
            start(configuration: configuration, applicationCode: appCode)
        } else {
            MMLogDebug("Failed to start early. Keychain appcode \(keychainAppCode == nil ? "not set" : "set")")
        }
    }

    private func start(configuration: MMConfiguration, applicationCode: String, onSuccess: (() -> Void)? = nil) {
        setupMobileMessagingStaticParameters(configuration: configuration)

        let mobileMessaging = MobileMessaging
            .withApplicationCode(applicationCode, notificationType: configuration.notificationType)?
            .withJwtSupplier(VariableJwtSupplier(jwt: configuration.userDataJwt))
        
        guard let mobileMessaging = mobileMessaging else {
            MMLogError("Failed to initialize MobileMessaging instance, SDK can't start.")
            return
        }

        setupConfiguration(mobileMessaging: mobileMessaging, configuration: configuration)
        mobileMessaging.start({
            onSuccess?()
        })
    }

    private func stop(completion: @escaping () -> Void) {
        MobileMessaging.stop(false) { [weak self] in
            self?.eventsManager?.stop()
            self?.isStarted = false
            completion()
        }
    }

    private func needsRestart(userConfigDict: [String: AnyObject], applicationCode: String) -> Bool {
        let configDictChanged = MMConfiguration.didConfigurationChange(userConfigDict: userConfigDict)
        let applicationCodeChanged = MobileMessaging.didApplicationCodeChange(applicationCode: applicationCode)
        return configDictChanged || applicationCodeChanged
    }

    private func setupMobileMessagingStaticParameters(configuration: MMConfiguration) {
        MobileMessaging.privacySettings.systemInfoSendingDisabled = configuration.privacySettings[MMConfiguration.Keys.systemInfoSendingDisabled].unwrap(orDefault: false)
        MobileMessaging.privacySettings.carrierInfoSendingDisabled = configuration.privacySettings[MMConfiguration.Keys.carrierInfoSendingDisabled].unwrap(orDefault: false)
        MobileMessaging.privacySettings.userDataPersistingDisabled = configuration.privacySettings[MMConfiguration.Keys.userDataPersistingDisabled].unwrap(orDefault: false)
        MobileMessaging.userAgent.pluginVersion = "cordova \(configuration.cordovaPluginVersion)"
        if (configuration.logging) {
            MobileMessaging.logger = MMDefaultLogger()
        }
    }

    private func setupConfiguration(mobileMessaging: MobileMessaging, configuration: MMConfiguration) {
        var mobileMessaging = mobileMessaging
        if configuration.inAppChatEnabled {
            mobileMessaging = mobileMessaging.withInAppChat()
        }

        if configuration.fullFeaturedInAppsEnabled {
            mobileMessaging = mobileMessaging.withFullFeaturedInApps()
        }

        if configuration.registeringForRemoteNotificationsDisabled {
            mobileMessaging = mobileMessaging.withoutRegisteringForRemoteNotifications()
        }

        if configuration.overridingNotificationCenterDelegateDisabled {
            mobileMessaging = mobileMessaging.withoutOverridingNotificationCenterDelegate()
        }

        if configuration.unregisteringForRemoteNotificationsDisabled {
            mobileMessaging = mobileMessaging.withoutUnregisteringForRemoteNotifications()
        }

        if let storageAdapter = messageStorageAdapter, configuration.messageStorageEnabled {
            mobileMessaging = mobileMessaging.withMessageStorage(storageAdapter)
        } else if configuration.defaultMessageStorage {
            mobileMessaging = mobileMessaging.withDefaultMessageStorage()
        }

        if let categories = configuration.categories {
            mobileMessaging = mobileMessaging.withInteractiveNotificationCategories(Set(categories))
        }

        if let webViewSettings = configuration.webViewSettings {
            mobileMessaging.webViewSettings.configureWith(rawConfig: webViewSettings)
        }

        if let domains = configuration.trustedDomains, !domains.isEmpty {
            mobileMessaging = mobileMessaging.withTrustedDomains(domains)
        }

    }
}

extension MMInbox {
    func dictionary() -> [String: Any] {
        var result = [String: Any]()
        result["countTotal"] = countTotal
        result["countUnread"] = countUnread
        result["messages"] = messages.map { $0.dictionary() }
        result["countTotalFiltered"] = countTotalFiltered
        result["countUnreadFiltered"] = countUnreadFiltered
        return result
    }
}

extension MM_MTMessage {
    override func dictionary() -> [String: Any] {
        var result = [String: Any]()
        result["messageId"] = messageId
        result["title"] = title
        result["body"] = text
        result["sound"] = sound
        result["silent"] = isSilent
        result["receivedTimestamp"] = UInt64(sendDateTime * 1000)
        result["customPayload"] = customPayload
        result["originalPayload"] = originalPayload
        result["contentUrl"] = contentUrl
        result["seen"] = seenStatus != .NotSeen
        result["seenDate"] = seenDate?.timeIntervalSince1970
        result["chat"] = isChatMessage
        result["browserUrl"] = browserUrl?.absoluteString
        result["deeplink"] = deeplink?.absoluteString
        result["webViewUrl"] = webViewUrl?.absoluteString
        result["inAppOpenTitle"] = inAppOpenTitle
        result["inAppDismissTitle"] = inAppDismissTitle
        result["topic"] = topic
        return result
    }

}

extension MMBaseMessage {
    class func createFrom(dictionary: [String: Any]) -> MMBaseMessage? {
        guard let messageId = dictionary["messageId"] as? String,
            let originalPayload = dictionary["originalPayload"] as? MMStringKeyPayload else
        {
            return nil
        }

        return MMBaseMessage(messageId: messageId, direction: MMMessageDirection.MT, originalPayload: originalPayload, deliveryMethod: .undefined)
    }

    func dictionary() -> [String: Any] {
        var result = [String: Any]()
        result["messageId"] = messageId
        result["customPayload"] = originalPayload["customPayload"]
        result["originalPayload"] = originalPayload

        if let aps = originalPayload["aps"] as? MMStringKeyPayload {
            result["body"] = aps["body"]
            result["sound"] = aps["sound"]
        }

        if let internalData = originalPayload["internalData"] as? MMStringKeyPayload,
            let _ = internalData["silent"] as? MMStringKeyPayload {
            result["silent"] = true
        } else if let silent = originalPayload["silent"] as? Bool {
            result["silent"] = silent
        }

        return result
    }
}

class MessageStorageAdapter: MMMessageStorage {
    var registeredCallbacks = [String: String]()
    let queue = DispatchQueue(label: "MessageStoreAdapterQueue")
    let findSemaphore = DispatchSemaphore(value: 0)
    let plugin: CDVPlugin
    var foundMessage:MMBaseMessage?

    init(plugin: CDVPlugin) {
        self.plugin = plugin
    }

    func start() {
        sendCallback(for: "messageStorage.start")
    }

    func stop() {
        sendCallback(for: "messageStorage.stop")
    }

    func insert(outgoing messages: [MMBaseMessage], completion: @escaping () -> Void) {
        // Implementation not needed. This method is intended for client usage.
    }

    func insert(incoming messages: [MMBaseMessage], completion: @escaping () -> Void) {
        sendCallback(for: "messageStorage.save", withArray: messages.map({
            $0.dictionary()
        }))
        completion()
    }

    func update(messageSeenStatus status: MMSeenStatus, for messageId: MessageId, completion: @escaping () -> Void) {
        // Implementation not needed. This method is intended for client usage.
    }

    func update(deliveryReportStatus isDelivered: Bool, for messageId: MessageId, completion: @escaping () -> Void) {
        // Implementation not needed. This method is intended for client usage.
    }

    func update(messageSentStatus status: MM_MOMessageSentStatus, for messageId: MessageId, completion: @escaping () -> Void) {
        // Implementation not needed. This method is intended for client usage.
    }

    func findMessage(withId messageId: MessageId) -> MMBaseMessage? {
        queue.sync() {
            sendCallback(for: "messageStorage.find", withMessage: messageId)
            _ = findSemaphore.wait(timeout: DispatchTime.now() + DispatchTimeInterval.seconds(30))
        }
        return foundMessage
    }

    func findAllMessageIds(completion: @escaping ([String]) -> Void) {
        // Implementation not needed. This method is intended for client usage.
    }

    func register(_ command: CDVInvokedUrlCommand) {
        let callbackId = command.callbackId
        guard let event = command.arguments[0] as? String else {
            plugin.commandDelegate?.send(errorText: "Event name not recognized", for: command)
            return
        }

        queue.sync() {
            registeredCallbacks[event] = callbackId
        }
    }

    func unregister(_ command: CDVInvokedUrlCommand) {
        guard let event = command.arguments[0] as? String else {
            plugin.commandDelegate?.send(errorText: "Event name not recognized", for: command)
            return
        }

        _ = queue.sync {
            registeredCallbacks.removeValue(forKey: event)
        }
    }

    func findResult(_ command: CDVInvokedUrlCommand) {
        guard let dictionary = command.arguments[0] as? [String: Any] else {
            foundMessage = nil
            findSemaphore.signal()
            return
        }

        foundMessage = MMBaseMessage.createFrom(dictionary: dictionary)
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

extension Dictionary {
    mutating func remove(keys: [Key]) {
        keys.forEach { self.removeValue(forKey: $0)}
    }
}

private func createErrorPluginResult(error: NSError) -> CDVPluginResult {
    return createErrorPluginResult(description: error.localizedDescription, errorCode: error.mm_code ?? error.code, domain: error.domain)
}

private func createErrorPluginResult(description: String, errorCode: Any? = nil, domain: String? = "com.infobip.mobile-messaging.cordova-plugin.ios-wrapper") -> CDVPluginResult {
    var error: [AnyHashable: Any] = ["description": description]
    if let errorCode = errorCode {
        error["code"] = errorCode
    }
    if let domain = domain {
        error["domain"] = domain
    }
    return CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: error)
}

fileprivate extension CDVCommandDelegate {
    func send(errorText: String, for command: CDVInvokedUrlCommand) {
        let errorResult = createErrorPluginResult(description: errorText)
        self.send(errorResult, callbackId: command.callbackId)
    }
    func send(error: NSError, for command: CDVInvokedUrlCommand) {
        let errorResult = createErrorPluginResult(error: error)
        self.send(errorResult, callbackId: command.callbackId)
    }
    func send(dict: [AnyHashable: Any], for command: CDVInvokedUrlCommand) {
        let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: dict)
        self.send(successResult, callbackId: command.callbackId)
    }
    func send(array: [Any], for command: CDVInvokedUrlCommand) {
        let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: array)
        self.send(successResult, callbackId: command.callbackId)
    }
    func send(message: String, for command: CDVInvokedUrlCommand) {
        let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: message)
        self.send(successResult, callbackId: command.callbackId)
    }
    func sendSuccess(for command: CDVInvokedUrlCommand) {
        self.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
    }
}

extension UIApplication {
    public var firstKeyWindow: UIWindow? {
        return connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first(where: { $0.activationState == .foregroundActive })?
            .windows
            .first(where: { $0.isKeyWindow })
    }

    class func topViewController(controller: UIViewController? = nil) -> UIViewController? {
        let rootController = controller ?? UIApplication.shared.firstKeyWindow?.rootViewController

        if let navigationController = rootController as? UINavigationController {
            return topViewController(controller: navigationController.visibleViewController)
        }
        if let tabController = rootController as? UITabBarController {
            if let selected = tabController.selectedViewController {
                return topViewController(controller: selected)
            }
        }
        if let presented = rootController?.presentedViewController {
            return topViewController(controller: presented)
        }
        return rootController
    }
}

class VariableJwtSupplier: NSObject, MMJwtSupplier {
    let jwt: String?
    init(jwt: String?) {
        self.jwt = jwt
    }
    func getJwt() -> String? {
        return jwt
    }
}

extension MobileMessagingCordova: MMInAppChatDelegate {
    func showChat(_ command: CDVInvokedUrlCommand) {
        MobileMessaging.inAppChat?.delegate = self
        var presentVCModally = false
        if command.arguments.count > 0,
            let presentingOptions = command.arguments[0] as? [String: Any],
            let iosOptions = presentingOptions["ios"] as? [String: Any],
            let shouldBePresentedModally = iosOptions["shouldBePresentedModally"] as? Bool {
            presentVCModally = shouldBePresentedModally
        }

        let vc = presentVCModally ? MMChatViewController.makeRootNavigationViewController(): MMChatViewController.makeRootNavigationViewControllerWithCustomTransition()
        if presentVCModally {
            vc.modalPresentationStyle = .fullScreen
        }
        if let rootVc = UIApplication.topViewController() {
            rootVc.present(vc, animated: true, completion: nil)
        } else {
            MMLogDebug("[InAppChat] could not define root vc to present in-app-chat")
        }
        self.commandDelegate.sendSuccess(for: command)
    }

    func setLanguage(_ command: CDVInvokedUrlCommand) {
        guard let localeString = command.arguments[0] as? String else {
            self.commandDelegate?.send(errorText: "Could not retrieve locale string from arguments", for: command)
            return
        }
        MobileMessaging.inAppChat?.setLanguage(localeString)
    }

    func sendContextualData(_ command: CDVInvokedUrlCommand) {
        guard command.arguments.count > 0,
              let metadata = command.arguments[0] as? String,
              let allMultiThreadStrategy = command.arguments[1] as? Bool else {
            self.commandDelegate?.send(errorText: "Could not retrieve contextual data or multi-thread strategy flag from arguments", for: command)
            return
        }

        if let chatVC = UIApplication.topViewController() as? MMChatViewController {
            let mtStrategy: MMChatMultiThreadStrategy = allMultiThreadStrategy ? .ALL : .ACTIVE
            chatVC.sendContextualData(metadata, multiThreadStrategy: mtStrategy) { error in
                guard let error = error else {
                    return
                }
                self.commandDelegate?.send(errorText: "Could not send metadata, error \(error.localizedDescription) from arguments", for: command)
            }
        }
    }

    func setupiOSChatSettings(_ command: CDVInvokedUrlCommand) {
        if let chatSettings = command.arguments[0] as? [String: AnyObject] {
            MMChatSettings.settings.configureWith(rawConfig: chatSettings)
        }
    }

    func getMessageCounter(_ command: CDVInvokedUrlCommand) {
        let successResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: MobileMessaging.inAppChat?.getMessageCounter ?? 0)
        self.commandDelegate?.send(successResult, callbackId: command.callbackId)
    }

    func resetMessageCounter(_ command: CDVInvokedUrlCommand) {
        MobileMessaging.inAppChat?.resetMessageCounter()
        self.commandDelegate.sendSuccess(for: command)
    }

    private struct ChatJwtBridge {
        static var callbackId: String?
        static var pendingCompletion: ((String?) -> Void)?
        static let lock = NSLock()
    }
    
    private struct ChatExceptionBridge {
        static var callbackId: String?
        static let lock = NSLock()
    }

    @objc func setChatJwtProvider(_ command: CDVInvokedUrlCommand) {
        ChatJwtBridge.lock.lock()
        defer { ChatJwtBridge.lock.unlock() }
        ChatJwtBridge.callbackId = command.callbackId

        // Keep callback alive for multiple requests
        let pluginResult = CDVPluginResult(status: .noResult)
        pluginResult?.setKeepCallbackAs(true)
        self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
    }

    @objc func setChatJwt(_ command: CDVInvokedUrlCommand) {
        ChatJwtBridge.lock.lock()
        defer { ChatJwtBridge.lock.unlock() }

        let jwt = command.arguments.first as? String

        // Fulfill the pending completion
        if let completion = ChatJwtBridge.pendingCompletion {
            completion(jwt)
            ChatJwtBridge.pendingCompletion = nil
        }

        // Respond to JS
        let pluginResult: CDVPluginResult
        if jwt != nil && !(jwt?.isEmpty ?? true) {
            pluginResult = CDVPluginResult(status: .ok)
        } else {
            pluginResult = CDVPluginResult(status: .error, messageAs: "Provided chat JWT is null or empty.")
        }
        self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
    }

    func requestChatJWTFromJS(completion: @escaping (String?) -> Void) {
        ChatJwtBridge.lock.lock()
        defer { ChatJwtBridge.lock.unlock() }

        guard let callbackId = ChatJwtBridge.callbackId else {
            completion(nil)
            return
        }

        // Store completion to be called by setChatJwt
        ChatJwtBridge.pendingCompletion = completion

        // Notify JS that a JWT is requested
        let pluginResult = CDVPluginResult(status: .ok, messageAs: MobileMessagingEventsManager.InternalEvent.chatJWTRequested)
        pluginResult?.setKeepCallbackAs(true)
        self.commandDelegate?.send(pluginResult, callbackId: callbackId)
    }

    @objc func getJWT() -> String? {
        var jwt: String?
        let semaphore = DispatchSemaphore(value: 0)
        // Ask JS for a JWT
        self.requestChatJWTFromJS { receivedJWT in
            jwt = receivedJWT
            semaphore.signal()
        }
        _ = semaphore.wait(timeout: .now() + 45) // 45s timeout
        return jwt
    }
    
    @objc func setChatExceptionHandler(_ command: CDVInvokedUrlCommand) {
        ChatExceptionBridge.lock.lock()
        defer { ChatExceptionBridge.lock.unlock() }
        ChatExceptionBridge.callbackId = command.callbackId
        let enableHandler = (command.arguments[0] as? Bool) ?? false
        willUseChatExceptionHandler = enableHandler
        self.commandDelegate.sendSuccess(for: command)
    }
    
    @objc public func didReceiveException(_ exception: MMChatException) -> MMChatExceptionDisplayMode {
        guard willUseChatExceptionHandler else { return .displayDefaultAlert }
        ChatExceptionBridge.lock.lock()
        defer { ChatExceptionBridge.lock.unlock() }
        
        var payload: [AnyHashable: Any] = [:]
        if let message = exception.message {
            payload["message"] = message
        }
        if let name = exception.name {
            payload["name"] = name
        }
        payload["code"] = exception.code
        payload["origin"] = "LiveChat"
        payload["platform"] = "Cordova"
        payload[MobileMessagingEventsManager.InternalEvent.idKey] = MobileMessagingEventsManager.InternalEvent.chatExceptionReceived
        let pluginResult = CDVPluginResult(status: .ok, messageAs: payload)
        self.commandDelegate.send(pluginResult, callbackId: ChatExceptionBridge.callbackId)
        return .noDisplay
    }

    
    func setWidgetTheme(_ command: CDVInvokedUrlCommand) {
        guard let themeName = command.arguments[0] as? String else {
            self.commandDelegate?.send(errorText: "Could not retrieve widget theme name from arguments", for: command)
            return
        }
        if let chatVC = UIApplication.topViewController() as? MMChatViewController {
            // Real time change if we detect the chat as top VC
            chatVC.setWidgetTheme(themeName, completion: { error in
                if error != nil {
                    self.commandDelegate?.send(errorText: "Could not set widget theme from arguments", for: command)
                }
            })
        }
        // And we also set the static value that is used in future loads of the widget
        MMChatSettings.sharedInstance.widgetTheme = themeName
    }
    
    struct ToolbarCustomization: Decodable {
        var titleTextAppearance: String?
        var titleTextColor: String?
        var titleText: String?
        var backgroundColor: String?
        var navigationIcon: String?
        var navigationIconTint: String?
    }

    struct ChatCustomization: Decodable {
        var chatStatusBarBackgroundColor: String?
        var chatStatusBarIconsColorMode: String?
        var chatToolbar: ToolbarCustomization?
        var attachmentPreviewToolbar: ToolbarCustomization?
        var attachmentPreviewToolbarMenuItemsIconTint: String?
        var attachmentPreviewToolbarSaveMenuItemIcon: String?
        var chatBackgroundColor: String?
        var chatProgressBarColor: String?
        var chatInputTextAppearance: String?
        var chatInputTextColor: String?
        var chatInputBackgroundColor: String?
        var chatInputHintText: String?
        var chatInputHintTextColor: String?
        var chatInputAttachmentIcon: String?
        var chatInputAttachmentIconTint: String?
        var chatInputAttachmentBackgroundDrawable: String?
        var chatInputAttachmentBackgroundColor: String?
        var chatInputSendIcon: String?
        var chatInputSendIconTint: String?
        var chatInputSendBackgroundDrawable: String?
        var chatInputSendBackgroundColor: String?
        var chatInputSeparatorLineColor: String?
        var chatInputSeparatorLineVisible: Bool?
        var chatInputCursorColor: String?
        var networkErrorTextColor: String?
        var networkErrorLabelBackgroundColor: String?
        var shouldHandleKeyboardAppearance: Bool?
    }
    
    class CustomizationUtils {
        func setup(customization: ChatCustomization, in settings: MMChatSettings) {
            setNotNil(&settings.navBarColor, customization.chatToolbar?.backgroundColor?.toColor())
            setNotNil(&settings.navBarTitleColor, customization.chatToolbar?.titleTextColor?.toColor())
            setNotNil(&settings.navBarItemsTintColor, customization.chatToolbar?.navigationIconTint?.toColor())
            setNotNil(&settings.title, customization.chatToolbar?.titleText)
            setNotNil(&settings.attachmentPreviewBarsColor, customization.attachmentPreviewToolbar?.backgroundColor?.toColor())
            setNotNil(&settings.attachmentPreviewItemsColor, customization.attachmentPreviewToolbar?.navigationIconTint?.toColor())            
            setNotNil(&settings.backgroundColor, customization.chatBackgroundColor?.toColor())
            setNotNil(&settings.advancedSettings.mainTextColor, customization.chatInputTextColor?.toColor())
            setNotNil(&settings.advancedSettings.textInputBackgroundColor, customization.chatInputBackgroundColor?.toColor())
            setNotNil(&settings.advancedSettings.attachmentButtonIcon, getImage(with: customization.chatInputAttachmentIcon))
            setNotNil(&settings.advancedSettings.sendButtonIcon, getImage(with: customization.chatInputSendIcon))
            setNotNil(&settings.sendButtonTintColor, customization.chatInputSendIconTint?.toColor())
            setNotNil(&settings.chatInputSeparatorLineColor, customization.chatInputSeparatorLineColor?.toColor())
            setNotNil(&settings.advancedSettings.isLineSeparatorHidden, customization.chatInputSeparatorLineVisible)
            setNotNil(&settings.advancedSettings.typingIndicatorColor, customization.chatInputCursorColor?.toColor())
            setNotNil(&settings.errorLabelTextColor, customization.networkErrorTextColor?.toColor())
            setNotNil(&settings.errorLabelBackgroundColor, customization.networkErrorLabelBackgroundColor?.toColor())
            setNotNil(&settings.advancedSettings.mainPlaceholderTextColor, customization.chatInputHintTextColor?.toColor())
            setNotNil(&settings.shouldHandleKeyboardAppearance, customization.shouldHandleKeyboardAppearance)
        }
        
        func getImage(with name: String?) -> UIImage? {
            guard let name = name else { return nil }
            let bundle = Bundle(for: type(of: self))
            guard let bundlePath = bundle.path(forResource: name, ofType: nil) else { return nil }
            return UIImage(named: bundlePath)
        }
        
        func getFont(with path: String?, size: CGFloat) -> UIFont? {
            guard let path = path else { return nil }
            let bundle = Bundle(for: type(of: self))
            guard let bundlePath = bundle.path(forResource: path, ofType: nil) else { return nil }
            guard let data = NSData(contentsOfFile: bundlePath) else { return nil }
            guard let dataProvider = CGDataProvider(data: data) else { return nil }
            guard let fontReference = CGFont(dataProvider) else { return nil }
            
            guard let fontName = URL(string: path)?.deletingPathExtension().lastPathComponent else { return nil }
            
            var errorReference: Unmanaged<CFError>?
            CTFontManagerRegisterGraphicsFont(fontReference, &errorReference)
            return UIFont(name: fontName, size: size)
        }

        func setNotNil<T>(_ forVariable: inout T, _ value:T?) {
            if let value = value { forVariable = value }
        }
    }
    
    func setChatCustomization(_ command: CDVInvokedUrlCommand) {
        guard let chatCustomisationDict = command.arguments[0] as? [String: AnyObject],
        let jsonObject = try? JSONSerialization.data(withJSONObject: chatCustomisationDict),
        let customization = try? JSONDecoder().decode(ChatCustomization.self, from: jsonObject) else {
            self.commandDelegate?.send(errorText: "Could not retrieve widget customisation values from arguments", for: command)
            return
        }
        CustomizationUtils().setup(customization: customization, in: MMChatSettings.sharedInstance)
    }
}

extension String {
    func toColor() -> UIColor? {
        return UIColor(hexString: self)
    }
}

