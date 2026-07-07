package com.myzubster.utils

import android.content.Context
import android.content.SharedPreferences

class TokenManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREFS_NAME = "MyZubsterPrefs"
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_ROLE = "user_role"
        private const val KEY_TOKEN_EXPIRY = "token_expiry"
        private const val KEY_LOGIN_TIMESTAMP = "login_timestamp"
        private const val KEY_SESSION_DURATION = "session_duration"
    }

    /**
     * Salva i dati di autenticazione
     */
    fun saveAuthData(
        token: String,
        userId: String,
        email: String,
        name: String,
        role: String = "client",
        refreshToken: String? = null,
        expiresIn: Long = 3600 // 1 ora di default
    ) {
        val expiryTime = System.currentTimeMillis() + (expiresIn * 1000)
        
        prefs.edit().apply {
            putString(KEY_TOKEN, token)
            putString(KEY_USER_ID, userId)
            putString(KEY_USER_EMAIL, email)
            putString(KEY_USER_NAME, name)
            putString(KEY_USER_ROLE, role)
            putLong(KEY_TOKEN_EXPIRY, expiryTime)
            putLong(KEY_LOGIN_TIMESTAMP, System.currentTimeMillis())
            putLong(KEY_SESSION_DURATION, expiresIn)
            if (refreshToken != null) {
                putString(KEY_REFRESH_TOKEN, refreshToken)
            }
            apply()
        }
    }

    /**
     * Ottiene il token JWT
     */
    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    /**
     * Ottiene il refresh token
     */
    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)

    /**
     * Ottiene l'ID dell'utente
     */
    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    /**
     * Ottiene l'email dell'utente
     */
    fun getUserEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)

    /**
     * Ottiene il nome dell'utente
     */
    fun getUserName(): String? = prefs.getString(KEY_USER_NAME, null)

    /**
     * Ottiene il ruolo dell'utente
     */
    fun getUserRole(): String? = prefs.getString(KEY_USER_ROLE, null)

    /**
     * Verifica se il token è scaduto
     */
    fun isTokenExpired(): Boolean {
        val expiry = prefs.getLong(KEY_TOKEN_EXPIRY, 0)
        return System.currentTimeMillis() > expiry
    }

    /**
     * Verifica se l'utente è loggato
     */
    fun isLoggedIn(): Boolean {
        val token = getToken()
        return !token.isNullOrEmpty() && !isTokenExpired()
    }

    /**
     * Ottiene il tempo rimanente della sessione in secondi
     */
    fun getSessionRemainingTime(): Long {
        val expiry = prefs.getLong(KEY_TOKEN_EXPIRY, 0)
        val remaining = (expiry - System.currentTimeMillis()) / 1000
        return if (remaining > 0) remaining else 0
    }

    /**
     * Ottiene la durata della sessione in secondi
     */
    fun getSessionDuration(): Long = prefs.getLong(KEY_SESSION_DURATION, 3600)

    /**
     * Ottiene il timestamp di login
     */
    fun getLoginTimestamp(): Long = prefs.getLong(KEY_LOGIN_TIMESTAMP, 0)

    /**
     * Formatta il tempo rimanente della sessione
     */
    fun getFormattedSessionTime(): String {
        val remaining = getSessionRemainingTime()
        if (remaining <= 0) return "Scaduta"
        
        val hours = remaining / 3600
        val minutes = (remaining % 3600) / 60
        val seconds = remaining % 60
        
        return when {
            hours > 0 -> "${hours}h ${minutes}m"
            minutes > 0 -> "${minutes}m ${seconds}s"
            else -> "${seconds}s"
        }
    }

    /**
     * Aggiorna il token (refresh)
     */
    fun updateToken(newToken: String, expiresIn: Long = 3600) {
        val expiryTime = System.currentTimeMillis() + (expiresIn * 1000)
        prefs.edit().apply {
            putString(KEY_TOKEN, newToken)
            putLong(KEY_TOKEN_EXPIRY, expiryTime)
            apply()
        }
    }

    /**
     * Salva il refresh token
     */
    fun saveRefreshToken(refreshToken: String) {
        prefs.edit().putString(KEY_REFRESH_TOKEN, refreshToken).apply()
    }

    /**
     * Pulisce tutti i dati (logout completo)
     */
    fun clear() {
        prefs.edit().clear().apply()
    }

    /**
     * Logout con pulizia completa
     * Questo metodo rimuove tutti i dati salvati e resetta lo stato
     */
    fun logout() {
        clear()
        // Se hai un database locale, puliscilo qui
        // Esempio: DatabaseHelper.clearAll()
        // Se hai cache, puliscila qui
        // Esempio: CacheManager.clearAll()
    }

    /**
     * Ottiene l'header di autorizzazione per le richieste API
     */
    fun getAuthHeader(): String? {
        val token = getToken()
        return if (!token.isNullOrEmpty() && !isTokenExpired()) {
            "Bearer $token"
        } else {
            null
        }
    }

    /**
     * Verifica se la sessione è valida
     */
    fun isSessionValid(): Boolean {
        return isLoggedIn() && !isTokenExpired()
    }

    /**
     * Ottiene i dati dell'utente come mappa
     */
    fun getUserData(): Map<String, String> {
        return mapOf(
            "id" to (getUserId() ?: ""),
            "name" to (getUserName() ?: ""),
            "email" to (getUserEmail() ?: ""),
            "role" to (getUserRole() ?: "")
        )
    }

    /**
     * Stampa le informazioni della sessione (per debug)
     */
    fun printSessionInfo() {
        println("=== SESSION INFO ===")
        println("Logged in: ${isLoggedIn()}")
        println("Token expired: ${isTokenExpired()}")
        println("Session remaining: ${getFormattedSessionTime()}")
        println("User: ${getUserName()}")
        println("Email: ${getUserEmail()}")
        println("Role: ${getUserRole()}")
        println("====================")
    }
}