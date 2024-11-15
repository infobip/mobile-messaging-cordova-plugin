package org.apache.cordova.plugin;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Application;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.graphics.Color;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.preference.PreferenceManager;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import android.util.Log;

import org.infobip.mobile.messaging.chat.core.InAppChatEvent;
import org.infobip.mobile.messaging.mobileapi.apiavailability.ApiAvailability;

//import com.google.firebase.FirebaseOptions;
import com.google.gson.reflect.TypeToken;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.infobip.mobile.messaging.BroadcastParameter;
import org.infobip.mobile.messaging.CustomAttributeValue;
import org.infobip.mobile.messaging.CustomAttributesMapper;
import org.infobip.mobile.messaging.Event;
import org.infobip.mobile.messaging.Installation;
import org.infobip.mobile.messaging.InstallationMapper;
import org.infobip.mobile.messaging.Message;
import org.infobip.mobile.messaging.MobileMessaging;
import org.infobip.mobile.messaging.MobileMessagingCore;
import org.infobip.mobile.messaging.MobileMessagingProperty;
import org.infobip.mobile.messaging.NotificationSettings;
import org.infobip.mobile.messaging.SuccessPending;
import org.infobip.mobile.messaging.inbox.Inbox;
import org.infobip.mobile.messaging.inbox.InboxMessage;
import org.infobip.mobile.messaging.inbox.MobileInbox;
import org.infobip.mobile.messaging.inbox.InboxMapper;
import org.infobip.mobile.messaging.inbox.InboxDataMapper;
import org.infobip.mobile.messaging.inbox.MobileInboxFilterOptions;
import org.infobip.mobile.messaging.inbox.MobileInboxFilterOptionsJson;
import org.infobip.mobile.messaging.plugins.CustomEventJson;
import org.infobip.mobile.messaging.plugins.InstallationJson;
import org.infobip.mobile.messaging.plugins.MessageJson;
import org.infobip.mobile.messaging.plugins.PersonalizationCtx;
import org.infobip.mobile.messaging.plugins.UserJson;
import org.infobip.mobile.messaging.User;
import org.infobip.mobile.messaging.UserAttributes;
import org.infobip.mobile.messaging.UserIdentity;
import org.infobip.mobile.messaging.UserMapper;
import org.infobip.mobile.messaging.api.appinstance.UserAtts;
import org.infobip.mobile.messaging.api.appinstance.UserCustomEventAtts;
import org.infobip.mobile.messaging.api.support.http.serialization.JsonSerializer;
import org.infobip.mobile.messaging.app.ActivityLifecycleMonitor;
import org.infobip.mobile.messaging.dal.json.JSONArrayAdapter;
import org.infobip.mobile.messaging.dal.json.JSONObjectAdapter;
import org.infobip.mobile.messaging.interactive.InteractiveEvent;
import org.infobip.mobile.messaging.interactive.MobileInteractive;
import org.infobip.mobile.messaging.interactive.NotificationAction;
import org.infobip.mobile.messaging.interactive.NotificationCategory;
import org.infobip.mobile.messaging.logging.MobileMessagingLogger;
import org.infobip.mobile.messaging.mobileapi.InternalSdkError;
import org.infobip.mobile.messaging.mobileapi.MobileMessagingError;
import org.infobip.mobile.messaging.mobileapi.Result;
import org.infobip.mobile.messaging.CustomEvent;
import org.infobip.mobile.messaging.storage.MessageStore;
import org.infobip.mobile.messaging.storage.SQLiteMessageStore;
import org.infobip.mobile.messaging.util.Cryptor;
import org.infobip.mobile.messaging.util.DateTimeUtil;
import org.infobip.mobile.messaging.util.DeviceInformation;
import org.infobip.mobile.messaging.util.PreferenceHelper;
import org.infobip.mobile.messaging.chat.InAppChat;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class MobileMessagingCordova extends CordovaPlugin {
    private static final String TAG = "MobileMessagingCordova";

    private static final int REQ_CODE_LOC_PERMISSION_FOR_INIT = 1;
    private static final int REQ_CODE_RESOLVE_GOOGLE_ERROR = 2;
    private static final int REQ_CODE_POST_NOTIFICATIONS = 3;

    private static final String FUNCTION_INIT = "init";
    private static final String FUNCTION_REGISTER_RECEIVER = "registerReceiver";
    private static final String FUNCTION_SAVE_USER = "saveUser";
    private static final String FUNCTION_FETCH_USER = "fetchUser";
    private static final String FUNCTION_GET_USER = "getUser";
    private static final String FUNCTION_SAVE_INSTALLATION = "saveInstallation";
    private static final String FUNCTION_FETCH_INSTALLATION = "fetchInstallation";
    private static final String FUNCTION_GET_INSTALLATION = "getInstallation";
    private static final String FUNCTION_PERSONALIZE = "personalize";
    private static final String FUNCTION_DEPERSONALIZE = "depersonalize";
    private static final String FUNCTION_DEPERSONALIZE_INSTALLATION = "depersonalizeInstallation";
    private static final String FUNCTION_SET_INSTALLATION_AS_PRIMARY = "setInstallationAsPrimary";

    private static final String FUNCTION_SHOW_DIALOG_FOR_ERROR = "showDialogForError";
    private static final String FUNCTION_MARK_MESSAGES_SEEN = "markMessagesSeen";
    private static final String FUNCTION_MESSAGESTORAGE_REGISTER = "messageStorage_register";
    private static final String FUNCTION_MESSAGESTORAGE_UNREGISTER = "messageStorage_unregister";
    private static final String FUNCTION_MESSAGESTORAGE_FINDALL_RESULT = "messageStorage_findAllResult";
    private static final String FUNCTION_DEF_MESSAGESTORAGE_FIND = "defaultMessageStorage_find";
    private static final String FUNCTION_DEF_MESSAGESTORAGE_FINDALL = "defaultMessageStorage_findAll";
    private static final String FUNCTION_DEF_MESSAGESTORAGE_DELETE = "defaultMessageStorage_delete";
    private static final String FUNCTION_DEF_MESSAGESTORAGE_DELETEALL = "defaultMessageStorage_deleteAll";

    private static final String FUNCTION_SUBMIT_EVENT_IMMEDIATELY = "submitEventImmediately";
    private static final String FUNCTION_SUBMIT_EVENT = "submitEvent";

    private static final String FUNCTION_REGISTER_FOR_POST_NOTIFICATIONS = "registerForAndroidRemoteNotifications";

    private static final String EVENT_TOKEN_RECEIVED = "tokenReceived";
    private static final String EVENT_REGISTRATION_UPDATED = "registrationUpdated";
    private static final String EVENT_INSTALLATION_UPDATED = "installationUpdated";
    private static final String EVENT_USER_UPDATED = "userUpdated";
    private static final String EVENT_PERSONALIZED = "personalized";
    private static final String EVENT_DEPERSONALIZED = "depersonalized";
    private static final String EVENT_DEEPLINK = "deeplink";
    private static final String EVENT_INAPP_CHAT_UNREAD_MESSAGE_COUNTER_UPDATED = "inAppChat.unreadMessageCounterUpdated";

    private static final String EVENT_NOTIFICATION_TAPPED = "notificationTapped";
    private static final String EVENT_NOTIFICATION_ACTION_TAPPED = "actionTapped";
    private static final String EVENT_MESSAGE_RECEIVED = "messageReceived";
    private static final String EVENT_MESSAGESTORAGE_START = "messageStorage.start";
    private static final String EVENT_MESSAGESTORAGE_SAVE = "messageStorage.save";
    private static final String EVENT_MESSAGESTORAGE_FIND_ALL = "messageStorage.findAll";

    private static final String FUNCTION_SHOW_INAPP_CHAT = "showChat";
    private static final String FUNCTION_INAPP_CHAT_GET_MESSAGE_COUNTER = "getMessageCounter";
    private static final String FUNCTION_INAPP_CHAT_RESET_MESSAGE_COUNTER = "resetMessageCounter";
    private static final String FUNCTION_INAPP_CHAT_SET_LANGUAGE = "setLanguage";
    private static final String FUNCTION_INAPP_CHAT_SEND_CONTEXTUAL_DATA = "sendContextualData";

    private static final String FUNCTION_MOBILE_FETCH_INBOX = "fetchInboxMessages";
    private static final String FUNCTION_MOBILE_FETCH_INBOX_WITHOUT_TOKEN = "fetchInboxMessagesWithoutToken";
    private static final String FUNCTION_MOBILE_INBOX_SET_SEEN = "setInboxMessagesSeen";

    private static final Map<String, String> broadcastEventMap = new HashMap<String, String>() {{
        put(Event.TOKEN_RECEIVED.getKey(), EVENT_TOKEN_RECEIVED);
        put(Event.REGISTRATION_CREATED.getKey(), EVENT_REGISTRATION_UPDATED);
        put(Event.INSTALLATION_UPDATED.getKey(), EVENT_INSTALLATION_UPDATED);
        put(Event.USER_UPDATED.getKey(), EVENT_USER_UPDATED);
        put(Event.PERSONALIZED.getKey(), EVENT_PERSONALIZED);
        put(Event.DEPERSONALIZED.getKey(), EVENT_DEPERSONALIZED);
        put(InteractiveEvent.NOTIFICATION_ACTION_TAPPED.getKey(), EVENT_NOTIFICATION_ACTION_TAPPED);
        put(InAppChatEvent.UNREAD_MESSAGES_COUNTER_UPDATED.getKey(), EVENT_INAPP_CHAT_UNREAD_MESSAGE_COUNTER_UPDATED);
    }};

    private static final Map<String, String> messageBroadcastEventMap = new HashMap<String, String>() {{
        put(Event.MESSAGE_RECEIVED.getKey(), EVENT_MESSAGE_RECEIVED);
        put(Event.NOTIFICATION_TAPPED.getKey(), EVENT_NOTIFICATION_TAPPED);
    }};

    private static final Map<SuccessPending, String> depersonalizeStates = new HashMap<SuccessPending, String>() {{
        put(SuccessPending.Pending, "pending");
        put(SuccessPending.Success, "success");
    }};

    private static volatile CallbackContext libraryEventReceiver = null;

    private final CordovaCallContext initContext = new CordovaCallContext();
    private final CordovaCallContext showErrorDialogContext = new CordovaCallContext();
    private static CallbackContext registerForAndroidPermissionContext;

    private static final BroadcastReceiver commonLibraryBroadcastReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String event = broadcastEventMap.get(intent.getAction());
            if (event == null) {
                return;
            }

            if (InteractiveEvent.NOTIFICATION_ACTION_TAPPED.getKey().equals(intent.getAction())) {
                Message message = Message.createFrom(intent.getExtras());
                NotificationAction notificationAction = NotificationAction.createFrom(intent.getExtras());
                if (libraryEventReceiver != null) {
                    sendCallbackEvent(event, libraryEventReceiver, MessageJson.toJSON(message), notificationAction.getId(), notificationAction.getInputText());
                }
                return;
            }

            if (Event.INSTALLATION_UPDATED.getKey().equals(intent.getAction())) {
                if (libraryEventReceiver != null) {
                    JSONObject updatedInstallation = InstallationJson.toJSON(Installation.createFrom(intent.getExtras()));
                    sendCallbackEvent(event, libraryEventReceiver, updatedInstallation);
                }
                return;
            }

            if (Event.USER_UPDATED.getKey().equals(intent.getAction()) || Event.PERSONALIZED.getKey().equals(intent.getAction())) {
                if (libraryEventReceiver != null) {
                    JSONObject updatedUser = UserJson.toJSON(User.createFrom(intent.getExtras()));
                    sendCallbackEvent(event, libraryEventReceiver, updatedUser);
                }
                return;
            }

            Object data = null;
            if (Event.TOKEN_RECEIVED.getKey().equals(intent.getAction())) {
                data = intent.getStringExtra(BroadcastParameter.EXTRA_CLOUD_TOKEN);
            } else if (Event.REGISTRATION_CREATED.getKey().equals(intent.getAction())) {
                data = intent.getStringExtra(BroadcastParameter.EXTRA_INFOBIP_ID);
            } else if (InAppChatEvent.UNREAD_MESSAGES_COUNTER_UPDATED.getKey().equals(intent.getAction())) {
                data = intent.getIntExtra(BroadcastParameter.EXTRA_UNREAD_CHAT_MESSAGES_COUNT, 0);
            }

            if (libraryEventReceiver != null) {
                if (data == null) {
                    sendCallbackEvent(event, libraryEventReceiver);
                } else {
                    sendCallbackEvent(event, libraryEventReceiver, data);
                }
            }
        }
    };

    private static class Configuration {

        class AndroidConfiguration {
            String notificationIcon;
            boolean multipleNotifications;
            String notificationAccentColor;
//            FirebaseOptions firebaseOptions;
        }

        class PrivacySettings {
            boolean userDataPersistingDisabled;
            boolean carrierInfoSendingDisabled;
            boolean systemInfoSendingDisabled;
        }

        class Action {
            String identifier;
            String title;
            boolean foreground;
            boolean moRequired;
            String icon;
            String textInputPlaceholder;
        }

        class Category {
            String identifier;
            List<Action> actions;
        }

        AndroidConfiguration android;
        String applicationCode;
        boolean geofencingEnabled = false;
        boolean inAppChatEnabled;
        boolean fullFeaturedInAppsEnabled;
        Map<String, ?> messageStorage;
        boolean defaultMessageStorage;
        boolean loggingEnabled;
        String cordovaPluginVersion = "unknown";
        PrivacySettings privacySettings = new PrivacySettings();
        List<Category> notificationCategories = new ArrayList<Category>();
    }

    private static class CordovaCallContext {
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

            JSONObject message = MessageJson.bundleToJSON(intent.getExtras());
            if (libraryEventReceiver == null) {
                CacheManager.saveEvent(context, event, message);
                return;
            }

            sendCallbackEvent(event, libraryEventReceiver, message);
        }
    }

    @Override
    public void onRequestPermissionResult(int requestCode, String[] permissions, int[] grantResults) throws JSONException {
        if (requestCode == REQ_CODE_POST_NOTIFICATIONS) {
            if (registerForAndroidPermissionContext == null) {
                Log.e(TAG, "Callback context was null for POST_NOTIFICATIONS permission");
                return;
            }
            if (!cordova.hasPermission(Manifest.permission.POST_NOTIFICATIONS)) {
                sendCallbackError(registerForAndroidPermissionContext, "POST_NOTIFICATIONS is not granted");
                return;
            }
        }

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
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
        if (requestCode != REQ_CODE_RESOLVE_GOOGLE_ERROR) {
            return;
        }

        if (!showErrorDialogContext.isValid()) {
            Log.e(TAG, "Show dialog context is invalid, cannot forward information to Cordova");
            return;
        }

        CallbackContext callbackContext = showErrorDialogContext.callbackContext;
        showErrorDialogContext.reset();

        ApiAvailability apiAvailability = new ApiAvailability();
        if (!apiAvailability.isServicesAvailable(cordova.getActivity())) {
            try {
                showDialogForError(new JSONArray(Collections.singletonList(
                        apiAvailability.checkServicesStatus(cordova.getActivity())
                )), callbackContext);
            } catch (JSONException e) {
                sendCallbackError(callbackContext, e.getMessage());
            }
            return;
        }

        sendCallbackSuccess(callbackContext);
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
        } else if (FUNCTION_SAVE_USER.equals(action)) {
            saveUser(args, callbackContext);
            return true;
        } else if (FUNCTION_FETCH_USER.equals(action)) {
            fetchUser(callbackContext);
            return true;
        } else if (FUNCTION_GET_USER.equals(action)) {
            getUser(callbackContext);
            return true;
        } else if (FUNCTION_SAVE_INSTALLATION.equals(action)) {
            saveInstallation(args, callbackContext);
            return true;
        } else if (FUNCTION_FETCH_INSTALLATION.equals(action)) {
            fetchInstallation(callbackContext);
            return true;
        } else if (FUNCTION_GET_INSTALLATION.equals(action)) {
            getInstallation(callbackContext);
            return true;
        } else if (FUNCTION_PERSONALIZE.equals(action)) {
            personalize(args, callbackContext);
            return true;
        } else if (FUNCTION_DEPERSONALIZE.equals(action)) {
            depersonalize(callbackContext);
            return true;
        } else if (FUNCTION_DEPERSONALIZE_INSTALLATION.equals(action)) {
            depersonalizeInstallation(args, callbackContext);
            return true;
        } else if (FUNCTION_SET_INSTALLATION_AS_PRIMARY.equals(action)) {
            setInstallationAsPrimary(args, callbackContext);
            return true;
        } else if (FUNCTION_MARK_MESSAGES_SEEN.equals(action)) {
            markMessagesSeen(args, callbackContext);
            return true;
        } else if (FUNCTION_SHOW_DIALOG_FOR_ERROR.equals(action)) {
            showDialogForError(args, callbackContext);
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
        } else if (FUNCTION_SUBMIT_EVENT_IMMEDIATELY.equals(action)) {
            submitEventImmediately(args, callbackContext);
            return true;
        } else if (FUNCTION_SUBMIT_EVENT.equals(action)) {
            submitEvent(args, callbackContext);
            return true;
        } else if (FUNCTION_SHOW_INAPP_CHAT.equals(action)) {
            showInAppChat(args, callbackContext);
            return true;
        } else if (FUNCTION_INAPP_CHAT_GET_MESSAGE_COUNTER.equals(action)) {
            getMessageCounter(args, callbackContext);
            return true;
        } else if (FUNCTION_INAPP_CHAT_RESET_MESSAGE_COUNTER.equals(action)) {
            resetMessageCounter(args, callbackContext);
            return true;
        } else if (FUNCTION_INAPP_CHAT_SET_LANGUAGE.equals(action)) {
            setLanguage(args, callbackContext);
            return true;
        } else if (FUNCTION_INAPP_CHAT_SEND_CONTEXTUAL_DATA.equals(action)) {
            sendContextualData(args, callbackContext);
            return true;
        } else if (FUNCTION_REGISTER_FOR_POST_NOTIFICATIONS.equals(action)) {
            registerForAndroidRemoteNotifications(args, callbackContext);
            return true;
        } else if (FUNCTION_MOBILE_FETCH_INBOX.equals(action)) {
            fetchInboxMessages(args, callbackContext);
            return true;
        } else if (FUNCTION_MOBILE_FETCH_INBOX_WITHOUT_TOKEN.equals(action)) {
            fetchInboxMessagesWithoutToken(args, callbackContext);
            return true;
        } else if (FUNCTION_MOBILE_INBOX_SET_SEEN.equals(action)) {
            setInboxMessagesSeen(args, callbackContext);
            return true;
        }

        return false;
    }


    private void init(JSONArray args, final CallbackContext callbackContext) throws JSONException {
        final Configuration configuration = resolveConfiguration(args);

        final Application context = cordova.getActivity().getApplication();

        //Opening the application by the deeplink
        final Intent intent = cordova.getActivity().getIntent();
        if (intent != null && intent.getDataString() != null) {
            sendCallbackEvent(EVENT_DEEPLINK, libraryEventReceiver, intent.getDataString());
        }

        if (configuration.loggingEnabled) {
            MobileMessagingLogger.enforce();
        }

        PreferenceHelper.saveString(context, MobileMessagingProperty.SYSTEM_DATA_VERSION_POSTFIX, "cordova " + configuration.cordovaPluginVersion);

        MobileMessaging.Builder builder = new MobileMessaging.Builder(context)
                .withoutRegisteringForRemoteNotifications()
                .withApplicationCode(configuration.applicationCode);

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
        if (configuration.fullFeaturedInAppsEnabled) {
            builder.withFullFeaturedInApps();
        }

        if (configuration.android != null) {
            NotificationSettings.Builder notificationBuilder = new NotificationSettings.Builder(context);
            if (configuration.android.notificationIcon != null) {
                int resId = getResId(context.getResources(), configuration.android.notificationIcon, context.getPackageName());
                if (resId != 0) {
                    notificationBuilder.withDefaultIcon(resId);
                }
            }
            if (configuration.android.multipleNotifications) {
                notificationBuilder.withMultipleNotifications();
            }
            if (configuration.android.notificationAccentColor != null) {
                int color = Color.parseColor(configuration.android.notificationAccentColor);
                notificationBuilder.withColor(color);
            }
            builder.withDisplayNotification(notificationBuilder.build());
            //TODO:
//            if (configuration.android.firebaseOptions != null) {
//                builder.withFirebaseOptions(configuration.android.firebaseOptions);
//            }

        }

        // Checking do we need to migrate data saved with old cryptor,
        // if withCryptorMigration project ext property is set, ECBCryptorImpl class will exist.
        Cryptor cryptor = null;
        try {
            Class cls = Class.forName("org.infobip.mobile.messaging.cryptor.ECBCryptorImpl");
            cryptor = (Cryptor) cls.getDeclaredConstructor(String.class).newInstance(DeviceInformation.getDeviceID(context));
        } catch (Exception e) {
            Log.d(TAG, "Will not migrate cryptor: ");
            e.printStackTrace();
        }
        if (cryptor != null) {
            builder.withCryptorMigration(cryptor);
        }

        builder.build(new MobileMessaging.InitListener() {
            @SuppressLint("MissingPermission")
            @Override
            public void onSuccess() {

                NotificationCategory categories[] = notificationCategoriesFromConfiguration(configuration.notificationCategories);
                if (categories.length > 0) {
                    MobileInteractive.getInstance(cordova.getActivity().getApplication()).setNotificationCategories(categories);
                }

                // init method is called from WebView when activity is running
                // so we can safely claim that we are in foreground
                setForeground();

                if (callbackContext != null) {
                    sendCallbackSuccessKeepCallback(callbackContext);
                }
            }

            @Override
            public void onError(InternalSdkError e, @Nullable Integer googleErrorCode) {
                if (callbackContext != null) {
                    sendCallbackError(callbackContext, e.get(), googleErrorCode);
                } else {
                    Log.e(TAG, "Cannot start SDK: " + e.get() + " errorCode: " + googleErrorCode);
                }
            }
        });

        if (configuration.inAppChatEnabled) {
            InAppChat.getInstance(context).activate();
        }
    }

    /**
     * Gets resource ID
     *
     * @param res         the resources where to look for
     * @param resPath     the name of the resource
     * @param packageName name of the package where the resource should be searched for
     * @return resource identifier or 0 if not found
     */
    private int getResId(Resources res, String resPath, String packageName) {
        int resId = res.getIdentifier(resPath, "mipmap", packageName);
        if (resId == 0) {
            resId = res.getIdentifier(resPath, "drawable", packageName);
        }
        if (resId == 0) {
            resId = res.getIdentifier(resPath, "raw", packageName);
        }

        return resId;
    }

    private void setForeground() {
        ActivityLifecycleMonitor monitor = MobileMessagingCore
                .getInstance(cordova.getActivity().getApplicationContext())
                .getActivityLifecycleMonitor();
        if (monitor != null) {
            monitor.onActivityResumed(cordova.getActivity());
        }
    }

    private void registerReceiver(final CallbackContext callbackContext) {

        IntentFilter intentFilter = new IntentFilter();
        for (String action : broadcastEventMap.keySet()) {
            intentFilter.addAction(action);
        }

        libraryEventReceiver = callbackContext;

        LocalBroadcastManager.getInstance(cordova.getActivity()).registerReceiver(commonLibraryBroadcastReceiver, intentFilter);

        for (CacheManager.Event event : CacheManager.loadEvents(cordova.getActivity())) {
            sendCallbackEvent(event.type, callbackContext, event.object);
        }
    }

    private void saveUser(JSONArray args, final CallbackContext callbackContext) throws JSONException {
        try {
            final User user = UserJson.resolveUser(args.getJSONObject(0));
            runInBackground(new Runnable() {
                @Override
                public void run() {
                    mobileMessaging().saveUser(user, userResultListener(callbackContext));
                }
            });
        } catch (IllegalArgumentException exception) {
            sendCallbackError(callbackContext, exception.getMessage());
        }
    }

    private void fetchUser(final CallbackContext callbackContext) {
        runInBackground(new Runnable() {
            @Override
            public void run() {
                mobileMessaging().fetchUser(userResultListener(callbackContext));
            }
        });
    }

    @NonNull
    private MobileMessaging.ResultListener<User> userResultListener(final CallbackContext callbackContext) {
        return new MobileMessaging.ResultListener<User>() {
            @Override
            public void onResult(Result<User, MobileMessagingError> result) {
                if (result.isSuccess()) {
                    JSONObject json = UserJson.toJSON(result.getData());
                    sendCallbackSuccess(callbackContext, json);
                } else {
                    sendCallbackError(callbackContext, result.getError().getMessage());
                }
            }
        };
    }

    private void getUser(final CallbackContext callbackContext) {
        User user = mobileMessaging().getUser();
        JSONObject userJson = UserJson.toJSON(user);
        sendCallbackWithResult(callbackContext, new PluginResult(PluginResult.Status.OK, userJson));
    }

    private void saveInstallation(JSONArray args, final CallbackContext callbackContext) throws JSONException {
        final Installation installation = InstallationJson.resolveInstallation(args.getJSONObject(0));
        runInBackground(new Runnable() {
            @Override
            public void run() {
                mobileMessaging()
                        .saveInstallation(installation, installationResultListener(callbackContext));
            }
        });
    }

    private void fetchInstallation(final CallbackContext callbackContext) {
        runInBackground(new Runnable() {
            @Override
            public void run() {
                mobileMessaging().fetchInstallation(installationResultListener(callbackContext));
            }
        });
    }

    @NonNull
    private MobileMessaging.ResultListener<Installation> installationResultListener(final CallbackContext callbackContext) {
        return new MobileMessaging.ResultListener<Installation>() {
            @Override
            public void onResult(Result<Installation, MobileMessagingError> result) {
                if (result.isSuccess()) {
                    JSONObject json = InstallationJson.toJSON(result.getData());
                    sendCallbackSuccess(callbackContext, json);
                } else {
                    sendCallbackError(callbackContext, result.getError().getMessage());
                }
            }
        };
    }

    private void getInstallation(final CallbackContext callbackContext) {
        Installation installation = mobileMessaging().getInstallation();
        JSONObject installationJson = InstallationJson.toJSON(installation);
        sendCallbackWithResult(callbackContext, new PluginResult(PluginResult.Status.OK, installationJson));
    }

    private void personalize(JSONArray args, final CallbackContext callbackContext) throws JSONException {
        try {
            final PersonalizationCtx ctx = PersonalizationCtx.resolvePersonalizationCtx(args.getJSONObject(0));
            runInBackground(new Runnable() {
                @Override
                public void run() {
                    mobileMessaging().personalize(ctx.userIdentity, ctx.userAttributes, ctx.forceDepersonalize, new MobileMessaging.ResultListener<User>() {
                        @Override
                        public void onResult(Result<User, MobileMessagingError> result) {
                            if (result.isSuccess()) {
                                JSONObject json = UserJson.toJSON(result.getData());
                                sendCallbackSuccess(callbackContext, json);
                            } else {
                                sendCallbackError(callbackContext, result.getError().getMessage());
                            }
                        }
                    });
                }
            });
        } catch (IllegalArgumentException exception) {
            sendCallbackError(callbackContext, exception.getMessage());
        }
    }

    private void depersonalize(final CallbackContext callbackContext) {
        runInBackground(new Runnable() {
            @Override
            public void run() {
                mobileMessaging().depersonalize(new MobileMessaging.ResultListener<SuccessPending>() {
                    @Override
                    public void onResult(Result<SuccessPending, MobileMessagingError> result) {
                        if (result.isSuccess()) {
                            sendCallbackSuccess(callbackContext, depersonalizeStates.get(result.getData()));
                        } else {
                            sendCallbackError(callbackContext, result.getError().getMessage());
                        }
                    }
                });
            }
        });
    }

    private void depersonalizeInstallation(JSONArray args, final CallbackContext callbackContext) {
        String pushRegId = null;
        try {
            pushRegId = resolveStringParameter(args);
        } catch (Exception e) {
            sendCallbackError(callbackContext, "Empty data!!");
            return;
        }

        final String regId = pushRegId;
        runInBackground(new Runnable() {
            @Override
            public void run() {
                mobileMessaging().depersonalizeInstallation(regId, installationsResultListener(callbackContext));
            }
        });
    }

    private void setInstallationAsPrimary(JSONArray args, final CallbackContext callbackContext) {
        String pushRegId = null;
        Boolean isPrimary = null;
        try {
            pushRegId = resolveStringParameter(args);
            isPrimary = resolveBooleanParameterWithIndex(args, 1);
        } catch (Exception e) {
            sendCallbackError(callbackContext, "Empty data!!");
            return;
        }

        final String regId = pushRegId;
        final Boolean isPrimaryDevice = isPrimary;
        runInBackground(new Runnable() {
            @Override
            public void run() {
                mobileMessaging().setInstallationAsPrimary(regId, isPrimaryDevice, installationsResultListener(callbackContext));
            }
        });
    }

    @NonNull
    private MobileMessaging.ResultListener<List<Installation>> installationsResultListener(final CallbackContext callbackContext) {
        return new MobileMessaging.ResultListener<List<Installation>>() {
            @Override
            public void onResult(Result<List<Installation>, MobileMessagingError> result) {
                if (result.isSuccess()) {
                    JSONArray json = InstallationJson.toJSON(result.getData());
                    sendCallbackSuccess(callbackContext, json);
                } else {
                    sendCallbackError(callbackContext, result.getError().getMessage());
                }
            }
        };
    }

    private void markMessagesSeen(final JSONArray args, final CallbackContext callbackContext) throws JSONException {
        final String messageIds[] = resolveStringArray(args);
        runInBackground(new Runnable() {
            @Override
            public void run() {
                mobileMessaging().setMessagesSeen(messageIds);
                sendCallbackSuccess(callbackContext, args);
            }
        });
    }

    private void showDialogForError(final JSONArray args, final CallbackContext callbackContext) throws JSONException {
        final int errorCode = resolveIntParameter(args);
        ApiAvailability apiAvailability = new ApiAvailability();
        if (!apiAvailability.isUserResolvableError(errorCode)) {
            sendCallbackError(callbackContext, "Error code [" + errorCode + "] is not user resolvable");
            return;
        }

        showErrorDialogContext.args = args;
        showErrorDialogContext.callbackContext = callbackContext;

        cordova.setActivityResultCallback(MobileMessagingCordova.this);

        apiAvailability
                .getErrorDialog(
                        cordova.getActivity(),
                        errorCode,
                        REQ_CODE_RESOLVE_GOOGLE_ERROR,
                        new DialogInterface.OnCancelListener() {
                            @Override
                            public void onCancel(DialogInterface dialog) {
                                showErrorDialogContext.reset();
                                sendCallbackError(callbackContext, "Error dialog was cancelled by user");
                            }
                        })
                .show();
    }


    private void showInAppChat(final JSONArray args, final CallbackContext callbackContext) throws JSONException {
        InAppChat.getInstance(cordova.getActivity().getApplication()).inAppChatScreen().show();
    }

    private void getMessageCounter(final JSONArray args, final CallbackContext callbackContext) throws JSONException {
        sendCallbackWithResult(callbackContext, new PluginResult(PluginResult.Status.OK, InAppChat.getInstance(cordova.getActivity().getApplication()).getMessageCounter()));
    }

    private void resetMessageCounter(final JSONArray args, final CallbackContext callbackContext) throws JSONException {
        InAppChat.getInstance(cordova.getActivity().getApplication()).resetMessageCounter();
    }

    private void setLanguage(final JSONArray args, final CallbackContext callbackContext) throws JSONException {
        String language = null;
        try {
            language = resolveStringParameter(args);
        } catch (Exception e) {
            sendCallbackError(callbackContext, "Could not retrieve locale string from arguments");
            return;
        }
        InAppChat.getInstance(cordova.getActivity().getApplication()).setLanguage(language);
    }

    private void sendContextualData(final JSONArray args, final CallbackContext callbackContext) throws JSONException {
        String data = null;
        boolean allMultiThreadStrategy = false;
        try {
            data = resolveStringParameter(args);
            allMultiThreadStrategy = resolveBooleanParameterWithIndex(args, 1);
        } catch (Exception e) {
            sendCallbackError(callbackContext, "Could not retrieve contextual data or multi-thread strategy flag from arguments");
            return;
        }

        InAppChat.getInstance(cordova.getActivity().getApplication()).sendContextualData(data, allMultiThreadStrategy);
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
                sendCallbackSuccess(callbackContext, MessageJson.toJSON(m));
                return;
            }
        }
        sendCallbackSuccessEmpty(callbackContext);
    }

    private synchronized void defaultMessageStorage_findAll(CallbackContext callbackContext) {
        Context context = cordova.getActivity();
        MessageStore messageStore = MobileMessaging.getInstance(context).getMessageStore();
        if (messageStore == null) {
            sendCallbackSuccess(callbackContext, new JSONArray());
            return;
        }
        List<Message> messages = messageStore.findAll(context);
        sendCallbackSuccess(callbackContext, MessageJson.toJSONArray(messages.toArray(new Message[messages.size()])));
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

    private synchronized void defaultMessageStorage_deleteAll(CallbackContext callbackContext) {
        Context context = cordova.getActivity();
        MessageStore messageStore = MobileMessaging.getInstance(context).getMessageStore();
        if (messageStore == null) {
            sendCallbackSuccess(callbackContext);
            return;
        }
        messageStore.deleteAll(context);
        sendCallbackSuccess(callbackContext);
    }

    private void submitEventImmediately(JSONArray args, final CallbackContext callbackContext) throws JSONException {
        final CustomEvent customEvent = resolveCustomEvent(args);
        runInBackground(new Runnable() {
            @Override
            public void run() {
                mobileMessaging().submitEvent(customEvent, new MobileMessaging.ResultListener<CustomEvent>() {
                    @Override
                    public void onResult(Result<CustomEvent, MobileMessagingError> result) {
                        if (result.isSuccess()) {
                            sendCallbackSuccess(callbackContext);
                        } else if (result.getError() != null) {
                            sendCallbackError(callbackContext, result.getError().getMessage());
                        }
                    }
                });
            }
        });
    }

    private void submitEvent(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final CustomEvent customEvent = resolveCustomEvent(args);
        runInBackground(new Runnable() {
            @Override
            public void run() {
                mobileMessaging().submitEvent(customEvent);
            }
        });
    }

    @NonNull
    private static CustomEvent resolveCustomEvent(JSONArray args) throws JSONException {
        if (args.length() < 1 || args.getJSONObject(0) == null) {
            throw new IllegalArgumentException("Cannot resolve custom event from arguments");
        }

        return CustomEventJson.fromJSON(args.getJSONObject(0));
    }

    public void registerForAndroidRemoteNotifications(final JSONArray args, final CallbackContext callbackContext) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerForAndroidPermissionContext = callbackContext;
            cordova.requestPermission(this, REQ_CODE_POST_NOTIFICATIONS, Manifest.permission.POST_NOTIFICATIONS);
        }
    }

    /**
     * Custom Event data mapper for JSON conversion
     */
    private static class CustomEventJson extends CustomEvent {

        static CustomEvent fromJSON(JSONObject json) {
            CustomEvent customEvent = new CustomEvent();

            try {
                if (json.has(UserCustomEventAtts.definitionId)) {
                    customEvent.setDefinitionId(json.optString(UserCustomEventAtts.definitionId));
                }
            } catch (Exception e) {
                Log.w(TAG, "Error when serializing CustomEvent object:" + Log.getStackTraceString(e));
            }

            try {
                if (json.has(UserCustomEventAtts.properties)) {
                    Type type = new TypeToken<Map<String, Object>>() {
                    }.getType();
                    Map<String, Object> properties = new JsonSerializer().deserialize(json.optString(UserCustomEventAtts.properties), type);
                    customEvent.setProperties(CustomAttributesMapper.customAttsFromBackend(properties));
                }
            } catch (Exception e) {
                Log.w(TAG, "Error when serializing CustomEvent object:" + Log.getStackTraceString(e));
            }

            return customEvent;
        }
    }

    @NonNull
    private static Configuration resolveConfiguration(JSONArray args) throws JSONException {
        if (args.length() < 1 || args.getJSONObject(0) == null) {
            throw new IllegalArgumentException("Cannot resolve configuration from arguments");
        }

        Configuration config = new JsonSerializer().deserialize(args.getJSONObject(0).toString(), Configuration.class);
        if (config == null || config.applicationCode == null) {
            throw new IllegalArgumentException("Configuration is invalid");
        }

        return config;
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

    private void setInboxMessagesSeen(JSONArray args, final CallbackContext callbackContext) {
        try {
            String externalUserId = args.getString(0);
            String[] messageIds = resolveStringArray(args.getJSONArray(1));
            if (externalUserId == null || messageIds == null) {
                sendCallbackError(callbackContext, "Failed setting inbox messages as seen, invalid arguments");
                return;
            } else {
                runInBackground(new Runnable() {
                    @Override
                    public void run() {
                        MobileInbox.getInstance(cordova.getActivity().getApplication()).setSeen(externalUserId, messageIds, setSeenResultListener(callbackContext));
                    }
                });
            }
        } catch (Exception e) {
            sendCallbackError(callbackContext, "Failed setting inbox messages as seen " + e.getMessage());
        }
    }

    private static MobileMessaging.ResultListener<String[]> setSeenResultListener(CallbackContext callbackContext) {
        return new MobileMessaging.ResultListener<String[]>() {
            @Override
            public void onResult(Result<String[], MobileMessagingError> result) {
                if (result.isSuccess()) {
                    try {
                        sendCallbackSuccess(callbackContext, new JSONArray(result.getData()));
                    } catch (JSONException e) {
                        sendCallbackError(callbackContext, e.getMessage());
                    }
                } else {
                    sendCallbackError(callbackContext, result.getError().getMessage());
                }
            }
        };
    }

    private void fetchInboxMessages(JSONArray args, final CallbackContext callbackContext) {
        if (args.length() < 3) {
            sendCallbackError(callbackContext, "Failed fetching inbox messages, invalid number of arguments");
            return;
        }
        try {
            String token = args.getString(0);
            String externalUserId = args.getString(1);
            MobileInboxFilterOptions filterOptions = MobileInboxFilterOptionsJson.mobileInboxFilterOptionsFromJSON(args.getJSONObject(2));
            if (externalUserId == null || token == null) {
                sendCallbackError(callbackContext, "Failed fetching inbox messages, invalid arguments");
                return;
            } else {
                runInBackground(new Runnable() {
                    @Override
                    public void run() {
                        MobileInbox.getInstance(cordova.getActivity().getApplication()).fetchInbox(token, externalUserId, filterOptions, inboxResultListener(callbackContext));
                    }
                });
            }
        } catch (Exception e) {
            sendCallbackError(callbackContext, e.getMessage());
        }
    }

    private void fetchInboxMessagesWithoutToken(JSONArray args, final CallbackContext callbackContext) {
        if (args.length() < 2) {
            sendCallbackError(callbackContext, "Failed fetching inbox messages, invalid number of arguments");
            return;
        }
        try {
            String externalUserId = args.getString(0);
            MobileInboxFilterOptions filterOptions = MobileInboxFilterOptionsJson.mobileInboxFilterOptionsFromJSON(args.getJSONObject(1));
            if (externalUserId == null) {
                sendCallbackError(callbackContext, "Failed fetching inbox messages, invalid arguments");
                return;
            } else {
                runInBackground(new Runnable() {
                    @Override
                    public void run() {
                        MobileInbox.getInstance(cordova.getActivity().getApplication()).fetchInbox(externalUserId, filterOptions, inboxResultListener(callbackContext));
                    }
                });
            }
        } catch (Exception e) {
            sendCallbackError(callbackContext, e.getMessage());
        }
    }

    @NonNull
    private MobileMessaging.ResultListener<Inbox> inboxResultListener(final CallbackContext callbackContext) {
        return new MobileMessaging.ResultListener<Inbox>() {
            @Override
            public void onResult(Result<Inbox, MobileMessagingError> result) {
                if (result.isSuccess()) {
                    JSONObject json = InboxMapper.toJSON(result.getData());
                    sendCallbackSuccess(callbackContext, json);
                } else {
                    sendCallbackError(callbackContext, result.getError().getMessage());
                }
            }
        };
    }

    @NonNull
    private String resolveStringParameter(JSONArray args) throws JSONException {
        if (args.length() < 1 || args.getString(0) == null) {
            throw new IllegalArgumentException("Cannot resolve string parameter from arguments");
        }

        return args.getString(0);
    }

    private int resolveIntParameter(JSONArray args) throws JSONException {
        if (args.length() < 1) {
            throw new IllegalArgumentException("Cannot resolve string parameter from arguments");
        }

        return args.getInt(0);
    }

    private boolean resolveBooleanParameter(JSONArray args) throws JSONException {
        return resolveBooleanParameterWithIndex(args, 0);
    }

    private boolean resolveBooleanParameterWithIndex(JSONArray args, int index) throws JSONException {
        if (args.length() < 1) {
            throw new IllegalArgumentException("Cannot resolve boolean parameter from arguments");
        }

        return args.getBoolean(index);
    }

    @SuppressWarnings("UnusedReturnValue")
    private static boolean sendCallbackEvent(String event, CallbackContext callback, Object object1, Object... objects) {
        if (event == null || object1 == null) {
            return false;
        }

        JSONArray parameters = new JSONArray();
        parameters.put(event);
        parameters.put(object1);
        for (Object o : objects) {
            parameters.put(o);
        }

        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, parameters);
        pluginResult.setKeepCallback(true);
        callback.sendPluginResult(pluginResult);
        return true;
    }

    @SuppressWarnings("UnusedReturnValue")
    private static boolean sendCallbackEvent(String event, CallbackContext callback) {
        if (event == null) {
            return false;
        }

        JSONArray parameters = new JSONArray();
        parameters.put(event);
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, parameters);
        pluginResult.setKeepCallback(true);
        callback.sendPluginResult(pluginResult);
        return true;
    }

    private static void sendCallbackError(CallbackContext callback, String message) {
        sendCallbackError(callback, message, null);
    }

    private static void sendCallbackError(CallbackContext callback, String message, @Nullable Integer errorCode) {
        JSONObject json = new JSONObject();
        try {
            json.put("description", message);
            json.put("code", errorCode);
        } catch (JSONException e) {
            Log.w(TAG, "Error when serializing error object:" + Log.getStackTraceString(e));
        }
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.ERROR, json));
    }

    private static void sendCallbackSuccessKeepCallback(CallbackContext callback) {
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.OK), true);
    }

    private static void sendCallbackSuccess(CallbackContext callback) {
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.OK));
    }

    private static void sendCallbackSuccess(CallbackContext callback, boolean booleanParameter) {
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.OK, booleanParameter));
    }

    private static void sendCallbackSuccess(CallbackContext callback, String stringParameter) {
        sendCallbackWithResult(callback, new PluginResult(PluginResult.Status.OK, stringParameter));
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

    private static void sendCallbackWithResult(CallbackContext context, PluginResult result, boolean... keepCallback) {
        result.setKeepCallback(keepCallback != null && keepCallback.length > 0 && keepCallback[0]);
        context.sendPluginResult(result);
    }

    private static void runInBackground(final Runnable runnable) {
        new AsyncTask<Void, Void, Void>() {

            @Override
            protected Void doInBackground(Void... params) {
                runnable.run();
                return null;
            }
        }.execute();
    }

    private MobileMessaging mobileMessaging() {
        return MobileMessaging.getInstance(cordova.getActivity().getApplicationContext());
    }

    /**
     * Converts notification categories in configuration into library format
     *
     * @param categories notification categories from cordova
     * @return library-understandable categories
     */
    @NonNull
    private NotificationCategory[] notificationCategoriesFromConfiguration(@NonNull List<Configuration.Category> categories) {
        NotificationCategory notificationCategories[] = new NotificationCategory[categories.size()];
        for (int i = 0; i < notificationCategories.length; i++) {
            Configuration.Category category = categories.get(i);
            notificationCategories[i] = new NotificationCategory(
                    category.identifier,
                    notificationActionsFromConfiguration(category.actions)
            );
        }
        return notificationCategories;
    }

    /**
     * Converts notification actions in configuration into library format
     *
     * @param actions notification actions from cordova
     * @return library-understandable actions
     */
    @NonNull
    private NotificationAction[] notificationActionsFromConfiguration(@NonNull List<Configuration.Action> actions) {
        NotificationAction notificationActions[] = new NotificationAction[actions.size()];
        for (int i = 0; i < notificationActions.length; i++) {
            Configuration.Action action = actions.get(i);
            notificationActions[i] = new NotificationAction.Builder()
                    .withId(action.identifier)
                    .withIcon(cordova.getActivity().getApplication(), action.icon)
                    .withTitleText(action.title)
                    .withBringingAppToForeground(action.foreground)
                    .withInput(action.textInputPlaceholder)
                    .withMoMessage(action.moRequired)
                    .build();
        }
        return notificationActions;
    }

    static class CacheManager {
        private static final String MESSAGES_KEY = TAG + ".cache.messages";
        private static final String EVENTS_KEY = TAG + ".cache.events";
        private static final Object cacheLock = new Object();
        private static final JsonSerializer serializer = new JsonSerializer(false, new JSONObjectAdapter(), new JSONArrayAdapter());

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

        private static void saveMessages(Context context, Message... messages) {
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

        @SuppressWarnings("UnusedReturnValue")
        private static Set<String> saveStringsToSet(Context context, String key, String... strings) {
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
        public void save(Context context, Message... messages) {
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

        @SuppressWarnings("UnusedReturnValue")
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
                        return MessageJson.resolveMessages(findAllResults.get(0));
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
            sendCallback(callback, new PluginResult(PluginResult.Status.OK, MessageJson.toJSONArray(messages)));
            return true;
        }

        static void sendCallback(CallbackContext callbackContext, PluginResult pluginResult) {
            pluginResult.setKeepCallback(true);
            callbackContext.sendPluginResult(pluginResult);
        }
    }
}
