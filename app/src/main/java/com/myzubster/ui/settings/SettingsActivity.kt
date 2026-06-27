package com.myzubster.ui.settings

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.appbar.MaterialToolbar
import com.google.firebase.messaging.FirebaseMessaging
import com.myzubster.R
import com.myzubster.network.NotificationApiService
import com.myzubster.utils.FirebaseTokenManager
import kotlinx.coroutines.launch

class SettingsActivity : AppCompatActivity() {
    private val notificationApiService: NotificationApiService by lazy { NotificationApiService() }
    private lateinit var toggleButton: Button
    private lateinit var statusText: TextView

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) enableNotifications() else {
            FirebaseTokenManager.setNotificationsEnabled(this, false)
            renderNotificationState()
            Toast.makeText(this, "Permesso notifiche negato", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        findViewById<MaterialToolbar>(R.id.settingsToolbar).setNavigationOnClickListener { finish() }
        toggleButton = findViewById(R.id.toggleNotificationsButton)
        statusText = findViewById(R.id.notificationSettingsStatusText)

        toggleButton.setOnClickListener { toggleNotifications() }
        renderNotificationState()
    }

    private fun toggleNotifications() {
        if (FirebaseTokenManager.areNotificationsEnabled(this)) disableNotifications() else requestAndEnableNotifications()
    }

    private fun requestAndEnableNotifications() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            return
        }
        enableNotifications()
    }

    private fun enableNotifications() {
        FirebaseTokenManager.setNotificationsEnabled(this, true)
        FirebaseMessaging.getInstance().isAutoInitEnabled = true
        renderNotificationState("Recupero token FCM...")

        lifecycleScope.launch {
            val token = FirebaseTokenManager.refreshToken(this@SettingsActivity)
            if (token.isNullOrBlank()) {
                renderNotificationState("Notifiche abilitate, token non ancora disponibile")
                return@launch
            }

            val userId = FirebaseTokenManager.getCurrentUserId(this@SettingsActivity)
            runCatching { notificationApiService.registerDeviceToken(userId, token) }
                .onSuccess { renderNotificationState("Notifiche abilitate") }
                .onFailure { error -> renderNotificationState("Notifiche abilitate, registrazione backend fallita: ${error.message}") }
        }
    }

    private fun disableNotifications() {
        FirebaseTokenManager.setNotificationsEnabled(this, false)
        FirebaseMessaging.getInstance().isAutoInitEnabled = false
        renderNotificationState("Notifiche disabilitate")
    }

    private fun renderNotificationState(message: String? = null) {
        val enabled = FirebaseTokenManager.areNotificationsEnabled(this)
        toggleButton.text = if (enabled) "Disabilita notifiche" else "Abilita notifiche"
        statusText.text = message ?: if (enabled) "Notifiche abilitate" else "Notifiche disabilitate"
    }
}
