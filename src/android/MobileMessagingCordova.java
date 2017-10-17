package org.apache.cordova.plugin;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.AsyncTask;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.support.annotation.NonNull;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.infobip.mobile.messaging.BroadcastParameter;
import org.infobip.mobile.messaging.CustomUserDataValue;
import org.infobip.mobile.messaging.Event;
import org.infobip.mobile.messaging.Message;
import org.infobip.mobile.messaging.MobileMessaging;
import org.infobip.mobile.messaging.logging.MobileMessagingLogger;
import org.infobip.mobile.messaging.MobileMessagingCore;
import org.infobip.mobile.messaging.MobileMessagingProperty;
import org.infobip.mobile.messaging.UserData;
import org.infobip.mobile.messaging.api.support.http.serialization.JsonSerializer;
import org.infobip.mobile.messaging.geo.Area;
import org.infobip.mobile.messaging.geo.Geo;
import org.infobip.mobile.messaging.geo.GeoEvent;
import org.infobip.mobile.messaging.geo.MobileGeo;
import org.infobip.mobile.messaging.mobile.MobileMessagingError;
import org.infobip.mobile.messaging.storage.MessageStore;
import org.infobip.mobile.messaging.storage.SQLiteMessageStore;
import org.infobip.mobile.messaging.util.PreferenceHelper;
import org.infobip.mobile.messaging.util.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;

public class MobileMessagingCordova extends CordovaPlugin {
    private static final String TAG = "MobileMessagingCordova";

    private static final int REQ_CODE_LOC_PERMISSION_FOR_INIT = 1;

    private static final String FUNCTION_INIT = "init";
    private static final String FUNCTION_REGISTER_RECEIVER = "registerReceiver";
    private static final String FUNCTION_SYNC_USER_DATA = "syncUserData";
    private static final String FUNCTION_FETCH_USER_DATA = "fetchUserData";
    private static final String FUNCTION_MARK_MESSAGES_SEEN = "markMessagesSeen";
    private static final String FUNCTION_MESSAGESTORAGE_REGISTER = "messageStorage_register";
    private static final String FUNCTION_MESSAGESTORAGE_UNREGISTER = "messageStorage_unregister";
    private static final String FUNCTION_MESSAGESTORAGE_FINDALL_RESULT = "messageStorage_findAllResult";
    private static final String FUNCTION_DEF_MESSAGESTORAGE_FIND = "defaultMessageStorage_find";
    private static final String FUNCTION_DEF_MESSAGESTORAGE_FINDALL = "defaultMessageStorage_findAll";
    private static final String FUNCTION_DEF_MESSAGESTORAGE_DELETE = "defaultMessageStorage_delete";
    private static final String FUNCTION_DEF_MESSAGESTORAGE_DELETEALL = "defaultMessageStorage_deleteAll";

    private static final String EVENT_MESSAGE_RECEIVED = "messageReceived";
    private static final String EVENT_NOTIFICATION_TAPPED = "notificationTapped";
    private static final String EVENT_TOKEN_RECEIVED = "tokenReceived";
    private static final String EVENT_REGISTRATION_UPDATED = "registrationUpdated";
    private static final String EVENT_GEOFENCE_ENTERED = "geofenceEntered";
    private static final String EVENT_MESSAGESTORAGE_START = "messageStorage.start";
    private static final String EVENT_MESSAGESTORAGE_SAVE = "messageStorage.save";
    private static final String EVENT_MESSAGESTORAGE_FIND_ALL = "messageStorage.findAll";

    private static final Map<String, String> broadcastEventMap = new HashMap<String, String>() {{
        put(Event.REGISTRATION_ACQUIRED.getKey(), EVENT_TOKEN_RECEIVED);
        put(Event.REGISTRATION_CREATED.getKey(), EVENT_REGISTRATION_UPDATED);
        put(GeoEvent.GEOFENCE_AREA_ENTERED.getKey(), EVENT_GEOFENCE_ENTERED);
    }};

    private static final Map<String, String> messageBroadcastEventMap = new HashMap<String, String>() {{
        put(Event.MESSAGE_RECEIVED.getKey(), EVENT_MESSAGE_RECEIVED);
        put(Event.NOTIFICATION_TAPPED.getKey(), EVENT_NOTIFICATION_TAPPED);
    }};

