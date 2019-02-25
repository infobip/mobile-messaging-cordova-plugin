module.exports = function(ctx) {
	if (ctx.opts.platforms.indexOf('ios') < 0) { // project doesn't support ios at all
        return;
    }
    if (ctx.opts.cordova.platforms.length > 0 && ctx.opts.cordova.platforms.indexOf('ios') < 0) { // corodova prepare was explicitly called for non-ios platforms
        return;
    }

    var ConfigParser = ctx.requireCordovaModule('cordova-common').ConfigParser;
    var appConfig = new ConfigParser('config.xml');
    var variables = appConfig.getPlugin(ctx.opts.plugin.id).variables;
    var appName = appConfig.name();

    var appCode = ctx.opts.options.IOS_EXTENSION_APP_CODE || variables.IOS_EXTENSION_APP_CODE;
    var appGroup = ctx.opts.options.IOS_EXTENSION_APP_GROUP || variables.IOS_EXTENSION_APP_GROUP;
    var projectPath = ctx.opts.options.IOS_EXTENSION_PROJECT_PATH || variables.IOS_EXTENSION_PROJECT_PATH || `platforms/ios/${appName}.xcodeproj`;
    var projectMainTarget = ctx.opts.options.IOS_EXTENSION_PROJECT_MAIN_TARGET || variables.IOS_EXTENSION_PROJECT_MAIN_TARGET || appName;

    if (!(appCode && appGroup && projectPath && projectMainTarget)) {
        return;
    }

    var command = ` export GEM_HOME=plugins/${ctx.opts.plugin.id}/gems;
                    gem install --install-dir plugins/${ctx.opts.plugin.id}/gems mmine;
                    ./plugins/${ctx.opts.plugin.id}/gems/bin/mmine integrate --cordova\
                    -a ${appCode}\
                    -p "${ctx.opts.projectRoot}/${projectPath}"\
                    -t "${projectMainTarget}"\
                    -g ${appGroup}
                    export GEM_HOME=$GEM_PATH`;

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