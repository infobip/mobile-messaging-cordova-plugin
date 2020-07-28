#!/usr/bin/env node

var Q = require('./q.js');
var fs = require('fs');
var path = require('path');
var readline = require("readline");
var gradleRelativePath = 'platforms/android/com-infobip-plugins-mobilemessaging/cordova-mobile-messaging-aar.gradle';

module.exports = function(ctx) {

    if (ctx.opts.platforms.indexOf('android') < 0) {
        return;
    }

    var args = process.argv.slice(2);
    var hmsBuild = args.includes("--hms");
    console.log("HMS Build:  " + hmsBuild);

    function updateIsHmsBuild(isHmsBuild) {
        var deferred = Q.defer();
        var gradlePath = path.join(ctx.opts.projectRoot, gradleRelativePath);
        fs.readFile(gradlePath, 'utf8', function (err,data) {
            if (err) {
                console.log(err);
                deferred.reject(err);
                return;
            }

            var search = "def isHmsBuild = " + (!isHmsBuild);
            var replace = "def isHmsBuild = " + isHmsBuild;
            var result = data.replace(new RegExp(search,"g"), replace);

            fs.writeFile(gradlePath, result, 'utf8', function (err) {
                if (err) {
                    console.log('error');
                    console.log('-----------------------------');
                    deferred.reject(err);
                }
                console.log('complete');
                console.log('-----------------------------');
                deferred.resolve();
            });
        });

        return deferred.promise;
    }

    if (hmsBuild) {
        return updateIsHmsBuild(true);
    } else {
        return updateIsHmsBuild(false);
    }
}