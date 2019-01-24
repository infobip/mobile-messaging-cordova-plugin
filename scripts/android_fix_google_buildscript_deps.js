#!/usr/bin/env node

// Credit: https://gist.github.com/kkleokrish/ac794fc3280bf23e81cce9b6a7f138f9
// Define hook in your config <hook src="scripts/cordova-classpath-deps-fix.js" type="before_prepare" />

var sourceDir = '';
var platformDir = 'platforms/android';

var fs = require('fs');
var path = require('path');
var readline = require("readline");

module.exports = function(ctx) {

    if (ctx.opts.platforms.indexOf('android') < 0) {
        return;
    }

	console.log('-----------------------------');
    console.log('Cordova Classpath Deps Fix');

    var Q = ctx.requireCordovaModule('q');
    var deferred = Q.defer();

    var platformRoot = path.join(ctx.opts.projectRoot, 'platforms/android');
    var gradle = path.join(platformRoot, 'build.gradle');
    console.log(gradle);
    fs.readFile(gradle, 'utf8', function (err,data) {
        if (err) {
            console.log(err);
            deferred.reject(err);
            return;
        }

        // check if already there
        if (data.match(/(classpath \'com\.google\.gms:google\-services:.*\')/)) {
        	console.log('complete, no changes needed');
            console.log('-----------------------------');
        	deferred.resolve();
        	return;
        }

        var result = data.replace(/(classpath \'com\.android\.tools\.build:gradle:.*\')/, 
        '$1\n        classpath \'com.google.gms:google-services:4.2.0\'');

        fs.writeFile(gradle, result, 'utf8', function (err) {
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