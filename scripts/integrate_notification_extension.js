module.exports = function(ctx) {
	if (ctx.opts.platforms.indexOf('ios') < 0) { // project doesn't support ios at all
        return;
    }
    if (ctx.opts.cordova.platforms.length > 0 && ctx.opts.cordova.platforms.indexOf('ios') < 0) { // corodova prepare was explicitly called for non-ios platforms
        return;
    }
    if (!(ctx.opts.options.APPLICATION_CODE && ctx.opts.options.PROJECT && ctx.opts.options.TARGET && ctx.opts.options.APP_GROUP)) {
        return;
    }
    var command = ` sudo gem install mmine;
                    mmine integrate --cordova\
                    -a ${ctx.opts.options.APPLICATION_CODE}\
                    -p ${ctx.opts.options.PROJECT}\
                    -t ${ctx.opts.options.TARGET}\
                    -g ${ctx.opts.options.APP_GROUP}`;

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