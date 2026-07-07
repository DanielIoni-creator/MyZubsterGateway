package com.myzubster.utils

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("MyZubsterPrefs", Context.MODE_PRIVATE)

    fun saveSession(token: String, userId: String) {
        prefs.edit().apply {
            putString("token", token)
            putString("userId", userId)
            putBoolean("isLoggedIn", true)
            apply()
        }
    }

    fun getToken(): String? = prefs.getString("token", null)
    fun getUserId(): String? = prefs.getString("userId", null)
    fun isLoggedIn(): Boolean = prefs.getBoolean("isLoggedIn", false)

    fun clearSession() {
        prefs.edit().clear().apply()
    }
}