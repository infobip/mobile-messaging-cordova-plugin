// this hook can be removed after following bug is solved: https://github.com/apache/cordova-android/issues/631
module.exports = function (ctx) {
    const exec = require('child_process').exec;

    if (ctx.opts.platforms.indexOf('android') < 0) { // project doesn't support android at all
        return;
    }
    if (ctx.opts.cordova.platforms.length > 0 && ctx.opts.cordova.platforms.indexOf('android') < 0) { // cordova prepare was called for non-android platform
        return;
    }

    exec('export -p platforms/android/ ORG_GRADLE_PROJECT_cdvCompileSdkVersion=android-28');
};