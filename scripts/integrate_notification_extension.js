#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var EXTENSION_NAME = 'MobileMessagingNotificationServiceExtension';
var EXTENSION_DIR_NAME = 'NotificationServiceExtension';
var COMMENT_KEY = /_comment$/;

module.exports = function (ctx) {
    if (ctx.opts.platforms.indexOf('ios') < 0) {
        return;
    }

    var xcode, plist;
    try {
        xcode = require(path.join(ctx.opts.projectRoot, 'node_modules', 'xcode'));
        plist = require(path.join(ctx.opts.projectRoot, 'node_modules', 'plist'));
    } catch (e) {
        console.log('ERROR: Missing required modules (xcode, plist). These are dependencies of cordova-ios. Run "npm install" in your project root.');
        return;
    }
    var ConfigParser = ctx.requireCordovaModule('cordova-common').ConfigParser;
    var config = new ConfigParser('config.xml');

    var pluginConfig = config.getPlugin('com-infobip-plugins-mobilemessaging');
    var variables = pluginConfig ? pluginConfig.variables : {};
    var appGroup = variables.IOS_EXTENSION_APP_GROUP;
    if (!appGroup) {
        return;
    }

    var projectName = config.name().normalize('NFD');
    var bundleId = config.packageName();
    var projectRoot = ctx.opts.projectRoot;
    var iosPlatformPath = path.join(projectRoot, 'platforms', 'ios');
    var xcodeProjectPath = path.join(iosPlatformPath, projectName + '.xcodeproj', 'project.pbxproj');

    if (!fs.existsSync(xcodeProjectPath)) {
        console.log('WARNING: Xcode project not found at ' + xcodeProjectPath + ', skipping NSE integration.');
        return;
    }

    var extensionDir = path.join(iosPlatformPath, EXTENSION_DIR_NAME);
    var entitlementsPath = path.join(iosPlatformPath, EXTENSION_NAME + '.entitlements');
    var podfilePath = path.join(iosPlatformPath, 'Podfile');
    var mainInfoPlistPath = path.join(iosPlatformPath, projectName, projectName + '-Info.plist');

    var pluginDir = ctx.opts.plugin ? ctx.opts.plugin.dir : path.join(projectRoot, 'plugins', 'com-infobip-plugins-mobilemessaging');
    var resourcesDir = path.join(pluginDir, 'resources', 'ios');
    var mmVersion = getMobileMessagingVersion(pluginDir);

    var swiftVersion = config.getPreference('SwiftVersion', 'ios');
    if (!swiftVersion) {
        console.log('ERROR: SwiftVersion preference is not set. Add <preference name="SwiftVersion" value="5.0" /> inside <platform name="ios"> in your config.xml.');
    }

    console.log('-----------------------------');
    console.log('Infobip: Integrating Notification Service Extension');

    // Step 1: Create template files on disk
    createExtensionFiles(extensionDir, entitlementsPath, appGroup, resourcesDir, plist);

    // Step 2: Modify Xcode project (only when extension target doesn't exist yet)
    var xcodeProject = xcode.project(xcodeProjectPath);
    xcodeProject.parseSync();

    var existingTarget = xcodeProject.pbxTargetByName(EXTENSION_NAME);
    if (!existingTarget) {
        addExtensionTarget(xcodeProject);
        updateExtensionBuildSettings(xcodeProject, projectName, bundleId);
        addSourceToExtension(xcodeProject);
        renameEmbedPhase(xcodeProject);
        setTargetAttributes(xcodeProject);

        var pbxContent = xcodeProject.writeSync();
        pbxContent = fixBuildConfigOrdering(pbxContent, projectName);
        fs.writeFileSync(xcodeProjectPath, pbxContent);
    } else {
        console.log('Infobip: Extension target already exists, skipping Xcode project modifications.');
    }

    // Step 3: Update main app entitlements with app group
    updateMainEntitlements(iosPlatformPath, projectName, appGroup, plist);

    // Step 4: Set app group in main Info.plist
    setAppGroupInInfoPlist(mainInfoPlistPath, appGroup, plist);

    // Step 5: Modify Podfile
    modifyPodfile(podfilePath, projectName, mmVersion);

    // Step 6: Run pod install
    runPodInstall(iosPlatformPath);

    console.log('Infobip: Notification Service Extension integration complete');
    console.log('-----------------------------');
};

