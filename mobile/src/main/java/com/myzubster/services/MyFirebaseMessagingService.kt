package com.myzubster.services

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.myzubster.receivers.NotificationReceiver
import com.myzubster.utils.FirebaseTokenManager

class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        FirebaseTokenManager.saveToken(this, token)
        android.util.Log.d(TAG, "Nuovo token FCM salvato")
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        if (!FirebaseTokenManager.areNotificationsEnabled(this)) return

        val type = message.data["type"] ?: "generic"
        val title = message.notification?.title
            ?: message.data["title"]
            ?: when (type) {
                TYPE_PAYMENT_CONFIRMED -> "Pagamento confermato"
                TYPE_MESSAGE_RECEIVED -> "Nuovo messaggio"
                else -> "MyZubster"
            }
        val body = message.notification?.body
            ?: message.data["body"]
            ?: "Hai una nuova notifica"

        showNotification(title, body, message.data)
    }

    private fun showNotification(title: String, body: String, data: Map<String, String>) {
        createNotificationChannel()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            android.util.Log.w(TAG, "Permesso POST_NOTIFICATIONS non concesso; notifica non mostrata")
            return
        }

        val stableKey = data["paymentId"] ?: data["messageId"] ?: data["chatId"] ?: System.currentTimeMillis().toString()
        val tapIntent = Intent(this, NotificationReceiver::class.java).apply {
            action = NotificationReceiver.ACTION_NOTIFICATION_TAP
            putExtra(NotificationReceiver.EXTRA_NOTIFICATION_TYPE, data["type"] ?: "generic")
            data["paymentId"]?.let { putExtra(NotificationReceiver.EXTRA_PAYMENT_ID, it) }
            data["chatId"]?.let { putExtra(NotificationReceiver.EXTRA_CHAT_ID, it) }
            data["senderId"]?.let { putExtra(NotificationReceiver.EXTRA_SENDER_ID, it) }
        }
        val pendingIntent = PendingIntent.getBroadcast(
            this,
            stableKey.hashCode(),
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        NotificationManagerCompat.from(this).notify(stableKey.hashCode(), notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Notifiche MyZubster",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Notifiche per pagamenti Monero, messaggi e aggiornamenti MyZubster"
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    companion object {
        private const val TAG = "MyFirebaseMessagingService"
        const val CHANNEL_ID = "myzubster_notifications"
        const val TYPE_PAYMENT_CONFIRMED = "payment_confirmed"
        const val TYPE_MESSAGE_RECEIVED = "message_received"
    }
}
