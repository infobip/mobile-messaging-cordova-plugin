//
//  app.js
//  MobileMessagingCordova
//
// Copyright (c) 2016-2025 Infobip Limited
// Licensed under the Apache License, Version 2.0
//

/**
 * Created by aberezhnoy on 13/07/2017.
 */

(function(global) {
    var utils = global.utils;
    var Layout = global.Layout;
    var LocalInboxScreen = global.LocalInboxScreen;
    var InboxScreen = global.InboxScreen;
    var SettingsScreen = global.SettingsScreen;
    var ChatScreen = global.ChatScreen;

    var APP_CODE = <your application code>;

    /**
     * Bootstrap object
     */
    var Application = {
        screens: null,
        currentScreen: null,

        init: function() {
            this.screens = {};

            Layout.init();
            this.addScreen(LocalInboxScreen);
            this.addScreen(InboxScreen);
            this.addScreen(SettingsScreen);
            this.addScreen(ChatScreen);
            this.show(LocalInboxScreen.NAME);

            this.registerForEvents();

            this.initMobileMessaging();
        },

        addScreen: function(screen) {
            var _this = this;
            screen.init();
            this.screens[screen.NAME] = screen;
            var options = screen.meta();
            options.width = "25%";
            Layout.addButton(screen.NAME, options, function() {
                _this.show(screen.NAME);
            });
        },

        show: function(name) {
            var newScreen = this.screens[name];

            if (!newScreen) {
                throw "Screen `" + name + "` not found";
            }

            if (this.currentScreen) {
                this.currentScreen.deactivate();
            }

            Layout.content(newScreen.render());
            this.currentScreen = newScreen;
            Layout.title(newScreen.title());
            Layout.setActiveButton(name);
            newScreen.activate();
        },

        /**
         * Initializing MobileMessaging plugin here
         */
        initMobileMessaging: function() {
            MobileMessaging.init({
                    applicationCode: APP_CODE,
                    fullFeaturedInAppsEnabled: true,
                    defaultMessageStorage: true,    // use build in message storage or not
                    loggingEnabled: true,  // to record logs
                    inAppChatEnabled: true,
                    ios: {
                        notificationTypes: ['alert', 'badge', 'sound'],
                    },
                    android: {
                        withBannerForegroundNotificationsEnabled: true
                    }
                },
                function () {
                    console.log(`Mobile Messaging SDK has started initialization process. Register for registrationUpdated event to know when it's ready to be used.`)
                },
                function(error) {
                    utils.log('Init error: ' + error);
                }
            );
        },
        registerForEvents: function() {
            var _this = this;
            MobileMessaging.register("notificationTapped", function(message) {
                if (!message.deeplink) {
                    return;
                }
                _this.handleDeeplinkEvent(message.deeplink);
            });

            MobileMessaging.register("deeplink", function(deeplinkPath) {
                _this.handleDeeplinkEvent(deeplinkPath);
            });
        },
        handleDeeplinkEvent: function (deeplink) {
            if (!deeplink) {
                utils.log('Deeplink is not provided');
                return;
            }
            var pathSegments = new URL(deeplink).pathname.split('/');
            for (var pathSegment of pathSegments) {
                if (pathSegment && this.screens[pathSegment]) {
                    this.show(pathSegment);
                }
            }
        }
    };

    document.addEventListener('deviceready', function() {
        if (cordova.platformId === "browser") {
            window.MobileMessaging = global.MMStub;
        }

        // Initialize application when the device is ready.
        Application.init();
    }, false);
})(ibglobal);
