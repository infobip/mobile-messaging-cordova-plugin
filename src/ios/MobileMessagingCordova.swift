
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
        static let inAppChatEnabled = "inAppChatEnabled"
        static let applicationCode = "applicationCode"
        static let forceCleanup = "forceCleanup"
        static let logging = "logging"
        static let defaultMessageStorage = "defaultMessageStorage"
        static let notificationTypes = "notificationTypes"
        static let messageStorage = "messageStorage"
        static let cordovaPluginVersion = "cordovaPluginVersion"
        static let notificationCategories = "notificationCategories"
        static let webViewSettings = "webViewSettings"
        static let registeringForRemoteNotificationsDisabled = "registeringForRemoteNotificationsDisabled"
        static let overridingNotificationCenterDelegateDisabled = "overridingNotificationCenterDelegateDisabled"
        static let unregisteringForRemoteNotificationsDisabled = "unregisteringForRemoteNotificationsDisabled"
    }

    let appCode: String
    let geofencingEnabled: Bool
    let inAppChatEnabled: Bool
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

    init?(rawConfig: [String: AnyObject]) {
        guard let appCode = rawConfig[MMConfiguration.Keys.applicationCode] as? String,
            let ios = rawConfig["ios"] as? [String: AnyObject] else
        {
            return nil
        }

        self.appCode = appCode
        self.geofencingEnabled = rawConfig[MMConfiguration.Keys.geofencingEnabled].unwrap(orDefault: false)
        self.inAppChatEnabled = rawConfig[MMConfiguration.Keys.inAppChatEnabled].unwrap(orDefault: false)
        self.forceCleanup = ios[MMConfiguration.Keys.forceCleanup].unwrap(orDefault: false)
        self.logging = ios[MMConfiguration.Keys.logging].unwrap(orDefault: false)
        self.defaultMessageStorage = rawConfig[MMConfiguration.Keys.defaultMessageStorage].unwrap(orDefault: false)
        self.messageStorageEnabled = rawConfig[MMConfiguration.Keys.messageStorage] != nil ? true : false
        self.registeringForRemoteNotificationsDisabled = ios[MMConfiguration.Keys.registeringForRemoteNotificationsDisabled].unwrap(orDefault: false)
        self.overridingNotificationCenterDelegateDisabled = ios[MMConfiguration.Keys.overridingNotificationCenterDelegateDisabled].unwrap(orDefault: false)
        self.unregisteringForRemoteNotificationsDisabled = ios[MMConfiguration.Keys.unregisteringForRemoteNotificationsDisabled].unwrap(orDefault: false)
        
        if let rawPrivacySettings = rawConfig[MMConfiguration.Keys.privacySettings] as? [String: Any] {
            var ps = [String: Any]()
            ps[MMConfiguration.Keys.userDataPersistingDisabled] = rawPrivacySettings[MMConfiguration.Keys.userDataPersistingDisabled].unwrap(orDefault: false)
            ps[MMConfiguration.Keys.carrierInfoSendingDisabled] = rawPrivacySettings[MMConfiguration.Keys.carrierInfoSendingDisabled].unwrap(orDefault: false)
            ps[MMConfiguration.Keys.systemInfoSendingDisabled] = rawPrivacySettings[MMConfiguration.Keys.systemInfoSendingDisabled].unwrap(orDefault: false)
            ps[MMConfiguration.Keys.applicationCodePersistingDisabled] = rawPrivacySettings[MMConfiguration.Keys.applicationCodePersistingDisabled].unwrap(orDefault: false)

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
        "depersonalized": MMNotificationDepersonalized,
        "personalized": MMNotificationPersonalized,
        "installationUpdated": MMNotificationInstallationSynced,
        "userUpdated": MMNotificationUserSynced,
        "deeplink": NSNotification.Name.CDVPluginHandleOpenURLWithAppSourceAndAnnotation.rawValue,
        "inAppChat.unreadMessageCounterUpdated": MMNotificationInAppChatUnreadMessagesCounterUpdated,
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
        case MMNotificationGeographicalRegionDidEnter:
            if let region = notification.userInfo?[MMNotificationKeyGeographicalRegion] as? MMRegion {
                notificationResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: [cordovaEventName, region.dictionary()])
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

    private struct Constants {
        static let cordovaConfigKey = "com.mobile-messaging.corodovaPluginConfiguration"
    }

    override func pluginInitialize() {
        super.pluginInitialize()
        self.messageStorageAdapter = MessageStorageAdapter(plugin: self)
        MobileMessagingPluginApplicationDelegate.install()
        self.eventsManager = MobileMessagingEventsManager(plugin: self)
        performEarlyStartIfPossible()
    }

    @objc(init:) func start(command: CDVInvokedUrlCommand) {
        guard let userConfigDict = command.arguments[0] as? [String: AnyObject], let userConfiguration = MMConfiguration(rawConfig: userConfigDict) else
        {
            let errorResult = createErrorPluginResult(description: "Can't parse configuration")
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
        MobileMessaging.personalize(withUserIdentity: ui, userAttributes: ua) { (error) in
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

    func showChat(_ command: CDVInvokedUrlCommand) {
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

    func setupiOSChatSettings(_ command: CDVInvokedUrlCommand) {
        if let chatSettings = command.arguments[0] as? [String: AnyObject] {
            MobileMessaging.inAppChat?.settings.configureWith(rawConfig: chatSettings)
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

        if configuration.inAppChatEnabled {
            mobileMessaging = mobileMessaging?.withInAppChat()
        }
        
        if configuration.registeringForRemoteNotificationsDisabled {
            mobileMessaging = mobileMessaging?.withoutRegisteringForRemoteNotifications()
        }
        
        if configuration.overridingNotificationCenterDelegateDisabled {
            mobileMessaging = mobileMessaging?.withoutOverridingNotificationCenterDelegate()
        }
        
        if configuration.unregisteringForRemoteNotificationsDisabled {
            mobileMessaging = mobileMessaging?.withoutUnregisteringForRemoteNotifications()
        }

        if let storageAdapter = messageStorageAdapter, configuration.messageStorageEnabled {
            mobileMessaging = mobileMessaging?.withMessageStorage(storageAdapter)
        } else if configuration.defaultMessageStorage {
            mobileMessaging = mobileMessaging?.withDefaultMessageStorage()
        }
        if let categories = configuration.categories {
            mobileMessaging = mobileMessaging?.withInteractiveNotificationCategories(Set(categories))
        }

        MobileMessaging.userAgent.pluginVersion = "cordova \(configuration.cordovaPluginVersion)"
        if (configuration.logging) {
            MobileMessaging.logger = MMDefaultLogger()
        }

        if let webViewSettings = configuration.webViewSettings {
            mobileMessaging?.webViewSettings.configureWith(rawConfig: webViewSettings)
        }
        mobileMessaging?.start()
    }

    private func stop() {
        MobileMessaging.stop()
        eventsManager?.stop()
        isStarted = false
    }
}

extension MM_MTMessage {
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
        result["chat"] = isChatMessage
        result["browserUrl"] = browserUrl?.absoluteString
        result["deeplink"] = deeplink?.absoluteString
        result["webViewUrl"] = webViewUrl?.absoluteString
        result["inAppOpenTitle"] = inAppOpenTitle
        result["inAppDismissTitle"] = inAppDismissTitle
        return result
    }

    var isGeoMessage: Bool {
        let geoAreasDicts = (originalPayload["internalData"] as? [String: Any])?["geo"] as? [[String: Any]]
        return geoAreasDicts != nil
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
            _ = findSemaphore.wait(wallTimeout: DispatchWallTime.now() + DispatchTimeInterval.seconds(30))
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

private func createErrorPluginResult(error: NSError) -> CDVPluginResult {
    return createErrorPluginResult(description: error.description, errorCode: error.code, domain: error.domain)
}

private func createErrorPluginResult(description: String, errorCode: Int? = nil, domain: String? = "com.infobip.mobile-messaging.cordova-plugin.ios-wrapper") -> CDVPluginResult {
    var error: [AnyHashable: Any] = ["descritpion": description]
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
    class func topViewController(controller: UIViewController? = UIApplication.shared.keyWindow?.rootViewController) -> UIViewController? {
        if let navigationController = controller as? UINavigationController {
            return topViewController(controller: navigationController.visibleViewController)
        }
        if let tabController = controller as? UITabBarController {
            if let selected = tabController.selectedViewController {
                return topViewController(controller: selected)
            }
        }
        if let presented = controller?.presentedViewController {
            return topViewController(controller: presented)
        }
        return controller
    }
}
