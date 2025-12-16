//
//  CordovaLogWriter.java
//  MobileMessagingCordova
//
// Copyright (c) 2016-2025 Infobip Limited
// Licensed under the Apache License, Version 2.0
//


package org.apache.cordova.plugin;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.infobip.mobile.messaging.logging.Level;
import org.infobip.mobile.messaging.logging.LogcatWriter;
import org.infobip.mobile.messaging.logging.Writer;
import org.json.JSONObject;

import static org.apache.cordova.plugin.MobileMessagingCordova.EVENT_KEY_ID;
import static org.apache.cordova.plugin.MobileMessagingCordova.EVENT_PLATFORM_NATIVE_LOGS_SENT;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;

import androidx.annotation.Nullable;

/**
 * Custom log writer that proxies Android native SDK logs to Cordova JS console
 * Implements the Writer interface from MobileMessagingLogger
 */
public class CordovaLogWriter implements Writer {

    private static final String TAG = "CordovaLogWriter";
    private static final SimpleDateFormat dateFormat = new SimpleDateFormat("HH:mm:ss.SSS", Locale.US);

    private final CallbackContext callbackContext;
    private final Handler mainHandler;
    private final LogcatWriter logcatWriter;

    public CordovaLogWriter(CallbackContext callbackContext) {
        this.callbackContext = callbackContext;
        this.mainHandler = new Handler(Looper.getMainLooper());
        this.logcatWriter = new LogcatWriter();
    }

    /**
     * Called by MobileMessagingLogger for each log entry
     * Converts log level to prefix and emits event to Cordova
     *
     * @param level     Log level (VERBOSE, DEBUG, INFO, WARN, ERROR)
     * @param tag       Log tag (usually SDK component name)
     * @param message   Log message
     * @param throwable Optional exception/throwable
     */
    @Override
    public void write(
            Level level,
            String tag,
            String message,
            @Nullable Throwable throwable
    ) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            sendToCordova(level, tag, message, throwable);
        }
        else {
            mainHandler.post(new Runnable() {
                @Override
                public void run() {
                    sendToCordova(level, tag, message, throwable);
                }
            });
        }

    }

    /**
     * Send log message to Cordova JS console via CallbackContext.
     * Must be called on main thread.
     */
    private void sendToCordova(
            @Nullable final Level level,
            @Nullable final String tag,
            @Nullable final String message,
            @Nullable final Throwable throwable
    ) {
        try {
            if (message == null || message.trim().isEmpty())
                return;

            String timestamp = dateFormat.format(new Date());
            String fullMessage;
            if (throwable != null) {
                fullMessage = message + "\n" + Log.getStackTraceString(throwable);
            }
            else {
                fullMessage = message;
            }
            String tagLog = (tag == null || tag.trim().isEmpty()) ? "" : " [" + tag + "]";
            final String logcatStyleMessage = timestamp + tagLog + ": " + fullMessage;

            JSONObject payload = new JSONObject();
            payload.putOpt(EVENT_KEY_ID, EVENT_PLATFORM_NATIVE_LOGS_SENT);
            payload.put("message", logcatStyleMessage);

            PluginResult requestResult = new PluginResult(PluginResult.Status.OK, payload);
            requestResult.setKeepCallback(true);
            callbackContext.sendPluginResult(requestResult);
        } catch (Exception e) {
            // Fallback to Logcat if message cannot be logged by Cordova JS console
            logcatWriter.write(level, tag, message, throwable);
        }
    }
}
