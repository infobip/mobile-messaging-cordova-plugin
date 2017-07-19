/**
 * Created by aberezhnoy on 13/07/2017.
 */

(function(global) {
    var utils = global.utils;
    var ListView = global.ListView;

    var InboxScreen = {
        NAME: "INBOX_SCREEN",

        rootNode: null,
        handler: null,
        listView: null,
        messages: null,

        init: function() {
            var _this = this;
            this.rootNode = utils.fromTemplate("screen-inbox");
            this.messages = [];
            this.listView = new ListView(this.messages);
            this.listView.itemRenderer(this._itemRenderer);

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
            return "Messages";
        },

        meta: function() {
            return {
                naviTitle: "Messages",
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
        }
    };

    global.InboxScreen = InboxScreen;
})(ibglobal);
