import Foundation

@objc(MobileMessagingCordova) class MobileMessagingCordova : CDVPlugin {
  func start(command: CDVInvokedUrlCommand) {
    var pluginResult = CDVPluginResult(status: CDVCommandStatus_ERROR)

    // do work here

    pluginResult = CDVPluginResult(status: CDVCommandStatus_OK)

    self.commandDelegate!.sendPluginResult(pluginResult, callbackId: command.callbackId)
  }
}