package com.myzubster.activities

import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.firebase.messaging.FirebaseMessaging
import com.myzubster.R
import com.myzubster.models.Payment
import com.myzubster.models.PaymentCreateRequest
import com.myzubster.models.PaymentStatus
import com.myzubster.network.PaymentApiService
import com.myzubster.utils.QRCodeGenerator
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.coroutines.resume
import java.math.BigDecimal

class PaymentActivity : AppCompatActivity() {
    private val paymentApiService: PaymentApiService by lazy { PaymentApiService() }
    private var currentPayment: Payment? = null
    private var pollingJob: Job? = null
    private var successDialogShown = false

    private lateinit var amountText: TextView
    private lateinit var qrImage: ImageView
    private lateinit var addressText: TextView
    private lateinit var statusText: TextView
    private lateinit var progress: ProgressBar
    private lateinit var openWalletButton: Button
    private lateinit var copyAddressButton: Button
    private lateinit var cancelButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_payment)
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left)

        amountText = findViewById(R.id.paymentAmount)
        qrImage = findViewById(R.id.qrCodeImage)
        addressText = findViewById(R.id.moneroAddress)
        statusText = findViewById(R.id.paymentStatus)
        progress = findViewById(R.id.paymentActivityProgress)
        openWalletButton = findViewById(R.id.paymentActivityOpenWalletButton)
        copyAddressButton = findViewById(R.id.paymentActivityCopyAddressButton)
        cancelButton = findViewById(R.id.btnCancel)

        val existingPaymentId = intent.getStringExtra(EXTRA_PAYMENT_ID)
        val amount = intent.getDoubleExtra(EXTRA_AMOUNT, 0.01)
        val sellerId = intent.getStringExtra(EXTRA_SELLER_ID) ?: "seller-demo"
        val description = intent.getStringExtra(EXTRA_DESCRIPTION) ?: "Pagamento MyZubster"

        amountText.text = "Importo da pagare: ${formatAmount(amount)} XMR"
        cancelButton.setOnClickListener { cancelPayment() }
        openWalletButton.setOnClickListener { openWallet() }
        copyAddressButton.setOnClickListener { copyAddress() }

        if (existingPaymentId.isNullOrBlank()) {
            createPayment(amount, description, sellerId)
        } else {
            setLoading(true)
            setStatus("In attesa di pagamento...")
            startStatusPolling(existingPaymentId, pollImmediately = true)
        }
    }

    override fun onDestroy() {
        pollingJob?.cancel()
        pollingJob = null
        super.onDestroy()
    }

    private fun createPayment(amount: Double, description: String, sellerId: String) {
        setLoading(true)
        setStatus("In attesa di pagamento...")

        lifecycleScope.launch {
            val fcmToken = runCatching { awaitFcmToken() }.getOrNull()
            runCatching {
                paymentApiService.createPayment(
                    PaymentCreateRequest(
                        amount = amount,
                        description = description,
                        sellerId = sellerId,
                        fcmToken = fcmToken,
                        confirmations = 0
                    )
                )
            }.onSuccess { payment ->
                currentPayment = payment
                renderPayment(payment)
                startStatusPolling(payment.paymentId)
            }.onFailure { error ->
                setLoading(false)
                setStatus("Errore creazione pagamento: ${error.message}")
            }
        }
    }

    private fun startStatusPolling(paymentId: String, pollImmediately: Boolean = false) {
        pollingJob?.cancel()
        pollingJob = lifecycleScope.launch {
            if (pollImmediately) checkStatusOnce(paymentId)
            var attempts = 0
            while (isActive && attempts < MAX_POLL_ATTEMPTS) {
                delay(POLL_INTERVAL_MS)
                attempts += 1
                checkStatusOnce(paymentId)
            }
            if (isActive && !successDialogShown) {
                setLoading(false)
                setStatus("Pagamento non ricevuto")
            }
        }
    }

    private suspend fun checkStatusOnce(paymentId: String) {
        runCatching { paymentApiService.checkPaymentStatus(paymentId) }
            .onSuccess { payment ->
                currentPayment = payment
                renderPayment(payment)
                when (payment.status) {
                    PaymentStatus.CONFIRMED -> {
                        setLoading(false)
                        pollingJob?.cancel()
                        showSuccessDialogAndClose()
                    }
                    PaymentStatus.FAILED -> {
                        setLoading(false)
                        pollingJob?.cancel()
                        setStatus("Pagamento fallito")
                    }
                    PaymentStatus.DETECTED,
                    PaymentStatus.PENDING -> Unit
                }
            }
            .onFailure { error ->
                setStatus("Errore verifica pagamento: ${error.message}")
            }
    }

    private fun renderPayment(payment: Payment) {
        val address = payment.moneroAddress ?: payment.address
        amountText.text = "Importo da pagare: ${payment.amountXmr} XMR"
        addressText.text = address
        qrImage.setImageBitmap(
            QRCodeGenerator.generateMoneroQR(
                address = address,
                amount = payment.amountXmr.toDoubleOrNull() ?: payment.amount ?: 0.0
            )
        )
        openWalletButton.isEnabled = !payment.uri.isNullOrBlank()
        copyAddressButton.isEnabled = address.isNotBlank()
        setLoading(payment.status == PaymentStatus.PENDING || payment.status == PaymentStatus.DETECTED)
        setStatus(readableStatus(payment))
    }

    private fun readableStatus(payment: Payment): String = when (payment.status) {
        PaymentStatus.CONFIRMED -> "Confermato!"
        PaymentStatus.DETECTED -> "Pagamento rilevato, attendo conferme (${payment.confirmations}/${payment.requiredConfirmations})"
        PaymentStatus.FAILED -> "Pagamento fallito"
        PaymentStatus.PENDING -> "In attesa di pagamento..."
    }

    private fun openWallet() {
        val uri = currentPayment?.uri ?: return
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri))) }
            .onFailure { setStatus("Nessun wallet Monero disponibile") }
    }

    private fun copyAddress() {
        val address = currentPayment?.moneroAddress ?: currentPayment?.address ?: addressText.text?.toString().orEmpty()
        if (address.isBlank()) return
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("Indirizzo Monero", address))
        Toast.makeText(this, "Indirizzo copiato", Toast.LENGTH_SHORT).show()
    }

    private fun cancelPayment() {
        pollingJob?.cancel()
        pollingJob = null
        setLoading(false)
        finish()
    }

    private suspend fun awaitFcmToken(): String? = kotlinx.coroutines.suspendCancellableCoroutine { continuation ->
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token -> continuation.resume(token) }
            .addOnFailureListener { continuation.resume(null) }
    }

    private fun showSuccessDialogAndClose() {
        if (successDialogShown) return
        successDialogShown = true
        AlertDialog.Builder(this)
            .setTitle("Confermato!")
            .setMessage("Pagamento Monero ricevuto con successo.")
            .setPositiveButton(android.R.string.ok) { _, _ -> finish() }
            .setOnDismissListener { finish() }
            .show()
    }

    private fun setLoading(loading: Boolean) {
        progress.visibility = if (loading) View.VISIBLE else View.GONE
        cancelButton.isEnabled = true
        openWalletButton.alpha = if (loading) 0.85f else 1.0f
    }

    private fun setStatus(message: String) {
        statusText.text = message
    }

    private fun formatAmount(amount: Double): String = BigDecimal.valueOf(amount)
        .stripTrailingZeros()
        .toPlainString()

    override fun finish() {
        super.finish()
        overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right)
    }

    companion object {
        const val EXTRA_AMOUNT = "extra_amount"
        const val EXTRA_SELLER_ID = "extra_seller_id"
        const val EXTRA_DESCRIPTION = "extra_description"
        const val EXTRA_PAYMENT_ID = "extra_payment_id"
        private const val POLL_INTERVAL_MS = 5_000L
        private const val MAX_POLL_ATTEMPTS = 180 // 15 minutes
    }
}
