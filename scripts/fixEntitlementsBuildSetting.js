// this code comments out the CODE_SIGN_ENTITLEMENTS setting in the build.xcconfig
// in order to get rid of following build process warning: "Falling back to contents of entitlements file "Entitlements-Debug.plist" because it was modified during the build process. Modifying the entitlements file during the build is unsupported.error: The file “Entitlements-Debug.plist” couldn’t be opened because there is no such file.""
var fs = require('fs');
var xcconfigFile = 'platforms/ios/cordova/build.xcconfig';
var text = fs.readFileSync(xcconfigFile, 'utf-8');
var idx = text.search(/^\s?CODE_SIGN_ENTITLEMENTS/gm);
if (idx != -1) {
    var newText = text.slice(0, idx) + "// [this line was commented out automatically by MobileMessagingCordova plugin hook due to a Cordova issue CB-12212] " + text.slice(idx);
    fs.writeFileSync(xcconfigFile, newText, 'utf-8');
}