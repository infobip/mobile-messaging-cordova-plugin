#!/usr/bin/env node

var exec = require('child_process').exec;
var pluginsWithDependencies = [
	'cordova-custom-config'
];


function puts(error, stdout, stderr) {
    console.log(stdout);
}

pluginsWithDependencies.forEach(function(plugin){
	exec('npm install ' + plugin, puts);
})