function createExtensionFiles(extensionDir, entitlementsPath, appGroup, resourcesDir, plist) {
    if (!fs.existsSync(extensionDir)) {
        fs.mkdirSync(extensionDir, { recursive: true });
        console.log('Infobip: Created ' + EXTENSION_DIR_NAME + '/');
    }

    var swiftDest = path.join(extensionDir, 'NotificationService.swift');
    if (!fs.existsSync(swiftDest)) {
        fs.copyFileSync(path.join(resourcesDir, 'NotificationService.swift'), swiftDest);
        console.log('Infobip: Created NotificationService.swift');
    }

    var plistDest = path.join(extensionDir, EXTENSION_NAME + '.plist');
    if (!fs.existsSync(plistDest)) {
        fs.copyFileSync(path.join(resourcesDir, EXTENSION_NAME + '.plist'), plistDest);
        console.log('Infobip: Created ' + EXTENSION_NAME + '.plist');
    }

    var entitlementsObj = { 'com.apple.security.application-groups': [appGroup] };
    if (fs.existsSync(entitlementsPath)) {
        var existingData = plist.parse(fs.readFileSync(entitlementsPath, 'utf-8'));
        var existingGroups = existingData['com.apple.security.application-groups'] || [];
        if (existingGroups.length === 1 && existingGroups[0] === appGroup) return;
        console.log('Infobip: Updating ' + EXTENSION_NAME + '.entitlements with App Group: ' + appGroup);
    } else {
        console.log('Infobip: Created ' + EXTENSION_NAME + '.entitlements');
    }
    fs.writeFileSync(entitlementsPath, plist.build(entitlementsObj), 'utf-8');
}

function addExtensionTarget(xcodeProject) {
    console.log('Infobip: Creating extension target: ' + EXTENSION_NAME);
    xcodeProject.addTarget(EXTENSION_NAME, 'app_extension', EXTENSION_DIR_NAME);

    var nativeTargets = xcodeProject.pbxNativeTargetSection();
    var extensionTargetUuid = findExtensionTargetUuid(nativeTargets);
    if (extensionTargetUuid) {
        xcodeProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', extensionTargetUuid);
        xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', extensionTargetUuid);
    }
}

function updateExtensionBuildSettings(xcodeProject, projectName, bundleId) {
    var extensionBundleId = bundleId + '.notification-extension';
    var nativeTargets = xcodeProject.pbxNativeTargetSection();
    var extensionTargetUuid = findExtensionTargetUuid(nativeTargets);

    if (!extensionTargetUuid) {
        console.log('WARNING: Could not find extension target');
        return;
    }

    var extensionTarget = nativeTargets[extensionTargetUuid];
    var configListUuid = extensionTarget.buildConfigurationList;
    var configLists = xcodeProject.pbxXCConfigurationList();
    var configList = configLists[configListUuid];
    var buildConfigs = configList.buildConfigurations;
    var allBuildConfigs = xcodeProject.pbxXCBuildConfigurationSection();

    // Read main target signing settings
    var mainTarget = xcodeProject.getFirstTarget();
    var mainConfigListUuid = mainTarget.firstTarget.buildConfigurationList;
    var mainConfigList = configLists[mainConfigListUuid];
    var mainBuildConfigs = mainConfigList.buildConfigurations;

    var signingSettings = {};
    var mainDeploymentTarget = '15.0';
    for (var i = 0; i < mainBuildConfigs.length; i++) {
        var mainConfigUuid = mainBuildConfigs[i].value;
        var mainConfig = allBuildConfigs[mainConfigUuid];
        if (!mainConfig || !mainConfig.buildSettings) continue;
        var configName = mainConfig.name || mainBuildConfigs[i].comment;
        signingSettings[configName] = {
            DEVELOPMENT_TEAM: mainConfig.buildSettings['DEVELOPMENT_TEAM'],
            CODE_SIGN_IDENTITY: mainConfig.buildSettings['CODE_SIGN_IDENTITY'],
            CODE_SIGN_STYLE: mainConfig.buildSettings['CODE_SIGN_STYLE']
        };
        var dt = mainConfig.buildSettings['IPHONEOS_DEPLOYMENT_TARGET'];
        if (dt && parseFloat(dt) > parseFloat(mainDeploymentTarget)) {
            mainDeploymentTarget = dt;
        }
    }

    var deploymentTarget = String(Math.max(parseFloat(mainDeploymentTarget), 15.0));

    for (var j = 0; j < buildConfigs.length; j++) {
        var configUuid = buildConfigs[j].value;
        var cfgName = buildConfigs[j].comment;
        var config = allBuildConfigs[configUuid];
        if (!config || !config.buildSettings) continue;
        var settings = config.buildSettings;

        settings['INFOPLIST_FILE'] = EXTENSION_DIR_NAME + '/' + EXTENSION_NAME + '.plist';
        settings['PRODUCT_BUNDLE_IDENTIFIER'] = '"' + extensionBundleId + '"';
        settings['PRODUCT_NAME'] = '"' + EXTENSION_NAME + '"';
        settings['IPHONEOS_DEPLOYMENT_TARGET'] = deploymentTarget;
        settings['CODE_SIGN_ENTITLEMENTS'] = EXTENSION_NAME + '.entitlements';
        settings['SWIFT_OBJC_BRIDGING_HEADER'] = '""';
        settings['TARGETED_DEVICE_FAMILY'] = '"1,2"';
        settings['GENERATE_INFOPLIST_FILE'] = 'NO';
        settings['MARKETING_VERSION'] = '1.0';
        settings['CURRENT_PROJECT_VERSION'] = '1';
        settings['SKIP_INSTALL'] = 'YES';

        // Align signing with main target
        var signing = signingSettings[cfgName] || signingSettings['Debug'] || {};
        if (signing.DEVELOPMENT_TEAM) {
            settings['DEVELOPMENT_TEAM'] = signing.DEVELOPMENT_TEAM;
        }
        if (signing.CODE_SIGN_IDENTITY) {
            settings['CODE_SIGN_IDENTITY'] = signing.CODE_SIGN_IDENTITY;
        }
        if (signing.CODE_SIGN_STYLE) {
            settings['CODE_SIGN_STYLE'] = signing.CODE_SIGN_STYLE;
        }
    }
}

