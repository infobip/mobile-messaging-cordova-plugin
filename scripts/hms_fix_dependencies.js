#!/usr/bin/env node

var Q = require('./q.js');
var fs = require('fs');
var path = require('path');
var gradleRelativePath = 'platforms/android/com-infobip-plugins-mobilemessaging/';

module.exports = function(ctx) {

    if (ctx.opts.platforms.indexOf('android') < 0) {
        return;
    }

    var args = process.argv.slice(2);
    var hmsBuild = args.includes("--hms");
    console.log("HMS Build:  " + hmsBuild);

    function updateIsHmsBuild(isHmsBuild) {
        var deferred = Q.defer();

        var dirContent = fs.readdirSync( gradleRelativePath );
        for (var i = 0; i < dirContent.length; i++) {
            var gradlePath = path.join(ctx.opts.projectRoot, gradleRelativePath, dirContent[i]);
            console.log('Try to fix FCM/HMS dependencies at path:' + gradlePath);
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
        }

        return deferred.promise;
    }

    if (hmsBuild) {
        return updateIsHmsBuild(true);
    } else {
        return updateIsHmsBuild(false);
    }
}