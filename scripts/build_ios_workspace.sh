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

DESTINATION="${DESTINATION:=generic/platform=iOS Simulator}"

if [ ! "$WORKSPACE" ] || [ ! "$SCHEME" ]; then
	echo "Please provide -workspace and -scheme arguments."
else
    cordova prepare > /dev/null
	pod update > /dev/null
    xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration Debug -destination "$DESTINATION" build > /dev/null

if [ $? != 0 ]
then
echo "Error: check \"$ xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration Debug -destination "$DESTINATION" build\" result"
exit 1
fi

	echo "Done! Now you can perform \"$ cordova build\"."
fi
