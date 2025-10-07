//
//  screen-inbox.js
//  MobileMessagingCordova
//
// Copyright (c) 2016-2025 Infobip Limited
// Licensed under the Apache License, Version 2.0
//

/**
 * Created by aberezhnoy on 13/07/2017.
 */

(function (global) {
    var utils = global.utils;
    var ListView = global.ListView;
    var Layout = global.Layout;

    var InboxScreen = {
        NAME: "INBOX_SCREEN",

        rootNode: null,
        handler: null,
        listView: null,
        userData: null,
        inboxMessages: null,

        init: function () {
            var _this = this;
            this.rootNode = utils.fromTemplate("screen-inbox");
            this.inboxMessages = [];
            this.listView = new ListView(this.inboxMessages);
            this.listView.itemRenderer(this._itemRenderer);

            this.formInboxNode = this.rootNode.querySelector("form.inbox-filtering-form");
            this.formGetInboxNode = this.rootNode.querySelector("form.get-inbox");
            this.formSetInboxNode = this.rootNode.querySelector("form.set-inbox-seen");

            this.formGetInboxNode.addEventListener("click", function () {
                if (_this.userData !== null && _this.userData.externalUserId !== null) {
                    utils.log("Filtering options: " + JSON.stringify(_this._setFilteringOptions()));
                    _this._fetchInboxMessagesWithoutToken(_this.userData.externalUserId, _this._setFilteringOptions());
                } else {
                    utils.log("User data is not fetched!" + JSON.stringify(_this.userData));
                }
            })

            this.formSetInboxNode.addEventListener("click", function () {
                if (_this.userData !== null && _this.inboxMessages.length > 0) {
                    let messageIds = [];
                    for (let i = 0; i < _this.inboxMessages.length; i++) {
                        messageIds.push(_this.inboxMessages[_this.inboxMessages.length - 1].messageId);
                    }
                    _this._setInboxMessagesSeen(_this.userData.externalUserId, messageIds);
                } else {
                    utils.log("Error setting inbox messages seen" + JSON.stringify(_this.inboxMessages));
                }
            });
        },

        title: function () {
            return "Inbox";
        },

        meta: function () {
            return {
                naviTitle: "Inbox",
                naviIcon: "icon-list"
            };
        },

        eventHandler: function (handler) {
            this.handler = handler;
        },

        render: function () {
            this._checkForEmptyAndRender();
            return this.rootNode;
        },

        activate: function () {
            this._fetchUserData();
        },

        deactivate: function () {
            //
        },

        _itemRenderer: function (message) {
            var itemNode = utils.fromTemplate("list-item");
            itemNode.querySelector(".message").appendChild(utils.textNode(message.body));
            itemNode.querySelector(".time").appendChild(utils.textNode(utils.timeFromTimestamp(message.receivedTimestamp)));

            return itemNode;
        },

        _checkForEmpty: function () {
            if (this.inboxMessages.length > 0) {
                this.rootNode.classList.remove("empty");
            } else {
                this.rootNode.classList.add("empty");
            }
        },

        _checkForEmptyAndRender: function () {
            this._checkForEmpty();
            var listNode = this.listView.render();
            if (listNode.parentNode !== this.rootNode) {
                this.rootNode.appendChild(listNode);
            }
        },

        /**
         * Fetch user data from cloud
         */
        _fetchUserData: function () {
            var _this = this;
            Layout.busy(true);
            MobileMessaging.fetchUser(
                function (userData) {
                    utils.log('User data fetched: ' + JSON.stringify(_this.userData));
                    _this.userData = userData;
                    Layout.busy(false);
                },
                function (error) {
                    utils.log('Error while syncing user data: ' + error);
                    Layout.busy(false);
                }
            );
        },

        _setFilteringOptions: function () {
            var formInputNodes = this.formInboxNode.elements;
            var filteringOptions = {};

            for (var i = 0, max = formInputNodes.length; i < max; i++) {
                var inputNode = formInputNodes[i];
                var name = inputNode.getAttribute("name");

                var value = inputNode.value;

                if (!(value && value.length > 0)) {
                    value = null;
                }

                if (name === "fromDateTime" || name === "toDateTime") {
                    const inputDate = new Date(value);
                    filteringOptions[name] = this._formatDate(inputDate);
                } else {
                    filteringOptions[name] = value;
                }
            }

            return filteringOptions;
        },


        //This function here is because Date.toIsoString()does not include the timezone offset in the format "ZZZZZ".
        //And it seems if string is not in that exact format, ios will not parse it correctly and will return nill for dates.
        _formatDate: function (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const timezoneOffset = date.getTimezoneOffset();
            const timezoneHours = Math.abs(Math.floor(timezoneOffset / 60)).toString().padStart(2, '0');
            const timezoneMinutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0');
            const timezoneSign = timezoneOffset >= 0 ? '-' : '+';

            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneSign}${timezoneHours}:${timezoneMinutes}`;
        },

        /**
         * Fetch inbox messages
         */
        _fetchInboxMessagesWithoutToken: function (externalUserId, filterOptions) {
            var _this = this;
            _this.inboxMessages = [];
            Layout.busy(true);
            MobileMessaging.fetchInboxMessagesWithoutToken(externalUserId, filterOptions,
                function (inbox) {
                    utils.log('Inbox data fetched: ' + JSON.stringify(inbox));
                    for (var i = 0; i < inbox.messages.length; i++) {
                        _this.inboxMessages.push(inbox.messages[i]);
                        _this._checkForEmptyAndRender();
                    }
                    Layout.busy(false);
                }, function (error) {
                    utils.log("Error getting inbox messages: " + error);
                    Layout.busy(false);
                });
        },


        /**
         * Set inbox messages seen
         */
        _setInboxMessagesSeen: function (externalUserId, messageIds) {
            Layout.busy(true);
            utils.log('About to set messages seen: ' + externalUserId + " " + JSON.stringify(messageIds));
            MobileMessaging.setInboxMessagesSeen(externalUserId, messageIds,
                function (messageIdsSeen) {
                    utils.log('Messages set seen: ' + JSON.stringify(messageIdsSeen));
                    Layout.busy(false);
                }, function (error) {
                    utils.log("Error setting messages seen: " + JSON.stringify(error));
                    Layout.busy(false);
                });
        },
    };

    global.InboxScreen = InboxScreen;
})(ibglobal);