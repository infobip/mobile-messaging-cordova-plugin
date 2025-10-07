//
//  jwt-utils.js
//  MobileMessagingCordova
//
// Copyright (c) 2016-2025 Infobip Limited
// Licensed under the Apache License, Version 2.0
//

/**
 * Created by jdzubak on 22/07/2025.
 */
(function (global) {

    var jwtUtils = {
        _generateUUID: function () {
            // Simple UUID v4 generator
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        _getStp: function (subjectType) {
            switch (subjectType) {
                case "email":
                    return "email";
                case "phoneNumber":
                    return "msisdn";
                case "externalPersonId":
                    return "externalPersonId";
                default:
                    utils.log("Unknown subject type: " + subjectType);
                    return null; // Unknown type
            }
        },

        createJwt: async function (subjectType, subject, widgetId, secretKeyJson) {
            const _this = this;
            const stp = _this._getStp(subjectType);

            if (!stp || !subject || !widgetId || !secretKeyJson) {
                throw new Error("Missing required fields to generate JWT.");
            }

            try {
                const keyData = JSON.parse(secretKeyJson);
                const keyId = keyData.id;
                const keySecret = keyData.key;
                const uuid = _this._generateUUID();

                const nowSeconds = Math.floor(Date.now() / 1000);

                var payload = {
                    jti: uuid, //JWT ID: must be unique for each token. Any string, max 50 characters.
                    sub: subject, //Subject: value of the unique identifier, matching the type in stp.
                    iss: widgetId, //Issuer: your widget's ID.
                    iat: nowSeconds, //Issued at: Unix timestamp in seconds when the token is created.
                    exp: nowSeconds + 10, //Expiration: Unix timestamp when the token expires in seconds.
                    ski: keyId, //Secret key ID: the ID (not the value) of the secret key you're using to sign the token.
                    stp: stp, //Subject type: type of identifier in sub.
                    sid: uuid //Session ID: your unique user session identifier, used for Session Invalidation API. Max 50 characters.
                };

                const header = {
                    alg: "HS256",
                    typ: "JWT"
                };

                const sHeader = JSON.stringify(header);
                const sPayload = JSON.stringify(payload);

                const jwt = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, { b64: keySecret });

                return jwt;
            } catch (e) {
                console.error("Chat JWT generation failed: ", e);
                throw e; 
            }
        }
    };

    global.jwtUtils = jwtUtils;
})(ibglobal);