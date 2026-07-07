package com.myzubster.utils

import android.content.Context
import android.os.Handler
import android.os.Looper

class SessionManager(private val context: Context) {

    private val tokenManager = TokenManager(context)
    private var handler: Handler? = null
    private var isMonitoring = false

    companion object {
        private const val SESSION_CHECK_INTERVAL = 30000L
    }

    fun startSessionMonitoring(onSessionExpired: () -> Unit) {
        if (isMonitoring) return
        isMonitoring = true
        
        handler = Handler(Looper.getMainLooper())
        handler?.post(object : Runnable {
            override fun run() {
                if (!isMonitoring) return
                
                if (!tokenManager.isSessionValid()) {
                    onSessionExpired()
                    return
                }
                
                handler?.postDelayed(this, SESSION_CHECK_INTERVAL)
            }
        })
    }

    fun stopSessionMonitoring() {
        isMonitoring = false
        handler?.removeCallbacksAndMessages(null)
        handler = null
    }

    fun extendSession(newToken: String, expiresIn: Long = 3600) {
        tokenManager.updateToken(newToken, expiresIn)
    }

    fun getRemainingTime(): String {
        return tokenManager.getFormattedSessionTime()
    }

    fun isSessionValid(): Boolean {
        return tokenManager.isSessionValid()
    }

    fun logout() {
        tokenManager.clear()
        stopSessionMonitoring()
    }

    fun getSessionCountdown(callback: (String) -> Unit) {
        Thread {
            while (isSessionValid()) {
                val remaining = tokenManager.getSessionRemainingTime()
                val formatted = if (remaining > 0) {
                    val hours = remaining / 3600
                    val minutes = (remaining % 3600) / 60
                    val seconds = remaining % 60
                    when {
                        hours > 0 -> "${hours}h ${minutes}m"
                        minutes > 0 -> "${minutes}m ${seconds}s"
                        else -> "${seconds}s"
                    }
                } else {
                    "Scaduta"
                }
                
                Handler(Looper.getMainLooper()).post {
                    callback(formatted)
                }
                
                try {
                    Thread.sleep(1000)
                } catch (e: InterruptedException) {
                    break
                }
            }
        }.start()
    }
}