function addSourceToExtension(xcodeProject) {
    var nativeTargets = xcodeProject.pbxNativeTargetSection();
    var extensionTargetUuid = findExtensionTargetUuid(nativeTargets);
    if (!extensionTargetUuid) return;

    // Check if source already added
    var sourcesPhase = xcodeProject.buildPhaseObject('PBXSourcesBuildPhase', 'Sources', extensionTargetUuid);
    if (!sourcesPhase) {
        console.log('WARNING: Sources build phase not found for extension target');
        return;
    }
    if (sourcesPhase.files && sourcesPhase.files.length > 0) {
        return;
    }

    // Create file reference
    var swiftFileRefUuid = xcodeProject.generateUuid();
    var swiftBuildFileUuid = xcodeProject.generateUuid();

    xcodeProject.pbxFileReferenceSection()[swiftFileRefUuid] = {
        isa: 'PBXFileReference',
        lastKnownFileType: 'sourcecode.swift',
        name: '"NotificationService.swift"',
        path: '"NotificationService.swift"',
        sourceTree: '"<group>"'
    };
    xcodeProject.pbxFileReferenceSection()[swiftFileRefUuid + '_comment'] = 'NotificationService.swift';

    xcodeProject.pbxBuildFileSection()[swiftBuildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: swiftFileRefUuid,
        fileRef_comment: 'NotificationService.swift'
    };
    xcodeProject.pbxBuildFileSection()[swiftBuildFileUuid + '_comment'] = 'NotificationService.swift in Sources';

    // Add to Sources build phase
    sourcesPhase.files.push({
        value: swiftBuildFileUuid,
        comment: 'NotificationService.swift in Sources'
    });

    // Create PBXGroup for extension directory
    var groupUuid = xcodeProject.generateUuid();
    var groups = xcodeProject.hash.project.objects['PBXGroup'];

    // Check if group already exists
    var existingGroupKey = xcodeProject.findPBXGroupKey({ name: EXTENSION_DIR_NAME });
    if (!existingGroupKey) {
        existingGroupKey = xcodeProject.findPBXGroupKey({ name: '"' + EXTENSION_DIR_NAME + '"' });
    }

    if (!existingGroupKey) {
        groups[groupUuid] = {
            isa: 'PBXGroup',
            children: [
                { value: swiftFileRefUuid, comment: 'NotificationService.swift' }
            ],
            name: '"' + EXTENSION_DIR_NAME + '"',
            path: '"' + EXTENSION_DIR_NAME + '"',
            sourceTree: '"<group>"'
        };
        groups[groupUuid + '_comment'] = EXTENSION_DIR_NAME;

        // Add to main group
        var mainGroupKey = xcodeProject.getFirstProject()['firstProject']['mainGroup'];
        var mainGroup = groups[mainGroupKey];
        if (mainGroup && mainGroup.children) {
            var alreadyInGroup = mainGroup.children.some(function (child) {
                return child.comment === EXTENSION_DIR_NAME;
            });
            if (!alreadyInGroup) {
                mainGroup.children.push({
                    value: groupUuid,
                    comment: EXTENSION_DIR_NAME
                });
            }
        }
    }
}

