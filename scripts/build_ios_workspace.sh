#!/bin/bash

WORKSPACE=
SCHEME=
DESTINATION=

while [[ $# -gt 0 ]]
do
key="$1"
case $key in
    -workspace)
    WORKSPACE="$2"
    shift
    ;;
    -scheme)
    SCHEME="$2"
    shift
    ;;
    -destination)
    DESTINATION="$2"
    shift
    ;;
    *)
    ;;
esac
shift
done

DESTINATION="${DESTINATION:=platform=iOS Simulator,name=iPhone 6 Plus,OS=10.2}"

if [ ! "$WORKSPACE" ] || [ ! "$SCHEME" ]; then
	echo "Please provide -workspace and -scheme arguments."
else
    cordova prepare
	pod update
    xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration Debug -destination "$DESTINATION" build
	echo "Done! Now you can perform \"$ cordova build\"."
fi