    private static volatile CallbackContext libraryEventReceiver = null;

    private final InitContext initContext = new InitContext();

    private static final BroadcastReceiver commonLibraryBroadcastReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String event = broadcastEventMap.get(intent.getAction());
            if (event == null) {
                return;
            }

            if (GeoEvent.GEOFENCE_AREA_ENTERED.getKey().equals(intent.getAction())) {
                for (JSONObject geo : geosFromBundle(intent.getExtras())) {
                    if (libraryEventReceiver != null) {
                        sendCallbackEvent(event, geo, libraryEventReceiver);
                    }
                }
                return;
            }

            String data = null;
            if (Event.REGISTRATION_ACQUIRED.getKey().equals(intent.getAction())) {
                data = intent.getStringExtra(BroadcastParameter.EXTRA_GCM_TOKEN);
            } else if (Event.REGISTRATION_CREATED.getKey().equals(intent.getAction())) {
                data = intent.getStringExtra(BroadcastParameter.EXTRA_INFOBIP_ID);
            }

            if (libraryEventReceiver != null) {
                sendCallbackEvent(event, data, libraryEventReceiver);
            }
        }
    };

    private static class Configuration {

        class AndroidConfiguration {
            String senderId;
        }

        class PrivacySettings {
            boolean userDataPersistingDisabled;
            boolean carrierInfoSendingDisabled;
            boolean systemInfoSendingDisabled;
        }

        String applicationCode;
        AndroidConfiguration android;
        boolean geofencingEnabled;
        Map<String, ?> messageStorage;
        boolean defaultMessageStorage;
        boolean loggingEnabled;
        String cordovaPluginVersion = "unknown";
        PrivacySettings privacySettings = new PrivacySettings();
    }

    private static class InitContext {
        JSONArray args;
        CallbackContext callbackContext;

        void reset() {
            args = null;
            callbackContext = null;
        }

        boolean isValid() {
            return args != null || callbackContext != null;
        }
    }

    public static class MessageActionReceiver extends BroadcastReceiver {

        @Override
        public void onReceive(Context context, Intent intent) {
            String event = messageBroadcastEventMap.get(intent.getAction());
            if (event == null) {
                Log.w(TAG, "Cannot process event for broadcast: " + intent.getAction());
                return;
            }

            JSONObject message = messageBundleToJSON(intent.getExtras());
            if (libraryEventReceiver == null) {
                CacheManager.saveEvent(context, event, message);
                return;
            }

            sendCallbackEvent(event, message, libraryEventReceiver);
        }
    }

    @Override
    public void onRequestPermissionResult(int requestCode, String[] permissions, int[] grantResults) throws JSONException {
        super.onRequestPermissionResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_CODE_LOC_PERMISSION_FOR_INIT) {
            return;
        }

        if (!cordova.hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
            sendCallbackError(initContext.callbackContext, "ACCESS_FINE_LOCATION is not granted, cannot initialize");
            return;
        }

        if (!initContext.isValid()) {
            Log.e(TAG, "Initialization context is not valid, cannot complete initialization");
            return;
        }

        init(initContext.args, initContext.callbackContext);
        initContext.reset();
    }

    @Override
    public void onDestroy() {
        libraryEventReceiver = null;
        LocalBroadcastManager.getInstance(cordova.getActivity()).unregisterReceiver(commonLibraryBroadcastReceiver);
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {

        Log.d(TAG, "execute: " + action + " args: " + args.toString());

        if (FUNCTION_INIT.equals(action)) {
            init(args, callbackContext);
            return true;
        } else if (FUNCTION_REGISTER_RECEIVER.equals(action)) {
            registerReceiver(callbackContext);
            return true;
        } else if (FUNCTION_SYNC_USER_DATA.equals(action)) {
            syncUserData(args, callbackContext);
            return true;
        } else if (FUNCTION_FETCH_USER_DATA.equals(action)) {
            fetchUserData(callbackContext);
            return true;
        } else if (FUNCTION_MARK_MESSAGES_SEEN.equals(action)) {
            markMessagesSeen(args, callbackContext);
            return true;
        } else if (FUNCTION_MESSAGESTORAGE_REGISTER.equals(action)) {
            MessageStoreAdapter.register(cordova.getActivity(), args, callbackContext);
            return true;
        } else if (FUNCTION_MESSAGESTORAGE_UNREGISTER.equals(action)) {
            MessageStoreAdapter.unregister(args);
            return true;
        } else if (FUNCTION_MESSAGESTORAGE_FINDALL_RESULT.equals(action)) {
            MessageStoreAdapter.findAllJSResult(args);
            return true;
        } else if (FUNCTION_DEF_MESSAGESTORAGE_FIND.equals(action)) {
            defaultMessageStorage_find(args, callbackContext);
            return true;
        } else if (FUNCTION_DEF_MESSAGESTORAGE_FINDALL.equals(action)) {
            defaultMessageStorage_findAll(callbackContext);
            return true;
        } else if (FUNCTION_DEF_MESSAGESTORAGE_DELETE.equals(action)) {
            defaultMessageStorage_delete(args, callbackContext);
            return true;
        } else if (FUNCTION_DEF_MESSAGESTORAGE_DELETEALL.equals(action)) {
            defaultMessageStorage_deleteAll(callbackContext);
            return true;
        }

        return false;
    }

    @SuppressLint("MissingPermission")
    private void init(JSONArray args, CallbackContext callbackContext) throws JSONException {
        Configuration configuration = resolveConfiguration(args);
        if (configuration.geofencingEnabled && (!cordova.hasPermission(Manifest.permission.ACCESS_FINE_LOCATION) ||
                ActivityCompat.checkSelfPermission(cordova.getActivity(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED)) {
            initContext.args = args;
            initContext.callbackContext = callbackContext;
            cordova.requestPermission(this, REQ_CODE_LOC_PERMISSION_FOR_INIT, Manifest.permission.ACCESS_FINE_LOCATION);
            return;
        }

        if (configuration.loggingEnabled) {
            MobileMessagingLogger.enforce();
        }

        PreferenceHelper.saveString(cordova.getActivity().getApplication(), MobileMessagingProperty.SYSTEM_DATA_VERSION_POSTFIX, "cordova " + configuration.cordovaPluginVersion);

        MobileMessaging.Builder builder = new MobileMessaging.Builder(cordova.getActivity().getApplication())
                .withApplicationCode(configuration.applicationCode)
                .withGcmSenderId(configuration.android.senderId);

        if (configuration.privacySettings.userDataPersistingDisabled) {
            builder.withoutStoringUserData();
        }
        if (configuration.privacySettings.carrierInfoSendingDisabled) {
            builder.withoutCarrierInfo();
        }
        if (configuration.privacySettings.systemInfoSendingDisabled) {
            builder.withoutSystemInfo();
        }
        if (configuration.messageStorage != null) {
            builder.withMessageStore(MessageStoreAdapter.class);
        } else if (configuration.defaultMessageStorage) {
            builder.withMessageStore(SQLiteMessageStore.class);
        }

        builder.build();

        if (configuration.geofencingEnabled) {
            MobileGeo.getInstance(cordova.getActivity().getApplication()).activateGeofencing();
        }

        sendCallbackSuccessKeepCallback(callbackContext);
    }

    private void registerReceiver(final CallbackContext callbackContext) throws JSONException {

        IntentFilter intentFilter = new IntentFilter();
        for (String action : broadcastEventMap.keySet()) {
            intentFilter.addAction(action);
        }

        libraryEventReceiver = callbackContext;

        LocalBroadcastManager.getInstance(cordova.getActivity()).registerReceiver(commonLibraryBroadcastReceiver, intentFilter);

        for (CacheManager.Event event : CacheManager.loadEvents(cordova.getActivity())) {
            sendCallbackEvent(event.type, event.object, callbackContext);
        }
    }

    private void syncUserData(JSONArray args, final CallbackContext callbackContext) throws JSONException {
        final UserData userData = resolveUserData(args);
        new AsyncTask<Void, Void, Void>() {

            @Override
            protected Void doInBackground(Void... params) {
                MobileMessaging.getInstance(cordova.getActivity().getApplicationContext())
                        .syncUserData(userData, new MobileMessaging.ResultListener<UserData>() {
                            @Override
                            public void onResult(UserData result) {
                                JSONObject json = UserDataJson.toJSON(result);
                                sendCallbackSuccess(callbackContext, json);
                            }

                            @Override
                            public void onError(MobileMessagingError e) {
                                sendCallbackError(callbackContext, e.getMessage());
                            }
                        });
                return null;
            }
        }.execute();
    }

    private void fetchUserData(final CallbackContext callbackContext) throws JSONException {
        new AsyncTask<Void, Void, Void>() {

            @Override
            protected Void doInBackground(Void... params) {
                MobileMessaging.getInstance(cordova.getActivity().getApplicationContext())
                        .fetchUserData(new MobileMessaging.ResultListener<UserData>() {
                            @Override
                            public void onResult(UserData result) {
                                JSONObject json = UserDataJson.toJSON(result);
                                sendCallbackSuccess(callbackContext, json);
                            }

                            @Override
                            public void onError(MobileMessagingError e) {
                                sendCallbackError(callbackContext, e.getMessage());
                            }
                        });
                return null;
            }
        }.execute();
    }

    private void markMessagesSeen(final JSONArray args, final CallbackContext callbackContext) throws JSONException {
        final String messageIds[] = resolveStringArray(args);
        new AsyncTask<Void, Void, Void>() {

            @Override
            protected Void doInBackground(Void... params) {
                MobileMessaging.getInstance(cordova.getActivity().getApplicationContext())
                        .setMessagesSeen(messageIds);
                sendCallbackSuccess(callbackContext, args);
                return null;
            }
        }.execute();
    }

    private synchronized void defaultMessageStorage_find(JSONArray args, CallbackContext callbackContext) throws JSONException {
        Context context = cordova.getActivity();
        String messageId = resolveStringParameter(args);
        MessageStore messageStore = MobileMessaging.getInstance(context).getMessageStore();
        if (messageStore == null) {
            sendCallbackSuccessEmpty(callbackContext);
            return;
        }

        for (Message m : messageStore.findAll(context)) {
            if (messageId.equals(m.getMessageId())) {
                sendCallbackSuccess(callbackContext, messageToJSON(m));
                return;
            }
        }
        sendCallbackSuccessEmpty(callbackContext);
    }

    private synchronized void defaultMessageStorage_findAll(CallbackContext callbackContext) throws JSONException {
        Context context = cordova.getActivity();
        MessageStore messageStore = MobileMessaging.getInstance(context).getMessageStore();
        if (messageStore == null) {
            sendCallbackSuccess(callbackContext, new JSONArray());
            return;
        }
        List<Message> messages = messageStore.findAll(context);
        sendCallbackSuccess(callbackContext, messagesToJSONArray(messages.toArray(new Message[messages.size()])));
    }

    private synchronized void defaultMessageStorage_delete(JSONArray args, CallbackContext callbackContext) throws JSONException {
        Context context = cordova.getActivity();
        String messageId = resolveStringParameter(args);
        MessageStore messageStore = MobileMessaging.getInstance(context).getMessageStore();
        if (messageStore == null) {
            sendCallbackSuccess(callbackContext);
            return;
        }

        List<Message> messagesToKeep = new ArrayList<Message>();
        for (Message m : messageStore.findAll(context)) {
            if (messageId.equals(m.getMessageId())) {
                continue;
            }
            messagesToKeep.add(m);
        }
        messageStore.deleteAll(context);
        messageStore.save(context, messagesToKeep.toArray(new Message[messagesToKeep.size()]));
        sendCallbackSuccess(callbackContext);
    }

    private synchronized void defaultMessageStorage_deleteAll(CallbackContext callbackContext) throws JSONException {
        Context context = cordova.getActivity();
        MessageStore messageStore = MobileMessaging.getInstance(context).getMessageStore();
        if (messageStore == null) {
            sendCallbackSuccess(callbackContext);
            return;
        }
        messageStore.deleteAll(context);
        sendCallbackSuccess(callbackContext);
    }

    @NonNull
    private static Configuration resolveConfiguration(JSONArray args) throws JSONException {
        if (args.length() < 1 || args.getJSONObject(0) == null) {
            throw new IllegalArgumentException("Cannot resolve configuration from arguments");
        }

        Configuration config = new JsonSerializer().deserialize(args.getJSONObject(0).toString(), Configuration.class);
        if (config == null || config.applicationCode == null || config.android.senderId == null) {
            throw new IllegalArgumentException("Configuration is invalid");
        }

        return config;
    }

    @NonNull
    private static UserData resolveUserData(JSONArray args) throws JSONException {
        if (args.length() < 1 || args.getJSONObject(0) == null) {
            throw new IllegalArgumentException("Cannot resolve user data from arguments");
        }

        UserData userData = UserDataJson.fromJSON(args.getJSONObject(0));
        if (userData == null) {
            throw new RuntimeException("Cannot deserialize user data from arguments");
        }

        return userData;
    }

    @NonNull
    private static String[] resolveStringArray(JSONArray args) throws JSONException {
        if (args.length() < 1 || args.getString(0) == null) {
            throw new IllegalArgumentException("Cannot resolve string parameters from arguments");
        }

        String array[] = new String[args.length()];
        for (int i = 0; i < args.length(); i++) {
            array[i] = args.getString(i);
        }

        return array;
    }

    @NonNull
    private static List<Message> resolveMessages(JSONArray args) throws JSONException {
        if (args == null || args.length() < 1 || args.getString(0) == null) {
            throw new IllegalArgumentException("Cannot resolve messages from arguments");
        }

        List<Message> messages = new ArrayList<Message>(args.length());
        for (int i = 0; i < args.length(); i++) {
            Message m = messageFromJSON(args.optJSONObject(i));
            if (m == null) {
                continue;
            }

            messages.add(m);
        }
        return messages;
    }

    @NonNull
    private synchronized String resolveStringParameter(JSONArray args) throws JSONException {
        if (args.length() < 1 || args.getString(0) == null) {
            throw new IllegalArgumentException("Cannot resolve string parameter from arguments");
        }

        return args.getString(0);
    }

    private static boolean sendCallbackEvent(String event, Object object, CallbackContext callback) {
        if (event == null || object == null) {
            return false;
        }

        JSONArray parameters = new JSONArray();
        parameters.put(event);
        parameters.put(object);

        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, parameters);
        pluginResult.setKeepCallback(true);
        callback.sendPluginResult(pluginResult);
        return true;
    }


    private static void sendCallbackError(CallbackContext callback, String message) {
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.ERROR, message));
    }

    private static void sendCallbackSuccessKeepCallback(CallbackContext callback) {
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.OK), true);
    }

    private static void sendCallbackSuccess(CallbackContext callback) {
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.OK));
    }

    private static void sendCallbackSuccessEmpty(CallbackContext callback) {
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.OK, (String) null));
    }

    private static void sendCallbackSuccess(CallbackContext callback, JSONArray objects) {
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.OK, objects));
    }

    private static void sendCallbackSuccess(CallbackContext callback, JSONObject object) {
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.OK, object));
    }

    private static void sendCallbackWithResult(CallbackContext context, PluginResult result, boolean...keepCallback) {
        result.setKeepCallback(keepCallback != null && keepCallback.length > 0 && keepCallback[0]);
        context.sendPluginResult(result);
    }

    /**
     * Creates new json object based on message bundle
     * @param bundle message bundle
     * @return message object in json format
     */
    private static JSONObject messageBundleToJSON(Bundle bundle) {
        Message message = Message.createFrom(bundle);
        if (message == null) {
            return null;
        }

        return messageToJSON(message);
    }

    /**
     * Creates json from a message object
     * @param message message object
     * @return message json
     */
    private static JSONObject messageToJSON(Message message) {
        try {
            return new JSONObject()
                    .putOpt("messageId", message.getMessageId())
                    .putOpt("title", message.getTitle())
                    .putOpt("body", message.getBody())
                    .putOpt("sound", message.getSound())
                    .putOpt("vibrate", message.isVibrate())
                    .putOpt("icon", message.getIcon())
                    .putOpt("silent", message.isSilent())
                    .putOpt("category", message.getCategory())
                    .putOpt("from", message.getFrom())
                    .putOpt("receivedTimestamp", message.getReceivedTimestamp())
                    .putOpt("customPayload", message.getCustomPayload())
                    .putOpt("contentUrl", message.getContentUrl())
					.putOpt("seen", message.getSeenTimestamp() != 0)
					.putOpt("seenDate", message.getSeenTimestamp())
					.putOpt("geo", hasGeo(message));
        } catch (JSONException e) {
            Log.w(TAG, "Cannot convert message to JSON: " + e.getMessage());
            Log.d(TAG, Log.getStackTraceString(e));
            return null;
        }
    }

    private static boolean hasGeo(Message message) {
        if (message == null || message.getInternalData() == null) {
            return false;
        }

        try {
            JSONObject geo = new JSONObject(message.getInternalData());
            return geo.getJSONArray("geo") != null && geo.getJSONArray("geo").length() > 0;
        } catch (JSONException e) {
            return false;
        }
    }

    /**
     * Creates array of json objects from list of messages
     * @param messages list of messages
     * @return array of jsons representing messages
     */
    private static JSONArray messagesToJSONArray(@NonNull Message messages[]) {
        JSONArray array = new JSONArray();
        for (Message message : messages) {
            JSONObject json = messageToJSON(message);
            if (json == null) {
                continue;
            }
            array.put(json);
        }
        return array;
    }

    /**
     * Creates new messages from json object
     * @param json json object
     * @return new {@link Message} object.
     */
    private static Message messageFromJSON(JSONObject json) {
        if (json == null) {
            return null;
        }

        Message message = new Message();
        message.setMessageId(json.optString("messageId", null));
        message.setTitle(json.optString("title", null));
        message.setBody(json.optString("body", null));
        message.setSound(json.optString("sound", null));
        message.setVibrate(json.optBoolean("vibrate", true));
        message.setIcon(json.optString("icon", null));
        message.setSilent(json.optBoolean("silent", false));
        message.setCategory(json.optString("category", null));
        message.setFrom(json.optString("from", null));
        message.setReceivedTimestamp(json.optLong("receivedTimestamp", 0));
        message.setCustomPayload(json.optJSONObject("customPayload"));
        return message;
    }

    /**
     * Geo mapper
     * @param bundle where to read geo objects from
     * @return list of json objects representing geo objects
     */
    @NonNull
    private static List<JSONObject> geosFromBundle(Bundle bundle) {
        Geo geo = Geo.createFrom(bundle);
        JSONObject message = messageBundleToJSON(bundle);
        if (geo == null || geo.getAreasList() == null || geo.getAreasList().isEmpty() || message == null) {
            return new ArrayList<JSONObject>();
        }

        List<JSONObject> geos = new ArrayList<JSONObject>();
        for (final Area area : geo.getAreasList()) {
            try {
                geos.add(new JSONObject()
                        .put("area", new JSONObject()
                                .put("id", area.getId())
                                .put("center", new JSONObject()
                                        .put("lat", area.getLatitude())
                                        .put("lon", area.getLongitude()))
                                .put("radius", area.getRadius())
                                .put("title", area.getTitle()))
                        );
            } catch (JSONException e) {
                Log.w(TAG, "Cannot convert geo to JSON: " + e.getMessage());
                Log.d(TAG, Log.getStackTraceString(e));
            }
        }

        return geos;
    }

    /**
     * User data mappers for JSON conversion
     */
    private static class UserDataJson extends UserData {

        private static final List<String> predefinedUserDataKeys = new ArrayList<String>() {{
            for (PredefinedField field : PredefinedField.values()) {
                add(field.getKey());
            }
        }};

        private UserDataJson(String externalUserId, Map<String, Object> predefinedData, Map<String, CustomUserDataValue> customData) {
            super(externalUserId, predefinedData, customData);
        }

        static JSONObject toJSON(final UserData userData) {
            try {
                JSONObject json = new JSONObject();
                if (userData.getPredefinedUserData() != null) {
                    for (String key : predefinedUserDataKeys) {
                        json.putOpt(key, userData.getPredefinedUserData().get(key));
                    }
                }
                if (userData.getExternalUserId() != null) {
                    json.putOpt("externalUserId", userData.getExternalUserId());
                }
                if (userData.getCustomUserData() != null && !userData.getCustomUserData().isEmpty()) {
                    JSONObject custom = new JSONObject();
                    for (String key : userData.getCustomUserData().keySet()) {
                        CustomUserDataValue value = userData.getCustomUserDataValue(key);
                        switch (value.getType()) {
                            case String:
                                custom.putOpt(key, value.stringValue());
                                break;
                            case Number:
                                custom.putOpt(key, value.numberValue());
                                break;
                            case Date:
                                custom.putOpt(key, new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.getDefault()).format(value.dateValue()));
                        }
                    }
                    json.putOpt("customData", custom);
                }
                return json;
            } catch (JSONException e) {
                Log.e(TAG, "Cannot convert user data to json: " + e.getMessage());
                Log.d(TAG, Log.getStackTraceString(e));
                return new JSONObject();
            }
        }

        static UserData fromJSON(JSONObject json) {
            String externalUserId = json.optString("externalUserId", null);

            Map<String, Object> predefined = new HashMap<String, Object>();
            for (String key : predefinedUserDataKeys) {
                if (!json.has(key)) {
                    continue;
                }

                predefined.put(key, json.opt(key));
            }

            Map<String, CustomUserDataValue> custom = new HashMap<String, CustomUserDataValue>();
            JSONObject jsonCustom = json.optJSONObject("customData");
            Iterator<String> keys = jsonCustom != null ? jsonCustom.keys() : null;
            while (keys != null && keys.hasNext()) {
                String key = keys.next();
                Object value = jsonCustom.opt(key);
                if (value == null) {
                    custom.put(key, null);
                } else if (value instanceof Number) {
                    custom.put(key, new CustomUserDataValue((Number) value));
                } else if (value instanceof String) {
                    try {
                        custom.put(key, new CustomUserDataValue(dateFromString((String) value)));
                    } catch (Exception ignored) {
                        custom.put(key, new CustomUserDataValue((String) value));
                    }
                }
            }

            return new UserDataJson(externalUserId, predefined, custom);
        }

        private static Date dateFromString(String date) throws Exception {
            try {
                return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.getDefault()).parse(date);
            } catch (Exception ignored) {
                SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault());
                format.setTimeZone(TimeZone.getTimeZone("UTC"));
                return format.parse(date);
            }
        }
    }

    static class CacheManager {
        private static final String MESSAGES_KEY = TAG + ".cache.messages";
        private static final String EVENTS_KEY = TAG + ".cache.events";
        private static final Object cacheLock = new Object();
        private static final JsonSerializer serializer = new JsonSerializer();

        static class Event {
            String type;
            JSONObject object;

            Event(String type, JSONObject object) {
                this.type = type;
                this.object = object;
            }

            @Override
            public String toString() {
                return type;
            }
        }

        private static void saveMessages(Context context, Message...messages) {
            List<String> newMessages = new ArrayList<String>(messages.length);
            for (Message m : messages) {
                newMessages.add(serializer.serialize(m));
            }
            saveStringSet(context, MESSAGES_KEY, new HashSet<String>(newMessages));
        }

        private static Message[] loadMessages(Context context) {
            Set<String> set = getAndRemoveStringSet(context, MESSAGES_KEY);
            List<Message> messages = new ArrayList<Message>(set.size());
            for (String string : set) {
                messages.add(serializer.deserialize(string, Message.class));
            }
            return messages.toArray(new Message[messages.size()]);
        }

        private static void saveEvent(Context context, String event, JSONObject object) {
            String serialized = serializer.serialize(new Event(event, object));
            saveStringsToSet(context, EVENTS_KEY, serialized);
        }

        private static Event[] loadEvents(Context context) {
            Set<String> serialized = getAndRemoveStringSet(context, EVENTS_KEY);
            List<Event> events = new ArrayList<Event>(serialized.size());
            for (String s : serialized) {
                events.add(serializer.deserialize(s, Event.class));
            }
            return events.toArray(new Event[events.size()]);
        }

        private static Set<String> getAndRemoveStringSet(Context context, String key) {
            SharedPreferences sharedPreferences = PreferenceManager.getDefaultSharedPreferences(context);
            Set<String> set;
            synchronized (cacheLock) {
                set = sharedPreferences.getStringSet(key, new HashSet<String>());
                if (set.isEmpty()) {
                    return new HashSet<String>();
                }
                sharedPreferences
                        .edit()
                        .remove(key)
                        .apply();
            }
            return set;
        }

        private static Set<String> saveStringsToSet(Context context, String key, String...strings) {
            return saveStringSet(context, key, new HashSet<String>(Arrays.asList(strings)));
        }

        private static Set<String> saveStringSet(Context context, String key, Set<String> newSet) {
            SharedPreferences sharedPreferences = PreferenceManager.getDefaultSharedPreferences(context);
            synchronized (cacheLock) {
                Set<String> set = sharedPreferences.getStringSet(key, new HashSet<String>());
                newSet.addAll(set);
                sharedPreferences
                        .edit()
                        .putStringSet(key, newSet)
                        .apply();
                return set;
            }
        }
    }

    /**
     * Message store adapter for JS layer
     */
    @SuppressWarnings("WeakerAccess")
    public static class MessageStoreAdapter implements MessageStore {

        private static final long SYNC_CALL_TIMEOUT_MS = 30000;
        private static final Map<String, CallbackContext> registeredCallbacks = new HashMap<String, CallbackContext>();
        private static final List<JSONArray> findAllResults = new LinkedList<JSONArray>();

        @SuppressWarnings("unused")
        public MessageStoreAdapter() {
            startJS();
        }

        @Override
        public List<Message> findAll(Context context) {
            return findAllJS();
        }

        @Override
        public long countAll(Context context) {
            return findAll(context).size();
        }

        @Override
        public void save(Context context, Message...messages) {
            if (!saveJS(messages)) {
                Log.w(TAG, "JS storage not available yet, will cache");
                CacheManager.saveMessages(context, messages);
            }
        }

        @Override
        public void deleteAll(Context context) {
            Log.e(TAG, "deleteAll is not implemented because it should not be called from within library");
        }

        static void register(Context context, JSONArray args, CallbackContext callbackContext) throws JSONException {
            if (args == null || args.getString(0) == null) {
                throw new IllegalArgumentException("No method provided with args");
            }

            String method = args.getString(0);
            synchronized (registeredCallbacks) {
                registeredCallbacks.put(method, callbackContext);
            }

            if (EVENT_MESSAGESTORAGE_SAVE.equals(method)) {
                provideMessagesFromCache(context);
            }
        }

        private static void provideMessagesFromCache(Context context) {
            Message messages[] = CacheManager.loadMessages(context);
            if (messages.length == 0) {
                return;
            }

            if (saveJS(messages)) {
                Log.d(TAG, "Saved " + messages.length + " messages from cache");
            } else {
                CacheManager.saveMessages(context, messages);
                Log.w(TAG, "Cannot save messages from cache, postpone");
            }
        }

        static void unregister(JSONArray args) throws JSONException {
            if (args == null || args.getString(0) == null) {
                throw new IllegalArgumentException("No method provided with args");
            }

            String method = args.getString(0);
            synchronized (registeredCallbacks) {
                registeredCallbacks.remove(method);
            }
        }

        static boolean startJS() {
            CallbackContext callback;
            synchronized (registeredCallbacks) {
                callback = registeredCallbacks.get(EVENT_MESSAGESTORAGE_START);
            }
            if (callback == null) {
                return false;
            }

            sendCallback(callback, new PluginResult(PluginResult.Status.OK, EVENT_MESSAGESTORAGE_START));
            return true;
        }

        static List<Message> findAllJS() {
            CallbackContext callback;
            synchronized (registeredCallbacks) {
                callback = registeredCallbacks.get(EVENT_MESSAGESTORAGE_FIND_ALL);
            }
            if (callback == null) {
                return null;
            }

            synchronized (findAllResults) {
                findAllResults.clear();
                sendCallback(callback, new PluginResult(PluginResult.Status.OK, EVENT_MESSAGESTORAGE_FIND_ALL));
                try {
                    findAllResults.wait(SYNC_CALL_TIMEOUT_MS);
                    if (!findAllResults.isEmpty()) {
                        return resolveMessages(findAllResults.get(0));
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Cannot find messages: " + e);
                }
                return new ArrayList<Message>();
            }
        }

        static void findAllJSResult(JSONArray result) {
            synchronized (findAllResults) {
                findAllResults.add(result);
                findAllResults.notifyAll();
            }
        }

        static boolean saveJS(Message messages[]) {
            CallbackContext callback;
            synchronized (registeredCallbacks) {
                callback = registeredCallbacks.get(EVENT_MESSAGESTORAGE_SAVE);
            }
            if (callback == null) {
                return false;
            }
            sendCallback(callback, new PluginResult(PluginResult.Status.OK, messagesToJSONArray(messages)));
            return true;
        }

        static void sendCallback(CallbackContext callbackContext, PluginResult pluginResult) {
            pluginResult.setKeepCallback(true);
            callbackContext.sendPluginResult(pluginResult);
        }
    }
}
