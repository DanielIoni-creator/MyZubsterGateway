package com.myzubster.utils

import android.content.Context
import com.google.firebase.messaging.FirebaseMessaging
import kotlin.coroutines.resume

object FirebaseTokenManager {
    private const val PREFS_NAME = "myzubster_firebase"
    private const val KEY_FCM_TOKEN = "fcm_token"
    private const val KEY_NOTIFICATIONS_ENABLED = "notifications_enabled"
    private const val KEY_USER_ID = "user_id"
    private const val DEFAULT_USER_ID = "demo-user"

    fun saveToken(context: Context, token: String) {
        context.applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_FCM_TOKEN, token)
            .apply()
    }

    fun getToken(context: Context): String? = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(KEY_FCM_TOKEN, null)

    suspend fun refreshToken(context: Context): String? = kotlinx.coroutines.suspendCancellableCoroutine { continuation ->
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token ->
                saveToken(context, token)
                continuation.resume(token)
            }
            .addOnFailureListener {
                continuation.resume(null)
            }
    }

    fun clearToken(context: Context) {
        context.applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_FCM_TOKEN)
            .apply()
    }

    fun setNotificationsEnabled(context: Context, enabled: Boolean) {
        context.applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_NOTIFICATIONS_ENABLED, enabled)
            .apply()
    }

    fun areNotificationsEnabled(context: Context): Boolean = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getBoolean(KEY_NOTIFICATIONS_ENABLED, true)

    fun setCurrentUserId(context: Context, userId: String) {
        context.applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_USER_ID, userId)
            .apply()
    }

    fun getCurrentUserId(context: Context): String = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(KEY_USER_ID, DEFAULT_USER_ID)
        .orEmpty()
        .ifBlank { DEFAULT_USER_ID }
}
