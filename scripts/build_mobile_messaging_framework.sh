#!/bin/bash
echo "Building MobileMessaging.framework with Carthage started..."
cd plugins/com-infobip-plugins-mobilemessaging/libs/ios/

carthage update --use-xcframeworks --cache-builds
echo "Building MobileMessaging.xcframework with Carthage finished."
cd -
