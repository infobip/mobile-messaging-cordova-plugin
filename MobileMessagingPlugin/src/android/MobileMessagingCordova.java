package org.apache.cordova.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.infobip.mobile.messaging.BroadcastParameter;
import org.infobip.mobile.messaging.Event;
import org.infobip.mobile.messaging.Message;
import org.infobip.mobile.messaging.MobileMessaging;
import org.infobip.mobile.messaging.api.support.http.serialization.JsonSerializer;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.security.InvalidParameterException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class MobileMessagingCordova extends CordovaPlugin
{
	private static final String TAG = "MobileMessagingCordova";

    private static final String FUNCTION_INIT = "init";
    private static final String FUNCTION_REGISTER = "register";
    private static final String FUNCTION_UNREGISTER = "unregister";

    private static final String EVENT_MESSAGE_RECEIVED = "messageReceived";
    private static final String EVENT_TOKEN_RECEIVED = "tokenReceived";
    private static final String EVENT_REGISTRATION_UPDATED = "registrationUpdated";

    private static final Map<String, String> broadcastEventMap = new HashMap<String, String>() {{
        put(Event.MESSAGE_RECEIVED.getKey(), EVENT_MESSAGE_RECEIVED);
        put(Event.REGISTRATION_ACQUIRED.getKey(), EVENT_TOKEN_RECEIVED);
        put(Event.REGISTRATION_CREATED.getKey(), EVENT_REGISTRATION_UPDATED);
    }};

    private final Map<String, Set<CallbackContext>> eventCallbacksMap = new HashMap<String, Set<CallbackContext>>() {{
        put(EVENT_MESSAGE_RECEIVED, new HashSet<CallbackContext>());
        put(EVENT_TOKEN_RECEIVED, new HashSet<CallbackContext>());
        put(EVENT_REGISTRATION_UPDATED, new HashSet<CallbackContext>());
    }};

    private static class Configuration {

        class AndroidConfiguration {
            String senderId;
        }

        String applicationCode;
        AndroidConfiguration android;

        static Configuration fromJson(String json) {
            if (json == null) {
                return null;
            }

            return new JsonSerializer().deserialize(json, Configuration.class);
        }
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
        }

	    return false;
	}

    private void init(JSONArray args, CallbackContext callbackContext) throws JSONException {

        Log.d(TAG, "init: " + args.toString());

        if (args.length() < 1 || args.getJSONObject(0) == null) {
            Log.e(TAG, "Wrong arguments for init");
            sendCallbackError(callbackContext);
            return;
        }

        Configuration config = Configuration.fromJson(args.getJSONObject(0).toString());
        if (config == null || config.applicationCode == null || config.android.senderId == null) {
            Log.e(TAG, "Configuration is invalid: " + args.getJSONObject(0).toString());
            sendCallbackError(callbackContext);
            return;
        }

        try {
            init(config.applicationCode, config.android.senderId);
            sendCallbackSuccess(callbackContext);
        } catch (IllegalArgumentException ignored) {
            sendCallbackError(callbackContext);
        }
    }

    private void init(String applicationCode, String senderId) throws IllegalArgumentException {

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

        new MobileMessaging.Builder(cordova.getActivity().getApplication())
            .withApplicationCode(applicationCode)
            .withGcmSenderId(senderId)
            .build();
    }

    private void register(JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (args.length() < 1 || args.getString(0) == null) {
            Log.e(TAG, "Wrong arguments for register");
            sendCallbackError(callbackContext);
            return;
        }

        String eventName = args.getString(0);
        try {
            register(eventName, callbackContext);
            sendCallbackNoResult(callbackContext);
        } catch (InvalidParameterException ignored) {
            sendCallbackError(callbackContext);
        }
    }

    private synchronized void register(String eventName, CallbackContext callback) throws InvalidParameterException {
        if (!eventCallbacksMap.containsKey(eventName)) {
            Log.e(TAG, "Not supported event name: " + eventName);
            throw new InvalidParameterException("Not supported event name: " + eventName);
        }

        eventCallbacksMap.get(eventName).add(callback);
    }

    private void unregister(JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (args.length() < 1 || args.getString(0) == null) {
            Log.e(TAG, "Wrong arguments for unregister");
            sendCallbackError(callbackContext);
            return;
        }

        String eventName = args.getString(0);
        try {
            unregister(eventName, callbackContext);
            sendCallbackNoResult(callbackContext);
        } catch (InvalidParameterException ignored) {
            sendCallbackError(callbackContext);
        }
    }

    private synchronized void unregister(String eventName, CallbackContext callback) throws InvalidParameterException {
        if (!eventCallbacksMap.containsKey(eventName)) {
            Log.e(TAG, "Not supported event name: " + eventName);
            throw new InvalidParameterException("Not supported event name: " + eventName);
        }

        eventCallbacksMap.get(eventName).remove(callback);
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

    private void sendCallbackError(CallbackContext callback) {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.ERROR);
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

    private JSONObject messageFromBundle(Bundle bundle) {
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
}