function renameEmbedPhase(xcodeProject) {
    var copyFilesPhases = xcodeProject.hash.project.objects['PBXCopyFilesBuildPhase'];
    if (!copyFilesPhases) return;

    for (var key in copyFilesPhases) {
        if (COMMENT_KEY.test(key)) continue;
        var phase = copyFilesPhases[key];
        if (phase.dstSubfolderSpec === 13) {
            if (phase.name === '"Copy Files"') {
                phase.name = '"Embed App Extensions"';
            }
            var commentKey = key + '_comment';
            if (copyFilesPhases[commentKey] === 'Copy Files') {
                copyFilesPhases[commentKey] = 'Embed App Extensions';
            }

            // Update reference in main target's buildPhases array
            var mainTarget = xcodeProject.getFirstTarget();
            if (mainTarget && mainTarget.firstTarget && mainTarget.firstTarget.buildPhases) {
                var buildPhases = mainTarget.firstTarget.buildPhases;
                for (var i = 0; i < buildPhases.length; i++) {
                    if (buildPhases[i].value === key && buildPhases[i].comment === 'Copy Files') {
                        buildPhases[i].comment = 'Embed App Extensions';
                    }
                }
            }
            break;
        }
    }
}

function setTargetAttributes(xcodeProject) {
    var nativeTargets = xcodeProject.pbxNativeTargetSection();
    var extensionTargetUuid = findExtensionTargetUuid(nativeTargets);

    var projectSection = xcodeProject.pbxProjectSection();
    var projectUuid = Object.keys(projectSection).find(function (key) {
        return !COMMENT_KEY.test(key) && projectSection[key].isa === 'PBXProject';
    });
    if (!projectUuid) return;

    var project = projectSection[projectUuid];
    if (!project.attributes) project.attributes = {};
    if (!project.attributes.TargetAttributes) project.attributes.TargetAttributes = {};

    // Main target capabilities
    var mainTarget = xcodeProject.getFirstTarget();
    if (mainTarget) {
        var mainAttrs = project.attributes.TargetAttributes[mainTarget.uuid] || {};
        if (!mainAttrs.SystemCapabilities) mainAttrs.SystemCapabilities = {};
        mainAttrs.SystemCapabilities['com.apple.ApplicationGroups.iOS'] = { enabled: 1 };
        mainAttrs.SystemCapabilities['com.apple.Push'] = { enabled: 1 };
        mainAttrs.SystemCapabilities['com.apple.BackgroundModes'] = { enabled: 1 };
        project.attributes.TargetAttributes[mainTarget.uuid] = mainAttrs;
    }

    // Extension target capabilities
    if (extensionTargetUuid) {
        var extAttrs = project.attributes.TargetAttributes[extensionTargetUuid] || {};
        if (!extAttrs.SystemCapabilities) extAttrs.SystemCapabilities = {};
        extAttrs.SystemCapabilities['com.apple.ApplicationGroups.iOS'] = { enabled: 1 };
        project.attributes.TargetAttributes[extensionTargetUuid] = extAttrs;
    }
}

function updateMainEntitlements(iosPlatformPath, projectName, appGroup, plist) {
    var entitlementFiles = ['Entitlements-Debug.plist', 'Entitlements-Release.plist'];
    var platformPath = path.join(iosPlatformPath, projectName);
    var updated = false;

    entitlementFiles.forEach(function (fileName) {
        var filePath = path.join(platformPath, fileName);
        if (!fs.existsSync(filePath)) return;

        var data = fs.readFileSync(filePath, 'utf-8');
        var entitlements = plist.parse(data);

        var groups = entitlements['com.apple.security.application-groups'] || [];
        if (groups.indexOf(appGroup) === -1) {
            groups.push(appGroup);
        }
        entitlements['com.apple.security.application-groups'] = groups;
        fs.writeFileSync(filePath, plist.build(entitlements), 'utf-8');
        updated = true;
    });

    if (updated) {
        console.log('Infobip: Updated main app entitlements with App Group: ' + appGroup);
    }
}

function setAppGroupInInfoPlist(mainInfoPlistPath, appGroup, plist) {
    if (!fs.existsSync(mainInfoPlistPath)) return;

    var data = fs.readFileSync(mainInfoPlistPath, 'utf-8');
    var infoPlist = plist.parse(data);

    if (infoPlist['com.mobilemessaging.app_group'] === appGroup) return;

    infoPlist['com.mobilemessaging.app_group'] = appGroup;
    fs.writeFileSync(mainInfoPlistPath, plist.build(infoPlist), 'utf-8');
    console.log('Infobip: Set com.mobilemessaging.app_group in Info.plist');
}

