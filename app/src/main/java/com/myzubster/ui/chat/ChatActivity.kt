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
            hint = "Importo in euro (€)"
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
            .setTitle("💶 Richiedi pagamento")
            .setMessage("Inserisci l'importo del servizio in euro.")
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
                            Toast.makeText(this@ChatActivity, "Inserisci un importo in euro valido", Toast.LENGTH_SHORT).show()
                            return@setOnClickListener
                        }
                        dismiss()
                        requestPayment(
                            amountEur = amountValue,
                            description = "Pagamento servizio MyZubster (€ ${String.format(java.util.Locale.ITALY, "%.2f", amountValue)})",
                            sellerId = contactUserId
                        )
                    }
                }
                show()
            }
    }

    private fun requestPayment(amountEur: Double, description: String, sellerId: String) {
        val amountXmrForDemoCheckout = amountEur * DEMO_XMR_PER_EUR
        val intent = Intent(this, PaymentActivity::class.java).apply {
            putExtra(PaymentActivity.EXTRA_AMOUNT, amountXmrForDemoCheckout)
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
        private const val DEMO_XMR_PER_EUR = 0.005
    }
}
