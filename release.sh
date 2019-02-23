#!/bin/bash

git remote rm github

# Find last git tag and create commit log
LAST_TAG=`git describe --tags --abbrev=0`
RELEASE_COMMIT_LOG=`git log $LAST_TAG..HEAD --oneline`

# Save commit log to property file as a property
# (replacing newlines with "\n")
echo RELEASE_COMMIT_LOG="${RELEASE_COMMIT_LOG//$'\n'/\\n}" > $PROPERTIES_FILE

# Bump version
./newversion $RELEASE_VERSION

# Remove package lock (temporary)
rm -f package-lock.json

## Install Carthage
## brew install carthage
# cd libs/ios/
# /usr/local/bin/carthage update --cache-builds
# rm -f Carthage/Build/iOS/*.bcsymbolmap
# rm -f Carthage/Build/iOS/*.dSYM
# cd ../../

git add .

# Commit release version
git commit -a -m "Release: $RELEASE_VERSION"

# Create and push tag
git tag $RELEASE_VERSION -m "Release: $RELEASE_VERSION"

# Push changes
git push origin master --tags