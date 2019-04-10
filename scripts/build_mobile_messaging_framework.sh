#!/bin/bash
echo "Building MobileMessaging.framework with Carthage started..."
cd plugins/com-infobip-plugins-mobilemessaging/libs/ios/
carthage update --cache-builds
echo "Building MobileMessaging.framework with Carthage finished."
cd -