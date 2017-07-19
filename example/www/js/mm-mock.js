/**
 * Created by aberezhnoy on 13/07/2017.
 */

(function(global) {
    var MobileMessaging = {
        stub: true,
        handlers: {},
        userData: {
            externalUserId: "default"
        },

        init: function() {
            var c = 0;
        },

        syncUserData: function(userData, success, fail) {
            var localUserData = this.userData;

            setTimeout(function() {
                for (var fieldName in userData) {
                    if (!userData.hasOwnProperty(fieldName)) { continue; }

                    var value = userData[fieldName];

                    if (value === null) {
                        delete localUserData[fieldName];
                    } else {
                        localUserData[fieldName] = value;
                    }
                }

                success(localUserData);
            }, 1000);
        },

        fetchUserData: function (success, fail) {
            var _this = this;
            setTimeout(function() {
                success(_this.userData);
            }, 1000);
        },

        defaultMessageStorage: function() {
            return undefined;
        },

        register: function(eventName, handler) {
            if (!this.handlers[eventName]) {
                this.handlers[eventName] = [];
            }

            this.handlers[eventName].push(handler);
        },

        fire: function(eventName, data) {
            var handler = this.handlers[eventName];

            if (handler && handler instanceof Array) {
                handler.forEach(function(handler) {
                    handler(data);
                });
            }
        }
    };

    global.MMStub = MobileMessaging;
})(ibglobal);
