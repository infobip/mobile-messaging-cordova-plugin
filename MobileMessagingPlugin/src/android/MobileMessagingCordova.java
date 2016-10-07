package org.apache.cordova.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;

import org.apache.cordova.*;
import org.infobip.mobile.messaging.*;
import org.infobip.mobile.messaging.api.support.http.serialization.JsonSerializer;
import org.json.*;

import java.util.ArrayList;
import java.util.List;

public class MobileMessagingCordova extends CordovaPlugin
{
	private static final String TAG = "MobileMessagingCordova";

    private static final String FUNCTION_INIT = "init";

    private static final String EVENT_FIELD_TYPE = "type";
    private static final String EVENT_FIELD_DATA = "data";

    private static final String EVENT_TYPE_INIT = "init";
    private static final String EVENT_TYPE_MESSAGE = "message";

    private CallbackContext cordovaCallback;
    private CordovaInterface cordovaInterface;
    private CordovaWebView cordovaWebView;

	private MobileMessaging mobileMessaging;

    static class Configuration {

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
	public void initialize(CordovaInterface cordova, CordovaWebView webView) {

        Log.d(TAG, "initialize plugin");

        this.cordovaInterface = cordova;
        this.cordovaWebView = webView;
	}

	@Override
	public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {

        Log.d(TAG, "execute: " + action);
        if (FUNCTION_INIT.equals(action)) {
            return init(args, callbackContext);
        }

	    return false;
	}

    private boolean init(JSONArray args, CallbackContext callbackContext) throws JSONException {

        Log.d(TAG, "init: " + args.toString());

        if (args.length() < 1 || args.getJSONObject(0) == null) {
            Log.e(TAG, "Wrong arguments for init");
            return false;
        }

        Configuration config = Configuration.fromJson(args.getJSONObject(0).toString());
        if (config == null || config.applicationCode == null || config.android.senderId == null) {
            Log.e(TAG, "Configuration is invalid: " + args.getJSONObject(0).toString());
            return false;
        }

        this.cordovaCallback = callbackContext;

        LocalBroadcastManager.getInstance(cordova.getActivity()).registerReceiver(new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    Message message = Message.createFrom(intent.getExtras());
                    JSONObject json = convertToJson(message);
                    if (json == null) {
                        return;
                    }

                    Log.v(TAG, "Received message: " + json.toString());
                    sendCallbackEvent(EVENT_TYPE_MESSAGE, json);
                }
            }, new IntentFilter(Event.MESSAGE_RECEIVED.getKey()));

        mobileMessaging = new MobileMessaging.Builder(cordova.getActivity().getApplication())
            .withApplicationCode(config.applicationCode)
            .withGcmSenderId(config.android.senderId)
            .build();

        return true;
    }

    void sendCallbackEvent(String event, Object object) {
        if (cordovaCallback == null) {
            return;
        }

        JSONObject json = new JSONObject();
        try {
            json.putOpt(EVENT_FIELD_TYPE, event);
            json.putOpt(EVENT_FIELD_DATA, object);
        } catch (JSONException e) {
            Log.e(TAG, "Cannot create event: " + e.getMessage());
            Log.d(TAG, Log.getStackTraceString(e));
            return;
        }

        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, json);
        pluginResult.setKeepCallback(true);
        cordovaCallback.sendPluginResult(pluginResult);
    }

    JSONObject convertToJson(Message message) {
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