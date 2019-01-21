#!/usr/bin/env node

const exec = require('child_process').exec;
const pluginsWithDependencies = [
	'cordova-custom-config'
];

function puts(error, stdout, stderr) {
    console.log(stdout);
}

pluginsWithDependencies.forEach(function(plugin){
	exec('npm install ' + plugin, puts);
});