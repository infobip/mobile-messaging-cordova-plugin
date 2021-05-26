#!/bin/bash
echo "Building MobileMessaging.xcframework with Carthage started..."
cd plugins/com-infobip-plugins-mobilemessaging/libs/ios/
carthage update --cache-builds --use-xcframeworks
echo "Building MobileMessaging.xcframework with Carthage finished."
cd -
