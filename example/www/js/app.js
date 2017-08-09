/**
 * Created by aberezhnoy on 13/07/2017.
 */

(function(global) {
    var utils = global.utils;
    var Layout = global.Layout;
    var InboxScreen = global.InboxScreen;
    var SettingsScreen = global.SettingsScreen;

    var APP_CODE = "your-app-code-here";
    var ANDROID_SENDER_ID = "android-sender-id-here";

    /**
     * Bootstrap object
     */
    var Application = {
        screens: null,
        currentScreen: null,

        init: function() {
            this.screens = {};

            this.initMobileMessaging();

            Layout.init();
            this.addScreen(InboxScreen);
            this.addScreen(SettingsScreen);
            this.show(InboxScreen.NAME);
        },

        addScreen: function(screen) {
            var _this = this;
            screen.init();
            this.screens[screen.NAME] = screen;
            var options = screen.meta();
            options.width = "50%";
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
                    geofencingEnabled: true,
                    defaultMessageStorage: true,    // use build in message storage or not
                    android: {
                        senderId: ANDROID_SENDER_ID
                    },
                    ios: {
                        notificationTypes: ['alert', 'badge', 'sound']
                    }
                },

                function(error) {
                    utils.log('Init error: ' + error);
                }
            );

            MobileMessaging.register("notificationTapped", function(message) {
                if (message.customPayload && message.customPayload.url) {
                    var url = message.customPayload.url;
                    cordova.InAppBrowser.open(url, "_blank", "location=yes");
                }
            });
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
