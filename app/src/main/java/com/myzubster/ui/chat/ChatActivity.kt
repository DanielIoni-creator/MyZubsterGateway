package com.myzubster.ui.chat

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.myzubster.R
import com.myzubster.ui.dialogs.QuoteDialog

class ChatActivity : AppCompatActivity() {

    private lateinit var bookingId: String
    private lateinit var btnSendQuote: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat)

        bookingId = intent.getStringExtra("bookingId") ?: ""

        btnSendQuote = findViewById(R.id.btnSendQuote)

        // Mostra il pulsante solo se c'è un bookingId valido
        if (bookingId.isNotEmpty()) {
            btnSendQuote.visibility = View.VISIBLE
            btnSendQuote.setOnClickListener {
                val quoteDialog = QuoteDialog(bookingId)
                quoteDialog.show(supportFragmentManager, "quote_dialog")
            }
        } else {
            btnSendQuote.visibility = View.GONE
        }
    }

    private fun getCurrentBookingId(): String {
        return bookingId
    }
}