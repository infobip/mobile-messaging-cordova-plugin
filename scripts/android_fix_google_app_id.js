#!/usr/bin/env node

// Credit: https://gist.github.com/kkleokrish/ac794fc3280bf23e81cce9b6a7f138f9
// Define hook in your config <hook src="scripts/cordova-classpath-deps-fix.js" type="before_prepare" />

var fs = require('fs');
var path = require('path');
var readline = require("readline");

module.exports = function(ctx) {

    if (ctx.opts.platforms.indexOf('android') < 0) {
        return;
    }

    var ConfigParser = ctx.requireCordovaModule('cordova-common').ConfigParser;
    var appConfig = new ConfigParser('config.xml');
    var variables = appConfig.getPlugin(ctx.opts.plugin.id).variables;

    var googleAppId = ctx.opts.options.ANDROID_FIREBASE_SENDER_ID || variables.ANDROID_FIREBASE_SENDER_ID;
    if (!googleAppId) {
    	console.log("ERROR: 'ANDROID_FIREBASE_SENDER_ID' not defined");
    	return;
    }

	console.log('-----------------------------');
    console.log('Cordova Firebase Sender ID fix');

    var Q = ctx.requireCordovaModule('q');
    var deferred = Q.defer();

    var resourcesRoot = path.join(ctx.opts.projectRoot, 'platforms/android/app/src/main/res/values');
    var strings = path.join(resourcesRoot, 'strings.xml');
    console.log(strings);
    fs.readFile(strings, 'utf8', function (err,data) {
        if (err) {
            console.log(err);
            deferred.reject(err);
            return;
        }

        // check if already there
        if (data.match(/(google\_app\_id)/)) {
        	console.log('complete, no changes needed');
            console.log('-----------------------------');
        	deferred.resolve();
        	return;
        }

        var result = data.replace(/(\<\/resources\>)/, 
        '    <string name=\"google_app_id\">' + googleAppId + '</string>\n$1');

        fs.writeFile(strings, result, 'utf8', function (err) {
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
};