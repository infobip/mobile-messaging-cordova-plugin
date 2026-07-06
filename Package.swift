// swift-tools-version:5.9

import PackageDescription

let mmSdkVersion: Version = "15.5.2"
let cordovaIosVersion: Version = "8.1.0"

let package = Package(
    name: "com-infobip-plugins-mobilemessaging",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "com-infobip-plugins-mobilemessaging", targets: ["com-infobip-plugins-mobilemessaging"])
    ],
    dependencies: [
        .package(url: "https://github.com/apache/cordova-ios.git", exact: cordovaIosVersion),
        .package(url: "https://github.com/infobip/mobile-messaging-sdk-ios", exact: mmSdkVersion),
    ],
    targets: [
        .target(
            name: "com-infobip-plugins-mobilemessaging",
            dependencies: [
                .product(name: "Cordova", package: "cordova-ios"),
                .product(name: "MobileMessaging", package: "mobile-messaging-sdk-ios"),
                .product(name: "MobileMessagingInbox", package: "mobile-messaging-sdk-ios"),
                .product(name: "InAppChat", package: "mobile-messaging-sdk-ios"),
            ],
            path: "src/ios",
            exclude: ["MobileMessagingCordova-Bridging-Header.h"],
            resources: []
        )
    ]
)
