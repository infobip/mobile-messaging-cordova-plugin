//
//  android_fix_google_app_id.test.js
//  MobileMessagingCordova
//
// Copyright (c) 2016-2026 Infobip Limited
// Licensed under the Apache License, Version 2.0
//

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const hook = require('../scripts/android_fix_google_app_id');

const modernRoot = 'platforms/android/app/src/main/res/values';
const legacyRoot = 'platforms/android/res/values';
const originalXml = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">Example</string>\n</resources>\n';

async function fixture(t, files, { variables = {}, options = {}, platforms = ['android'], hms = true } = {}) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cordova-hms-hook-'));
    const originalArgv = process.argv;
    process.argv = ['node', 'cordova', 'prepare', ...(hms ? ['--hms'] : [])];
    t.after(async () => {
        process.argv = originalArgv;
        await fs.rm(root, { recursive: true, force: true });
    });
    for (const [relativePath, contents] of Object.entries(files)) {
        const file = path.join(root, relativePath);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, contents);
    }
    const context = {
        opts: { projectRoot: root, platforms, options, plugin: { id: 'com-infobip-plugins-mobilemessaging' } },
        requireCordovaModule(name) {
            assert.equal(name, 'cordova-common');
            return {
                ConfigParser: class {
                    getPlugin() {
                        return { variables: { HUAWEI_SENDER_ID: '123456789', ...variables } };
                    }
                }
            };
        }
    };
    return {
        run: () => hook(context),
        read: relativePath => fs.readFile(path.join(root, relativePath), 'utf8')
    };
}

function assertAppId(xml) {
    assert.match(xml, /<string name="app_id">123456789<\/string>/);
    assert.match(xml, /<string name="app_name">Example<\/string>/);
    assert.equal((xml.match(/name="app_id"/g) || []).length, 1);
}

test('updates strings.xml and remains idempotent for existing Android projects', async t => {
    const file = modernRoot + '/strings.xml';
    const project = await fixture(t, { [file]: originalXml });
    await project.run();
    const updated = await project.read(file);
    assertAppId(updated);
    await project.run();
    assert.equal(await project.read(file), updated);
});

test('updates cdv_strings.xml when Cordova Android 15 has no strings.xml', async t => {
    const file = modernRoot + '/cdv_strings.xml';
    const project = await fixture(t, { [file]: originalXml });
    await project.run();
    assertAppId(await project.read(file));
    await assert.rejects(project.read(modernRoot + '/strings.xml'), { code: 'ENOENT' });
    await project.run();
    assertAppId(await project.read(file));
});

test('prefers strings.xml when both resource files exist', async t => {
    const project = await fixture(t, {
        [modernRoot + '/strings.xml']: originalXml,
        [modernRoot + '/cdv_strings.xml']: originalXml
    });
    await project.run();
    assertAppId(await project.read(modernRoot + '/strings.xml'));
    assert.equal(await project.read(modernRoot + '/cdv_strings.xml'), originalXml);
});

test('retains the legacy Android resource directory', async t => {
    const file = legacyRoot + '/strings.xml';
    const project = await fixture(t, { [file]: originalXml });
    await project.run();
    assertAppId(await project.read(file));
});

test('honors a custom resource directory from plugin variables', async t => {
    const file = 'custom/values/cdv_strings.xml';
    const project = await fixture(t, { [file]: originalXml }, {
        variables: { ANDROID_STRINGS_XML_RELATIVE_PATH: 'custom/values' }
    });
    await project.run();
    assertAppId(await project.read(file));
});

test('command options override the configured resource directory', async t => {
    const project = await fixture(t, {
        'configured/strings.xml': originalXml,
        'override/cdv_strings.xml': originalXml
    }, {
        variables: { ANDROID_STRINGS_XML_RELATIVE_PATH: 'configured' },
        options: { ANDROID_STRINGS_XML_RELATIVE_PATH: 'override' }
    });
    await project.run();
    assertAppId(await project.read('override/cdv_strings.xml'));
    assert.equal(await project.read('configured/strings.xml'), originalXml);
});

test('preserves an app_id already supplied by the application', async t => {
    const file = modernRoot + '/cdv_strings.xml';
    const xml = originalXml.replace('</resources>', '<string name="app_id">987654321</string>\n</resources>');
    const project = await fixture(t, { [file]: xml });
    await project.run();
    assert.equal(await project.read(file), xml);
});

test('does not modify resources for an FCM build', async t => {
    const file = modernRoot + '/cdv_strings.xml';
    const project = await fixture(t, { [file]: originalXml }, { hms: false });
    await project.run();
    assert.equal(await project.read(file), originalXml);
});

test('does not modify resources for an iOS-only build', async t => {
    const file = modernRoot + '/cdv_strings.xml';
    const project = await fixture(t, { [file]: originalXml }, { platforms: ['ios'] });
    await project.run();
    assert.equal(await project.read(file), originalXml);
});

test('still rejects a broken resource directory with neither strings file', async t => {
    const project = await fixture(t, { [modernRoot + '/colors.xml']: '<resources/>' });
    await assert.rejects(project.run(), { code: 'ENOENT' });
});
