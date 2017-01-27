package org.apache.cordova.plugin;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Bundle;
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
import org.infobip.mobile.messaging.UserData;
import org.infobip.mobile.messaging.api.support.http.serialization.JsonSerializer;
import org.infobip.mobile.messaging.api.support.util.StringUtils;
import org.infobip.mobile.messaging.geo.Area;
import org.infobip.mobile.messaging.geo.Geo;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;

public class MobileMessagingCordova extends CordovaPlugin {
    private static final String TAG = "MobileMessagingCordova";

    private static final int REQ_CODE_LOC_PERMISSION_FOR_INIT = 1;

    private static final String FUNCTION_INIT = "init";
    private static final String FUNCTION_REGISTER = "register";
    private static final String FUNCTION_UNREGISTER = "unregister";
    private static final String FUNCTION_SYNC_USER_DATA = "syncUserData";
    private static final String FUNCTION_FETCH_USER_DATA = "fetchUserData";
    private static final String FUNCTION_MARK_MESSAGES_SEEN = "markMessagesSeen";

    private static final String EVENT_MESSAGE_RECEIVED = "messageReceived";
    private static final String EVENT_TOKEN_RECEIVED = "tokenReceived";
    private static final String EVENT_REGISTRATION_UPDATED = "registrationUpdated";
    private static final String EVENT_GEOFENCE_ENTERED = "geofenceEntered";

    private static final Map<String, String> broadcastEventMap = new HashMap<String, String>() {{
        put(Event.MESSAGE_RECEIVED.getKey(), EVENT_MESSAGE_RECEIVED);
        put(Event.REGISTRATION_ACQUIRED.getKey(), EVENT_TOKEN_RECEIVED);
        put(Event.REGISTRATION_CREATED.getKey(), EVENT_REGISTRATION_UPDATED);
        put(Event.GEOFENCE_AREA_ENTERED.getKey(), EVENT_GEOFENCE_ENTERED);
    }};

    private final Map<String, Set<CallbackContext>> eventCallbacksMap = new HashMap<String, Set<CallbackContext>>() {{
        for (String event : broadcastEventMap.values()) {
            put(event, new HashSet<CallbackContext>());
        }
    }};

    private static class Configuration {

        class AndroidConfiguration {
            String senderId;
        }

        String applicationCode;
        AndroidConfiguration android;
        boolean geofencingEnabled;
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

    private final InitContext initContext = new InitContext();

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
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {

        Log.d(TAG, "execute: " + action + " args: " + args.toString());

        if (FUNCTION_INIT.equals(action)) {
            init(args, callbackContext);
            return true;
        } else if (FUNCTION_REGISTER.equals(action)) {
            register(args, callbackContext);
            return true;
        } else if (FUNCTION_UNREGISTER.equals(action)) {
            unregister(args, callbackContext);
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
        }

        return false;
    }

    private void init(JSONArray args, CallbackContext callbackContext) throws JSONException {
        Configuration configuration = resolveConfiguration(args);
        if (configuration.geofencingEnabled && (!cordova.hasPermission(Manifest.permission.ACCESS_FINE_LOCATION) ||
                ActivityCompat.checkSelfPermission(cordova.getActivity(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED)) {
            initContext.args = args;
            initContext.callbackContext = callbackContext;
            cordova.requestPermission(this, REQ_CODE_LOC_PERMISSION_FOR_INIT, Manifest.permission.ACCESS_FINE_LOCATION);
            return;
        }

        IntentFilter intentFilter = new IntentFilter();
        for (String action : broadcastEventMap.keySet()) {
            intentFilter.addAction(action);
        }

        LocalBroadcastManager.getInstance(cordova.getActivity()).registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {

                String event = broadcastEventMap.get(intent.getAction());
                if (event == null) {
                    return;
                }

                if (Event.GEOFENCE_AREA_ENTERED.getKey().equals(intent.getAction())) {
                    for (JSONObject geo : geosFromBundle(intent.getExtras())) {
                        sendCallbackEvent(event, geo);
                    }
                    return;
                }

                Object data = null;
                if (Event.MESSAGE_RECEIVED.getKey().equals(intent.getAction())) {
                    data = messageFromBundle(intent.getExtras());
                } else if (Event.REGISTRATION_ACQUIRED.getKey().equals(intent.getAction())) {
                    data = intent.getStringExtra(BroadcastParameter.EXTRA_GCM_TOKEN);
                } else if (Event.REGISTRATION_CREATED.getKey().equals(intent.getAction())) {
                    data = intent.getStringExtra(BroadcastParameter.EXTRA_INFOBIP_ID);
                }

                sendCallbackEvent(event, data);
            }
        }, intentFilter);

        MobileMessaging.Builder builder = new MobileMessaging.Builder(cordova.getActivity().getApplication())
                .withApplicationCode(configuration.applicationCode)
                .withGcmSenderId(configuration.android.senderId);

        if (configuration.geofencingEnabled) {
            builder.withGeofencing();
        }

        builder.build();

        sendCallbackSuccess(callbackContext);
    }

