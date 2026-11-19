// Copyright (c) 2016-2026 Infobip Limited
// Licensed under the Apache License, Version 2.0

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../www/MobileMessagingCordova.js'), 'utf8');

function fixture() {
    const calls = [];
    const context = {
        module: { exports: {} },
        console,
        setTimeout,
        cordova: {
            // Snapshot the JSON payload at the bridge boundary. Keeping the
            // caller's object reference would hide mutations and aliasing.
            exec: (success, error, service, action, args) => calls.push({
                service,
                action,
                args: JSON.parse(JSON.stringify(args))
            }),
            require: () => ({ metadata: { 'com-infobip-plugins-mobilemessaging': 'test' } })
        }
    };
    vm.runInNewContext(source, context);
    return { plugin: context.module.exports, calls };
}

// These tests exercise JavaScript-to-native payload forwarding, not the Java
// parser or SDK builder. Native defaults and token behavior need Android checks.
for (const [name, androidJson, expectedAndroid] of [
    ['true', '{"appManagedFcmTokenLifecycle":true}', { appManagedFcmTokenLifecycle: true }],
    ['false', '{"appManagedFcmTokenLifecycle":false}', { appManagedFcmTokenLifecycle: false }],
    ['missing flag', '{}', {}],
    ['missing Android settings', undefined, undefined]
]) {
    test(`init forwards FCM lifecycle configuration: ${name}`, () => {
        const { plugin, calls } = fixture();
        const config = { applicationCode: 'test-code' };
        if (androidJson !== undefined) config.android = JSON.parse(androidJson);
        plugin.init(config);
        const initCalls = calls.filter(call => call.action === 'init');
        assert.equal(initCalls.length, 1);
        assert.equal(initCalls[0].service, 'MobileMessagingCordova');
        assert.equal(initCalls[0].args.length, 1);
        const payload = initCalls[0].args[0];
        assert.equal(payload.applicationCode, 'test-code');
        assert.deepEqual(payload.android, expectedAndroid);
        assert.equal(Object.hasOwn(payload, 'android'), expectedAndroid !== undefined);
    });
}