function modifyPodfile(podfilePath, projectName, mmVersion) {
    if (!fs.existsSync(podfilePath)) return;

    var podfileContent = fs.readFileSync(podfilePath, 'utf-8');
    if (podfileContent.indexOf("target '" + EXTENSION_NAME + "'") !== -1) {
        return;
    }

    var podLine = mmVersion
        ? "\tpod 'MobileMessagingNotificationExtension', '" + mmVersion + "'\n"
        : "\tpod 'MobileMessagingNotificationExtension'\n";

    var extensionBlock = "\ntarget '" + EXTENSION_NAME + "' do\n" +
        "\tproject '" + projectName + ".xcodeproj'\n" +
        podLine +
        "end\n";

    podfileContent += extensionBlock;
    fs.writeFileSync(podfilePath, podfileContent, 'utf-8');
    console.log('Infobip: Added extension target to Podfile');
}

function runPodInstall(iosPlatformPath) {
    var execSync = require('child_process').execSync;
    try {
        console.log('Infobip: Running pod install...');
        execSync('pod install', { cwd: iosPlatformPath, stdio: 'inherit' });
    } catch (e) {
        console.log('WARNING: pod install failed: ' + (e.message || e) + '. Run manually in: ' + iosPlatformPath);
    }
}

function getMobileMessagingVersion(pluginDir) {
    var pluginXmlPath = path.join(pluginDir, 'plugin.xml');
    if (!fs.existsSync(pluginXmlPath)) return null;

    var content = fs.readFileSync(pluginXmlPath, 'utf-8');
    var match = content.match(/<pod\s+name="MobileMessaging"\s+spec="([^"]+)"/);
    return match ? match[1] : null;
}

function fixBuildConfigOrdering(pbxContent, projectName) {
    // The xcode module's writeSync() sorts XCBuildConfiguration entries by UUID.
    // This can place extension configs (with INFOPLIST_FILE pointing to extension plist)
    // before main app configs. Cordova's projectFile.js uses Object.values().find() to
    // get the FIRST config with INFOPLIST_FILE and expects it to be the main app's.
    // If the extension's config comes first, cordova fails with
    // "Could not find *-Info.plist file".
    //
    // Fix: reorder so main app configs appear before extension configs in the
    // XCBuildConfiguration section.

    var sectionStartMarker = '/* Begin XCBuildConfiguration section */';
    var sectionEndMarker = '/* End XCBuildConfiguration section */';
    var sectionStart = pbxContent.indexOf(sectionStartMarker);
    var sectionEnd = pbxContent.indexOf(sectionEndMarker);
    if (sectionStart === -1 || sectionEnd === -1) return pbxContent;

    var sectionContent = pbxContent.substring(sectionStart + sectionStartMarker.length, sectionEnd);

    // Split into individual config blocks by finding UUID patterns at start of blocks
    // Each block starts with \t\tUUID /* name */ = { and ends with \t\t};
    var blockPattern = /(\t\t[0-9A-Fa-f]{24}\s+\/\*[^*]*\*\/\s+=\s+\{[\s\S]*?\n\t\t\};)/g;
    var blocks = [];
    var m;
    while ((m = blockPattern.exec(sectionContent)) !== null) {
        blocks.push(m[1]);
    }

    if (blocks.length === 0) return pbxContent;

    var mainInfoPlist = projectName + '-Info.plist';
    var mainBlocks = [];
    var otherBlocks = [];

    blocks.forEach(function (block) {
        if (block.indexOf(mainInfoPlist) !== -1) {
            mainBlocks.push(block);
        } else {
            otherBlocks.push(block);
        }
    });

    // Only reorder if main blocks were found and aren't already first
    if (mainBlocks.length === 0) return pbxContent;

    var reorderedSection = '\n' + mainBlocks.concat(otherBlocks).join('\n') + '\n';
    var before = pbxContent.substring(0, sectionStart + sectionStartMarker.length);
    var after = pbxContent.substring(sectionEnd);

    return before + reorderedSection + after;
}

function findExtensionTargetUuid(nativeTargets) {
    for (var key in nativeTargets) {
        if (COMMENT_KEY.test(key)) continue;
        var target = nativeTargets[key];
        if (target.name === EXTENSION_NAME || target.name === '"' + EXTENSION_NAME + '"') {
            return key;
        }
    }
    return null;
}