    private synchronized void register(JSONArray args, CallbackContext callbackContext) throws JSONException {
        String eventName = resolveEventName(args);
        eventCallbacksMap.get(eventName).add(callbackContext);
        sendCallbackNoResult(callbackContext);
    }

    private synchronized void unregister(JSONArray args, CallbackContext callbackContext) throws JSONException {
        String eventName = resolveEventName(args);
        eventCallbacksMap.get(eventName).remove(callbackContext);
        sendCallbackNoResult(callbackContext);
    }

    private void syncUserData(JSONArray args, final CallbackContext callbackContext) throws JSONException {
        UserData userData = resolveUserData(args);
        MobileMessaging.getInstance(cordova.getActivity().getApplicationContext())
                .syncUserData(userData, new MobileMessaging.ResultListener<UserData>() {
                    @Override
                    public void onResult(UserData result) {
                        JSONObject json = UserDataJson.toJSON(result);
                        sendCallbackSuccess(callbackContext, json);
                    }

                    @Override
                    public void onError(Throwable e) {
                        sendCallbackError(callbackContext, e.getMessage());
                    }
                });
    }

    private void fetchUserData(final CallbackContext callbackContext) throws JSONException {
        MobileMessaging.getInstance(cordova.getActivity().getApplicationContext())
                .fetchUserData(new MobileMessaging.ResultListener<UserData>() {
                    @Override
                    public void onResult(UserData result) {
                        JSONObject json = UserDataJson.toJSON(result);
                        sendCallbackSuccess(callbackContext, json);
                    }

                    @Override
                    public void onError(Throwable e) {
                        sendCallbackError(callbackContext, e.getMessage());
                    }
                });
    }

    private void markMessagesSeen(JSONArray args, CallbackContext callbackContext) throws JSONException {
        String messageIds[] = resolveStringArray(args);
        MobileMessaging.getInstance(cordova.getActivity().getApplicationContext())
                .setMessagesSeen(messageIds);
        sendCallbackSuccess(callbackContext, args);
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
    private synchronized String resolveEventName(JSONArray args) throws JSONException {
        if (args.length() < 1 || args.getString(0) == null) {
            throw new IllegalArgumentException("Cannot resolve event name from arguments");
        }

        String eventName = args.getString(0);
        if (!eventCallbacksMap.containsKey(eventName)) {
            throw new IllegalArgumentException("Not supported event name: " + eventName);
        }

        return eventName;
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

    private synchronized void sendCallbackEvent(String event, Object object) {
        if (event == null || object == null) {
            return;
        }

        Set<CallbackContext> callbacks = eventCallbacksMap.get(event);
        if (callbacks == null || callbacks.isEmpty()) {
            return;
        }

        PluginResult pluginResult;
        if (object instanceof String) {
            pluginResult = new PluginResult(PluginResult.Status.OK, (String) object);
        } else if (object instanceof JSONObject) {
            pluginResult = new PluginResult(PluginResult.Status.OK, (JSONObject) object);
        } else {
            Log.e(TAG, "Unsupported callback object type: " + object.getClass().getSimpleName());
            return;
        }

        pluginResult.setKeepCallback(true);
        for (CallbackContext callback : callbacks) {
            callback.sendPluginResult(pluginResult);
        }
    }

    private void sendCallbackError(CallbackContext callback, String message) {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.ERROR, message);
        callback.sendPluginResult(pluginResult);
    }

    private void sendCallbackNoResult(CallbackContext callback) {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
        pluginResult.setKeepCallback(true);
        callback.sendPluginResult(pluginResult);
    }

    private void sendCallbackSuccess(CallbackContext callback) {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK);
        callback.sendPluginResult(pluginResult);
    }

    private void sendCallbackSuccess(CallbackContext callback, JSONArray objects) {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, objects);
        callback.sendPluginResult(pluginResult);
    }

    private void sendCallbackSuccess(CallbackContext callback, JSONObject object) {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, object);
        callback.sendPluginResult(pluginResult);
    }

    private static JSONObject messageFromBundle(Bundle bundle) {
        Message message = Message.createFrom(bundle);
        if (message == null) {
            return null;
        }

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
                    .putOpt("internalData", message.getInternalData())
                    .putOpt("customPayload", message.getCustomPayload());
        } catch (JSONException e) {
            Log.w(TAG, "Cannot convert message to JSON: " + e.getMessage());
            Log.d(TAG, Log.getStackTraceString(e));
            return null;
        }
    }

    @NonNull
    private static List<JSONObject> geosFromBundle(Bundle bundle) {
        Geo geo = Geo.createFrom(bundle);
        JSONObject message = messageFromBundle(bundle);
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
                        .putOpt("message", message));
            } catch (JSONException e) {
                Log.w(TAG, "Cannot convert geo to JSON: " + e.getMessage());
                Log.d(TAG, Log.getStackTraceString(e));
            }
        }

        return geos;
    }

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
                for (String key : predefinedUserDataKeys) {
                    json.putOpt(key, userData.getPredefinedUserData().get(key));
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
}