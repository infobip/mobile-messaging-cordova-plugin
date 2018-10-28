module.exports = function(ctx) {
    if (!(ctx.opts.options.APPLICATION_CODE && ctx.opts.options.PROJECT && ctx.opts.options.TARGET && ctx.opts.options.APP_GROUP)) {
        return
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