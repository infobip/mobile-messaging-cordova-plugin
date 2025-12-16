//
//  CordovaLogger.java
//  MobileMessagingCordova
//
// Copyright (c) 2016-2025 Infobip Limited
// Licensed under the Apache License, Version 2.0
//

package org.apache.cordova.plugin;

import android.util.Log;

import org.infobip.mobile.messaging.logging.Level;

import androidx.annotation.Nullable;

/**
 * Centralized logging utility for Cordova plugin code.
 * Routes logs to Cordova JS console via CordovaLogWriter when enabled.
 */
public class CordovaLogger {

    @Nullable
    private static volatile CordovaLogWriter writer;

    private CordovaLogger() {
    }

    /**
     * Enable Cordova console logging with the provided writer.
     * Call this after SDK initialization with logging enabled.
     */
    public static void useCordovaConsole(CordovaLogWriter writer) {
        CordovaLogger.writer = writer;
    }

    /**
     * Disable Cordova JS console logging, revert to native Logcat.
     */
    public static void useNativeLogcat() {
        CordovaLogger.writer = null;
    }

    /**
     * Log a VERBOSE message.
     */
    public static void v(String tag, String message) {
        v(tag, message, null);
    }

    /**
     * Log a VERBOSE message with throwable.
     */
    public static void v(String tag, String message, @Nullable Throwable throwable) {
        if (writer != null) {
            writer.write(Level.VERBOSE, tag, message, throwable);
        } else {
            Log.v(tag, message, throwable);
        }
    }

    /**
     * Log a DEBUG message.
     */
    public static void d(String tag, String message) {
        d(tag, message, null);
    }

    /**
     * Log a DEBUG message with throwable.
     */
    public static void d(String tag, String message, @Nullable Throwable throwable) {
        if (writer != null) {
            writer.write(Level.DEBUG, tag, message, throwable);
        } else {
            Log.d(tag, message, throwable);
        }
    }

    /**
     * Log an INFO message.
     */
    public static void i(String tag, String message) {
        i(tag, message, null);
    }

    /**
     * Log an INFO message with throwable.
     */
    public static void i(String tag, String message, @Nullable Throwable throwable) {
        if (writer != null) {
            writer.write(Level.INFO, tag, message, throwable);
        } else {
            Log.i(tag, message, throwable);
        }
    }

    /**
     * Log a WARN message.
     */
    public static void w(String tag, String message) {
        w(tag, message, null);
    }

    /**
     * Log a WARN message with throwable.
     */
    public static void w(String tag, String message, @Nullable Throwable throwable) {
        if (writer != null) {
            writer.write(Level.WARN, tag, message, throwable);
        } else {
            Log.w(tag, message, throwable);
        }
    }

    /**
     * Log an ERROR message.
     */
    public static void e(String tag, String message) {
        e(tag, message, null);
    }

    /**
     * Log an ERROR message with throwable.
     */
    public static void e(String tag, String message, @Nullable Throwable throwable) {
        if (writer != null) {
            writer.write(Level.ERROR, tag, message, throwable);
        } else {
            Log.e(tag, message, throwable);
        }
    }
}
