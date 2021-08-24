module.exports = function(ctx) {
    if (ctx.opts.platforms.indexOf('ios') < 0) { // project doesn't support ios at all
        return;
    }
    if (ctx.opts.cordova.platforms.length > 0 && ctx.opts.cordova.platforms.indexOf('ios') < 0) { // corodova prepare was explicitly called for non-ios platforms
        return;
    }

    var ConfigParser = ctx.requireCordovaModule('cordova-common').ConfigParser;
    var appConfig = new ConfigParser('config.xml');
    var pluginConfig = appConfig.getPlugin(ctx.opts.plugin.id);

    if (pluginConfig === undefined) {
        console.log("ERROR: Missing plugin variables. It's required to provide 'IOS_EXTENSION_APP_CODE' and 'IOS_EXTENSION_APP_GROUP'");
        console.log('-----------------------------');
        return;
    }
    var variables = pluginConfig.variables;
    var appName = appConfig.name();

    if (ctx.opts.options === undefined) {
        console.log("WARNING: iOS platform is not added, mobile messaging plugin can't proceed. Call 'cordova prepare ios' after ios platform will be added.");
        return;
    }

    var appCode = ctx.opts.options.IOS_EXTENSION_APP_CODE || variables.IOS_EXTENSION_APP_CODE;
    var appGroup = ctx.opts.options.IOS_EXTENSION_APP_GROUP || variables.IOS_EXTENSION_APP_GROUP;
    var projectPath = ctx.opts.options.IOS_EXTENSION_PROJECT_PATH || variables.IOS_EXTENSION_PROJECT_PATH || `platforms/ios/${appName}.xcodeproj`;
    var projectMainTarget = ctx.opts.options.IOS_EXTENSION_PROJECT_MAIN_TARGET || variables.IOS_EXTENSION_PROJECT_MAIN_TARGET || appName;
    var overrideSigning = ctx.opts.options.IOS_OVERRIDE_EXTENSION_SIGNING || variables.IOS_OVERRIDE_EXTENSION_SIGNING;


    if (!(appCode && appGroup && projectPath && projectMainTarget)) {
        console.log("ERROR: 'IOS_EXTENSION_APP_CODE' or 'IOS_EXTENSION_APP_GROUP' or 'IOS_EXTENSION_PROJECT_PATH' or 'IOS_EXTENSION_PROJECT_MAIN_TARGET' not defined");
        console.log('-----------------------------');
        return;
    }

    var command = ` export GEM_HOME=plugins/${ctx.opts.plugin.id}/gems;
                    gem install --install-dir plugins/${ctx.opts.plugin.id}/gems mmine -v 0.9.9;
                    ./plugins/${ctx.opts.plugin.id}/gems/bin/mmine integrate -a ${appCode}\
                    -p "${ctx.opts.projectRoot}/${projectPath}"\
                    -t "${projectMainTarget}"\
                    -g ${appGroup}\
                    -c -x`;

    if (overrideSigning === "true") {
        command += '-s ';
    }
    command += ';';
    command += '\nexport GEM_HOME=$GEM_PATH';

    console.log("Command:  " + command);



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
