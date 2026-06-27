package com.myzubster.ui.chat

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.appbar.MaterialToolbar
import com.myzubster.R
import com.myzubster.activities.PaymentActivity

class ChatActivity : AppCompatActivity() {
    private lateinit var contactUserId: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat)

        contactUserId = intent.getStringExtra(EXTRA_CONTACT_USER_ID) ?: "seller-demo"
        title = "Chat con $contactUserId"
        findViewById<MaterialToolbar>(R.id.chatToolbar).title = title

        findViewById<Button>(R.id.requestPaymentButton).setOnClickListener {
            showPaymentAmountDialog()
        }
    }

    private fun showPaymentAmountDialog() {
        val amountInput = EditText(this).apply {
            hint = "Importo in XMR"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or
                android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
            setSingleLine(true)
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = resources.getDimensionPixelSize(R.dimen.payment_dialog_padding)
            setPadding(padding, padding / 2, padding, 0)
            addView(amountInput)
        }

        AlertDialog.Builder(this)
            .setTitle("💰 Richiedi Pagamento")
            .setMessage("Inserisci l'importo da richiedere in Monero.")
            .setView(container)
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton("Continua", null)
            .create()
            .apply {
                setOnShowListener {
                    getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                        val amount = amountInput.text?.toString()?.replace(',', '.')?.trim().orEmpty()
                        val amountValue = amount.toDoubleOrNull()
                        if (amountValue == null || amountValue <= 0.0) {
                            Toast.makeText(this@ChatActivity, "Inserisci un importo XMR valido", Toast.LENGTH_SHORT).show()
                            return@setOnClickListener
                        }
                        dismiss()
                        requestPayment(
                            amountXmr = amount,
                            description = "Pagamento servizio MyZubster",
                            sellerId = contactUserId
                        )
                    }
                }
                show()
            }
    }

    private fun requestPayment(amountXmr: String, description: String, sellerId: String) {
        val intent = Intent(this, PaymentActivity::class.java).apply {
            putExtra(PaymentActivity.EXTRA_AMOUNT, amountXmr.toDoubleOrNull() ?: 0.01)
            putExtra(PaymentActivity.EXTRA_SELLER_ID, sellerId)
            putExtra(PaymentActivity.EXTRA_DESCRIPTION, description)
        }
        startActivity(intent)
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left)
    }

    override fun finish() {
        super.finish()
        overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right)
    }

    companion object {
        const val EXTRA_CONTACT_USER_ID = "extra_contact_user_id"
        const val EXTRA_CHAT_ID = "extra_chat_id"
    }
}
