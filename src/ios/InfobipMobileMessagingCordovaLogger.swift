//
//  InfobipMobileMessagingCordovaLogger.swift
//  MobileMessagingCordova
//
// Copyright (c) 2016-2025 Infobip Limited
// Licensed under the Apache License, Version 2.0
//

import MobileMessaging

class InfobipMobileMessagingCordovaLogger: NSObject, MMLogging {
    public var logOutput: MMLogOutput
    public var logLevel: MMLogLevel = .All
    public var logFilePaths: [String]? = nil
    public weak var commandDelegate: CDVCommandDelegate?

    public init(_ commandDelegate: CDVCommandDelegate?) {
        self.logOutput = .Console
        self.commandDelegate = commandDelegate
    }

    public func sendLogs(fromViewController vc: UIViewController) { /* Not needed */ }

    private func log(_ icon: LogIcons, _ message: String) {
        let stringLog = formattedLogEntry(date: Date(), icon: icon, message: message)
        print(stringLog)
        guard let callbackId = MobileMessagingCordova.MMDebugMessageBridge.callbackId else {
            return
        }
        // Transform URLs from native SDK docs to Cordova plugin docs
        let cordovaMessage = message.replacingOccurrences(
            of: "https://github.com/infobip/mobile-messaging-sdk-ios/wiki/In%E2%80%90app-chat#library-events",
            with: "https://github.com/infobip/mobile-messaging-cordova-plugin/wiki/In-app-chat#library-events")

        let payload: [String: Any] = [MobileMessagingEventsManager.InternalEvent.idKey : MobileMessagingEventsManager.InternalEvent.debugMessageReceived,
                                      "message": cordovaMessage]

        let pluginResult = CDVPluginResult(status: .ok, messageAs: payload)
        pluginResult?.setKeepCallbackAs(true)
        self.commandDelegate?.send(pluginResult, callbackId: callbackId)
    }

    public func logDebug(message: String) {
        log(LogIcons.debug, message)
    }

    public func logInfo(message: String) {
        log(LogIcons.info, message)
    }

    public func logError(message: String) {
        log(LogIcons.error, message)
    }

    public func logWarn(message: String) {
        log(LogIcons.warning, message)
    }

    public func logVerbose(message: String) {
        log(LogIcons.verbose, message)
    }
}
