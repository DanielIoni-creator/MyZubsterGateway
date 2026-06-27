package com.myzubster

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.appbar.MaterialToolbar
import com.myzubster.activities.PaymentActivity
import com.myzubster.receivers.NotificationReceiver
import com.myzubster.services.MyFirebaseMessagingService
import com.myzubster.ui.chat.ChatActivity
import com.myzubster.ui.settings.SettingsActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        findViewById<MaterialToolbar>(R.id.mainToolbar).title = getString(R.string.app_name)
        findViewById<Button>(R.id.openSettingsButton).setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        handleNotificationIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleNotificationIntent(intent)
    }

    private fun handleNotificationIntent(intent: Intent?) {
        if (intent == null) return
        val type = intent.getStringExtra(NotificationReceiver.EXTRA_NOTIFICATION_TYPE)
            ?: intent.getStringExtra("type")

        when (type) {
            MyFirebaseMessagingService.TYPE_MESSAGE_RECEIVED -> openChatFromNotification(intent)
            MyFirebaseMessagingService.TYPE_PAYMENT_CONFIRMED -> openPaymentFromNotification(intent)
            else -> findViewById<TextView>(R.id.mainStatusText).text = "MyZubster pronto"
        }
    }

    private fun openChatFromNotification(intent: Intent) {
        val senderId = intent.getStringExtra(NotificationReceiver.EXTRA_SENDER_ID)
            ?: intent.getStringExtra(ChatActivity.EXTRA_CONTACT_USER_ID)
            ?: "seller-demo"
        val chatId = intent.getStringExtra(NotificationReceiver.EXTRA_CHAT_ID)
        val chatIntent = Intent(this, ChatActivity::class.java).apply {
            putExtra(ChatActivity.EXTRA_CONTACT_USER_ID, senderId)
            chatId?.let { putExtra(ChatActivity.EXTRA_CHAT_ID, it) }
        }
        startActivity(chatIntent)
    }

    private fun openPaymentFromNotification(intent: Intent) {
        val paymentId = intent.getStringExtra(NotificationReceiver.EXTRA_PAYMENT_ID)
            ?: intent.getStringExtra(PaymentActivity.EXTRA_PAYMENT_ID)
        val paymentIntent = Intent(this, PaymentActivity::class.java).apply {
            paymentId?.let { putExtra(PaymentActivity.EXTRA_PAYMENT_ID, it) }
        }
        startActivity(paymentIntent)
    }
}
