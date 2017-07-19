/**
 * Created by aberezhnoy on 14/07/2017.
 */

(function(global) {
    var utils = global.utils;
    var Layout = global.Layout;

    var SettingsScreen = {
        NAME: "SETTINGS_SCREEN",

        rootNode: null,
        formNode: null,

        init: function() {
            var _this = this;
            this.rootNode = utils.fromTemplate("screen-settings");
            this.formNode = this.rootNode.querySelector("form.user-data");

            this.formNode.addEventListener("submit", function(evt) {
                evt.preventDefault();
                _this._saveUserData();
            });

            this.formNode.addEventListener("change", function(evt) {
                var inputNode = evt.target;

                if (inputNode.nodeName.toLowerCase() === "input") {
                    inputNode.classList.add("changed");
                }
            });
        },

        title: function() {
            return "Settings";
        },

        meta: function() {
            return {
                naviTitle: "Settings",
                naviIcon: "icon-gear"
            };
        },

        eventHandler: function(handler) {
            this.handler = handler;
        },

        render: function() {
            return this.rootNode;
        },

        activate: function() {
            this._fetchUserData();
        },

        deactivate: function() {
            //
        },

        /**
         * Fetch user data from cloud
         */
        _fetchUserData: function() {
            var _this = this;

            Layout.busy(true);
            MobileMessaging.fetchUserData(
                function(userData) {
                    _this._populateUserData(userData);
                    Layout.busy(false);
                },
                function(error) {
                    utils.log('Error while syncing user data: ' + error);
                    Layout.busy(false);
                }
            );
        },

        _populateUserData: function(userData) {
            var formInputNodes = this.formNode.elements;

            for (var i = 0, max = formInputNodes.length; i < max; i++) {
                var inputNode = formInputNodes[i];
                var name = inputNode.getAttribute("name");
                inputNode.value = userData[name] || "";
                inputNode.classList.remove("changed");
            }
        },

        /**
         * Store user data in cloud
         */
        _saveUserData: function() {
            var _this = this;
            var userData = this._collectUserData();

            Layout.busy(true);
            MobileMessaging.syncUserData(
                userData,

                function(userData) {
                    // after storing to cloud, we should render retrieved data from cloud
                    _this._populateUserData(userData);
                    Layout.busy(false);
                    utils.log('User data synchronized:' + JSON.stringify(userData));
                },

                function(error) {
                    Layout.busy(false);
                    utils.log('Error while syncing user data: ' + error);
                }
            );
        },

        _collectUserData: function() {
            var formInputNodes = this.formNode.elements;
            var userData = {};

            for (var i = 0, max = formInputNodes.length; i < max; i++) {
                var inputNode = formInputNodes[i];
                var name = inputNode.getAttribute("name");
                if (!(name && inputNode.classList.contains("changed"))) {
                    continue;
                }

                var value = inputNode.value;

                if (!(value && value.length > 0)) {
                    value = null;
                }

                userData[name] = value;
            }

            return userData;
        }
    };

    global.SettingsScreen = SettingsScreen;
})(ibglobal);
