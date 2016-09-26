package org.apache.cordova.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;

import org.apache.cordova.*;
import org.infobip.mobile.messaging.*;
import org.json.*;

import java.util.ArrayList;
import java.util.List;

import static org.infobip.mobile.messaging.BroadcastParameter.EXTRA_USER_DATA;

public class MobileMessagingCordova extends CordovaPlugin
{
	private static final String TAG = "MobileMessagingCordova";
	private MobileMessaging mobileMessaging;
    private CallbackContext callbackContext;
    private List<Message> messages = new ArrayList<Message>();

    private final BroadcastReceiver messageReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            Message message = Message.createFrom(intent.getExtras());
            processMessage(message);
        }
    };

    synchronized void processMessage(Message message) {
        if (message != null) {
            messages.add(message);
        }
        if (callbackContext != null) {
            callbackContext.success(message.getBody());
        }
    }

	@Override
	public void initialize(CordovaInterface cordova, CordovaWebView webView) {

        Log.i(TAG, "initialize plugin");

        LocalBroadcastManager.getInstance(cordova.getActivity()).registerReceiver(messageReceiver,
                new IntentFilter(Event.MESSAGE_RECEIVED.getKey()));
	}

	@Override
	public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {

        Log.i(TAG, "execute: " + action);

        if (action.equals("registerForMessage")) {
            this.callbackContext = callbackContext;
            processMessage(null);
            return true;
        } if (action.equals("initWithCredentials")) {
            String appCode = args.getString(0);
            String senderId = args.getString(1);

            Log.i(TAG, "initWithCredentials: " + args.toString());

            mobileMessaging = new MobileMessaging.Builder(cordova.getActivity())
                .withApplicationCode(appCode)
                .withGcmSenderId(senderId)
                .build();

            return true;

        } else if (action.equals("start") || action.equals("showAlert")) {
            return true;
        }

	    return false;  // Returning false results in a "MethodNotFound" error.
	}
}