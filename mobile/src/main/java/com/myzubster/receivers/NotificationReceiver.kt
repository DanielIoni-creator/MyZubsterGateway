package com.myzubster.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.myzubster.MainActivity

class NotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtras(intent)
            action = ACTION_NOTIFICATION_TAP
        }
        context.startActivity(launchIntent)
    }

    companion object {
        const val ACTION_NOTIFICATION_TAP = "com.myzubster.ACTION_NOTIFICATION_TAP"
        const val EXTRA_NOTIFICATION_TYPE = "notification_type"
        const val EXTRA_PAYMENT_ID = "paymentId"
        const val EXTRA_CHAT_ID = "chatId"
        const val EXTRA_SENDER_ID = "senderId"
    }
}
