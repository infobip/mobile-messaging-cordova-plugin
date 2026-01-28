//   screen-chat.js
//   MobileMessagingCordova
//
//   Copyright (c) 2016-2026 Infobip Limited
//   Licensed under the Apache License, Version 2.0
//

/**
 * Created by jdzubak on 21/07/2025.
 */

(function (global) {
    var utils = global.utils;
    var jwtUtils = global.jwtUtils;
    var Layout = global.Layout;

    /**
     * Live Chat widget ID.
     * Widget ID is used for generating JWT to be able use Chat as authenticated customer.
     * You can get your widget ID in widget configuration page.
     */
    var LIVECHAT_WIDGET_ID = 'YOUR_LIVECHAT_WIDGET_ID';

    /**
     * Widget secret key in JSON form.
     * Secret key is used for generating JWT to be able use Chat as authenticated customer.
     * You can generate new secret key following a guide https://www.infobip.com/docs/live-chat/user-types#enable-authenticated-customers.
     */
    var LIVECHAT_SECRET_KEY_JSON = 'YOUR_LIVECHAT_SECRET_KEY_JSON';

    var ChatScreen = {
        NAME: "CHAT_SCREEN",

        rootNode: null,
        formNode: null,

        init: function () {
            var _this = this;
            this.rootNode = utils.fromTemplate("screen-chat");
            this.personalizationFormNode = this.rootNode.querySelector("form.personalization-data");
            this.showChatButtonNode = this.rootNode.querySelector("button#showChat");
            this.showCustomizedChatButtonNode = this.rootNode.querySelector("button#showCustomizedChat");

            this.personalizationFormNode.addEventListener("submit", function (evt) {
                evt.preventDefault();

                var action = evt.submitter?.value || 'unknown';
                var formData = _this._collectFormData();
                utils.log('Form data: ' + JSON.stringify(formData));

                if (action === 'authenticate') {
                    _this._authenticate(formData);
                } else if (action === 'personalize') {
                    _this._personalize(formData);
                } else {
                    utils.log('Unknown action: ' + action);
                }
            });

            // Uncomment to use custom exception handler
            // MobileMessaging.setChatExceptionHandler(
            //     function (exception) {
            //         utils.log('Cordova app: Chat exception received: ' + JSON.stringify(exception));
            //     },
            //     function (error) {
            //         utils.log('Cordova app: Error setting chat exception handler: ' + error);
            //     }
            // );

            this.showChatButtonNode.addEventListener("click", function () {
                // Check if chat is available before showing
                MobileMessaging.isChatAvailable(function(isAvailable) {
                    if (isAvailable) {
                        MobileMessaging.showChat();
                    } else {
                        alert('In-app chat is currently not available. Please try again later.');
                    }
                });
            });
            this.showCustomizedChatButtonNode.addEventListener("click", function () {
                _this._showCustomizedChat();
            });
        },

        title: function () {
            return "Chat";
        },

        meta: function () {
            return {
                naviTitle: "Chat",
                naviIcon: "icon-bubble"
            };
        },

        eventHandler: function (handler) {
            this.handler = handler;
        },

        render: function () {
            return this.rootNode;
        },

        activate: function () {
        },

        deactivate: function () {

        },

        _collectFormData: function () {
            var personalizationFormNodes = this.personalizationFormNode.elements;
            var formData = {};

            for (var i = 0, max = personalizationFormNodes.length; i < max; i++) {
                var inputNode = personalizationFormNodes[i];
                var name = inputNode.getAttribute("name");
                if (!name) {
                    continue;
                }

                var value = inputNode.value;

                if (!(value && value.length > 0)) {
                    value = null;
                }

                formData[name] = value;
            }

            return formData;
        },

        _preparePersonalizationData: function (formData) {
            var _this = this;
            var firstName = formData['firstName']
            var middleName = formData['middleName']
            var lastName = formData['lastName']
            var subjectType = formData['subjectType']
            var subject = formData['subject']

            var userAttributes = {};
            if (_this._isNotEmpty(firstName)) {
                userAttributes['firstName'] = firstName;
            }
            if (_this._isNotEmpty(middleName)) {
                userAttributes['middleName'] = middleName;
            }
            if (_this._isNotEmpty(lastName)) {
                userAttributes['lastName'] = lastName;
            }

            var userIdentity = {};
            if (_this._isNotEmpty(subjectType) && _this._isNotEmpty(subject)) {
                switch (subjectType) {
                    case 'email':
                        userIdentity['emails'] = subject.split(",").map(String);
                        break;
                    case 'phoneNumber':
                        userIdentity['phones'] = subject.split(",").map(String);
                        break;
                    case 'externalPersonId':
                        userIdentity['externalUserId'] = subject;
                        break;
                    default:
                        console.log("Unknown subjectType.");
                }
            }

            var personalizationData = {};

            if (Object.keys(userIdentity).length > 0) {
                personalizationData['userIdentity'] = userIdentity;
            } else {
                utils.log('No user identity provided, personalization will not be performed.');
                return null;
            }

            if (Object.keys(userAttributes).length > 0) {
                personalizationData['userAttributes'] = userAttributes;
            } else {
                utils.log('No user attributes provided.');
                return null;
            }

            personalizationData['forceDepersonalize'] = true;
            personalizationData['keepAsLead'] = false;

            return personalizationData;
        },

        _personalize: function (formData, successCallback, errorCallback) {
            var personalizationData = this._preparePersonalizationData(formData);
            utils.log('Cordova app: Personalization data: ' + JSON.stringify(personalizationData));
            if (personalizationData == null) {
                errorCallback('Personalization data is null, personalization not performed.');
                return;
            }

            Layout.busy(true);
            MobileMessaging.personalize(
                personalizationData,
                function (customer) {
                    Layout.busy(false);
                    if (successCallback) {
                        successCallback(customer);
                    } else {
                        utils.log('Cordova app: User personalized:' + JSON.stringify(customer));
                    }
                },
                function (error) {
                    Layout.busy(false);
                    if (errorCallback) {
                        errorCallback(error);
                    } else {
                        utils.log('Cordova app: Personalization error: ' + error);
                    }
                }
            );
        },

        _authenticate: function (formData) {
            var _this = this;
            _this._personalize(
                formData,
                function (customer) {
                    utils.log('Cordova app: User personalized:' + JSON.stringify(customer));
                    utils.log('Cordova app: Setting chat JWT provider.');
                    MobileMessaging.setChatJwtProvider(
                        async function () {
                            const jwt = await jwtUtils.createJwt(
                                formData['subjectType'],
                                formData['subject'],
                                LIVECHAT_WIDGET_ID,
                                LIVECHAT_SECRET_KEY_JSON
                            );
                            utils.log('Cordova app: Providing new JWT: ' + jwt);
                            return jwt;
                        },
                        function (error) {
                            utils.log('Cordova app: Error from chat JWT provider: ' + error);
                        }
                    );
                },
                function (error) {
                    utils.log('Cordova app: Personalization error: ' + error);
                }
            );
        },

        _isNotEmpty: function (value) {
            return value != null && typeof value === 'string' && value.length > 0;
        },

        _showCustomizedChat: function () {
            // Check if chat is available before showing
            MobileMessaging.isChatAvailable(function(isAvailable) {
                if (isAvailable) {
                    var chatCustomization = {
                        chatStatusBarBackgroundColor: '#673AB7',
                        chatStatusBarIconsColorMode: 'dark',
                        attachmentPreviewToolbarSaveMenuItemIcon: 'img/ic_download.png',
                        attachmentPreviewToolbarMenuItemsIconTint: '#9E9E9E',
                        chatToolbar: {
                            titleTextAppearance: 'TextAppearance_AppCompat_Title',
                            titleTextColor: '#FFFFFF',
                            titleText: 'Some new title',
                            titleCentered: true,
                            backgroundColor: '#673AB7',
                            navigationIcon: 'img/ic_back.png',
                            navigationIconTint: '#FFFFFF',
                            subtitleTextAppearance: 'TextAppearance_AppCompat_Subtitle',
                            subtitleTextColor: '#FFFFFF',
                            subtitleText: '#1',
                            subtitleCentered: true,
                        },
                        attachmentPreviewToolbar: {
                            titleTextAppearance: 'TextAppearance_AppCompat_Title',
                            titleTextColor: '#212121',
                            titleText: 'Attachment preview',
                            titleCentered: true,
                            backgroundColor: '#673AB7',
                            navigationIcon: 'img/ic_back.png',
                            navigationIconTint: '#FFFFFF',
                            subtitleTextAppearance: 'TextAppearance_AppCompat_Subtitle',
                            subtitleTextColor: '#FFFFFF',
                            subtitleText: 'Attachment preview subtitle',
                            subtitleCentered: false,
                        },
                        networkErrorText: 'Network error',
                        networkErrorTextColor: '#FF5722',
                        networkErrorTextAppearance: 'TextAppearance_AppCompat_Medium',
                        networkErrorLabelBackgroundColor: '#3F51B5',
                        networkErrorIconTint: '#FFC107',
                        chatBannerErrorTextColor: '#FF6F00',
                        chatBannerErrorTextAppearance: 'TextAppearance_AppCompat_Medium',
                        chatBannerErrorBackgroundColor: '#FFE0B2',
                        chatBannerErrorIconTint: '#E65100',
                        chatProgressBarColor: '#9E9E9E',
                        chatInputTextColor: '#212121',
                        chatInputBackgroundColor: '#D1C4E9',
                        chatInputHintText: 'Input Message',
                        chatInputHintTextColor: '#212121',
                        chatInputAttachmentIcon: 'img/ic_add_circle.png',
                        chatInputAttachmentIconTint: '#9E9E9E',
                        chatInputAttachmentBackgroundColor: '#673AB7',
                        chatInputAttachmentBackgroundDrawable: '',
                        chatInputSendIcon: 'img/ic_send.png',
                        chatInputSendIconTint: '#9E9E9E',
                        chatInputSendBackgroundColor: '#673AB7',
                        chatInputSendBackgroundDrawable: '',
                        chatInputSeparatorLineColor: '#BDBDBD',
                        chatInputSeparatorLineVisible: true,
                        chatInputCursorColor: '#9E9E9E',
                        chatInputCharCounterTextAppearance: 'TextAppearance_AppCompat_Caption',
                        chatInputCharCounterDefaultColor: '#d0d32f',
                        chatInputCharCounterAlertColor: '#2fd358',
                        chatBackgroundColor: '#673AB7',
                        chatInputTextAppearance: 'TextAppearance_AppCompat_Subtitle',
                        chatFullScreenErrorTitleText: 'Oops! Something went wrong',
                        chatFullScreenErrorTitleTextColor: '#E91E63',
                        chatFullScreenErrorTitleTextAppearance: 'TextAppearance_AppCompat_Large',
                        chatFullScreenErrorDescriptionText: 'Please check your connection and try again',
                        chatFullScreenErrorDescriptionTextColor: '#00BCD4',
                        chatFullScreenErrorDescriptionTextAppearance: 'TextAppearance_AppCompat_Body1',
                        chatFullScreenErrorBackgroundColor: '#e06666',
                        chatFullScreenErrorIconTint: '#FF9800',
                        chatFullScreenErrorRefreshButtonText: 'Retry',
                        chatFullScreenErrorRefreshButtonTextColor: '#4CAF50',
                        chatFullScreenErrorRefreshButtonVisible: true,

                    };
                    MobileMessaging.setChatCustomization(chatCustomization,
                        () => console.log("Customization applied"),
                        (err) => console.error("Customization error", err)
                    );
                    MobileMessaging.setWidgetTheme('dark', (err) => console.error("Customization error", err));
                    MobileMessaging.showChat();
                } else {
                    alert('In-app chat is currently not available. Please try again later.');
                }
            });
        },
    };

    global.ChatScreen = ChatScreen;
})(ibglobal);
