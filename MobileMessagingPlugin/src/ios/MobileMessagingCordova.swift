import Foundation
import UIKit
import MobileMessaging

@objc(MobileMessagingCordova) class MobileMessagingCordova : CDVPlugin {
  func start(command: CDVInvokedUrlCommand) {
    var pluginResult = CDVPluginResult(status: CDVCommandStatus_ERROR)

    // do work here 

    pluginResult = CDVPluginResult(status: CDVCommandStatus_OK)

    self.commandDelegate!.sendPluginResult(pluginResult, callbackId: command.callbackId)
  }

  func showAlert(command: CDVInvokedUrlCommand) {
    var pluginResult = CDVPluginResult(status: CDVCommandStatus_ERROR)

    // extract the message argument
    let alertMsg = command.arguments[0] as? String ?? ""

    if alertMsg.characters.count > 0 {
      // create the AlertController
      let alertController = UIAlertController(title: "Cordova Demo", message: alertMsg, preferredStyle: .Alert)

      let okAction = UIAlertAction(title: "OK", style: UIAlertActionStyle.Default, handler: { (action: UIAlertAction) in
        // whatevs
      })

      let cancelAction = UIAlertAction(title: "Cancel", style: UIAlertActionStyle.Cancel, handler: nil)

      alertController.addAction(okAction)
      alertController.addAction(cancelAction)

      UIApplication.sharedApplication().keyWindow?.rootViewController?.presentViewController(alertController, animated: true, completion: nil)
    }

    // return OK to Cordova
    pluginResult = CDVPluginResult(status: CDVCommandStatus_OK)
    self.commandDelegate!.sendPluginResult(pluginResult, callbackId: command.callbackId)
  }
}