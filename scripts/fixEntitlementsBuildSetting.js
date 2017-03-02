var fs = require('fs');
var xcconfigFile = 'platforms/ios/cordova/build.xcconfig';
var text = fs.readFileSync(xcconfigFile, 'utf-8');
var idx = text.search(/^\s?CODE_SIGN_ENTITLEMENTS/gm);
if (idx != -1) {
    var newText = text.slice(0, idx) + "//" + text.slice(idx);
    fs.writeFileSync(xcconfigFile, newText, 'utf-8');
}