module.exports = function(ctx) {
	if (ctx.opts.platforms.indexOf('ios') < 0) { // project doesn't support ios at all
        return;
    }
    if (ctx.opts.cordova.platforms.length > 0 && ctx.opts.cordova.platforms.indexOf('ios') < 0) { // corodova prepare was explicitly called for non-ios platforms
        return;
    }

    var command = ` cd plugins/com-infobip-plugins-mobilemessaging/libs/ios;
                    carthage update --cache-builds`;

    var exec = require('child_process').exec, child;
    child = exec(command,
        function (error, stdout, stderr) {
            if (stdout) {
                console.log('stdout: ' + stdout);
            }
            if (stderr) {
               console.log('stderr: ' + stderr);
            }
            if (error !== null) {
               console.log('exec error: ' + error);
           }
       });
}