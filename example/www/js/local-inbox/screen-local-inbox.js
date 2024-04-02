/**
 * Created by aberezhnoy on 13/07/2017.
 */

(function(global) {
    var utils = global.utils;
    var ListView = global.ListView;

    var LocalInboxScreen = {
        NAME: "LOCAL_INBOX_SCREEN",

        rootNode: null,
        handler: null,
        listView: null,
        messages: null,

        init: function() {
            var _this = this;
            this.rootNode = utils.fromTemplate("screen-local-inbox");
            this.messages = [];
            this.listView = new ListView(this.messages);
            this.listView.itemRenderer(this._itemRenderer);
            this.formNode = this.rootNode.querySelector("form.local-inbox");

            this.formNode.addEventListener("submit", function() {
                var selected_index = _this.formNode.elements["languages"].selectedIndex;
                var language
                if(selected_index > 0) {
                    language = _this.formNode.elements["languages"].options[selected_index].value;
                } else {
                    language = "en";
                }
                _this._showChat();
                _this._setLanguage(language);
            });

            this.formNode.addEventListener("click", function() {
                _this._registerForAndroidRemoteNotifications();
            })

            try {
                this._loadMessages(function() {
                    _this._initMessageReceiver();
                });
            } catch (e) {
                utils.log("Error initializing message storage: " + e);
                this._initMessageReceiver();
            }
        },

        title: function() {
            return "Local Inbox";
        },

        meta: function() {
            return {
                naviTitle: "Local Inbox",
                naviIcon: "icon-list"
            };
        },

        eventHandler: function(handler) {
            this.handler = handler;
        },

        render: function() {
            this._checkForEmptyAndRender();
            return this.rootNode;
        },

        activate: function() {
            //
        },

        deactivate: function() {
            //
        },

        _itemRenderer: function(message) {
            var itemNode = utils.fromTemplate("list-item");
            itemNode.querySelector(".message").appendChild(utils.textNode(message.body));
            itemNode.querySelector(".time").appendChild(utils.textNode(utils.timeFromTimestamp(message.receivedTimestamp)));

            return itemNode;
        },

        /**
         * Subscriber to plugin 'messageReceived' event to start receiving messages
         */
        _initMessageReceiver: function() {
            var _this = this;

            MobileMessaging.register("messageReceived", function(message) {
                _this.messages.push(message);
                _this._checkForEmptyAndRender();
            });
        },

        /**
         * Load messages from build-in message storage if its enabled
         */
        _loadMessages: function(ready) {
            var _this = this;
            var messageStore = MobileMessaging.defaultMessageStorage();

            if (messageStore) {
                messageStore.findAll(function(messages){
                    Array.prototype.push.apply(_this.messages, messages);
                    _this._checkForEmptyAndRender();
                    ready();
                });
            } else {
                ready();
            }
        },

        _checkForEmpty: function() {
            if (this.messages.length > 0) {
                this.rootNode.classList.remove("empty");
            } else {
                this.rootNode.classList.add("empty");
            }
        },

        _checkForEmptyAndRender: function() {
            this._checkForEmpty();
            var listNode = this.listView.render();
            if (listNode.parentNode !== this.rootNode) {
                this.rootNode.appendChild(listNode);
            }
        },

        /**
         * Set chat language
         */
        _setLanguage: function(language) {
            MobileMessaging.setLanguage(language,function(e) {
                utils.log("Error set language: " + e);
            });
        },

        /**
         * Show in app chat
         */
        _showChat: function() {
            MobileMessaging.showChat();
        },

        /**
         * Register for Android 13 Notifications
         */
        _registerForAndroidRemoteNotifications: function() {
            MobileMessaging.registerForAndroidRemoteNotifications();
        }
    };

    global.LocalInboxScreen = LocalInboxScreen;
})(ibglobal);
