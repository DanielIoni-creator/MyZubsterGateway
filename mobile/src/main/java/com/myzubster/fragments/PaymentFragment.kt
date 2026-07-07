package com.myzubster.fragments

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.myzubster.R
import com.myzubster.network.MoneroPaymentResponse
import com.myzubster.network.MoneroPaymentResult
import com.myzubster.network.MoneroPaymentService
import com.myzubster.utils.QRCodeGenerator
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class PaymentFragment : Fragment() {
    private val paymentService = MoneroPaymentService()
    private var statusPollingJob: Job? = null
    private var currentPayment: MoneroPaymentResponse? = null
    private var requestedAmount: Double = 0.0
    private var sellerId: String = ""
    private var successDialogShown = false

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_payment, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        requestedAmount = requireArguments().getDouble(ARG_AMOUNT)
        sellerId = requireArguments().getString(ARG_SELLER_ID).orEmpty()
        val description = requireArguments().getString(ARG_DESCRIPTION, "Pagamento MyZubster")

        view.findViewById<TextView>(R.id.paymentAmountText).text = "${formatAmount(requestedAmount)} XMR"
        view.findViewById<Button>(R.id.cancelPaymentButton).setOnClickListener { cancelPayment() }
        view.findViewById<Button>(R.id.openWalletButton).setOnClickListener { openExternalWallet() }

        createPayment(amount = requestedAmount, description = description, sellerId = sellerId)
    }

    override fun onDestroyView() {
        statusPollingJob?.cancel()
        statusPollingJob = null
        super.onDestroyView()
    }

    private fun createPayment(amount: Double, description: String, sellerId: String) {
        setWaiting(true)
        setStatusText("Creo richiesta di pagamento...")

        viewLifecycleOwner.lifecycleScope.launch {
            when (val result = paymentService.createPaymentRequest(amount, description, sellerId)) {
                is MoneroPaymentResult.Success -> {
                    currentPayment = result.value
                    renderPayment(result.value)
                    startPaymentStatusTimer(result.value.paymentId)
                }

                is MoneroPaymentResult.Error -> {
                    setWaiting(false)
                    setStatusText("Errore creazione pagamento: ${result.message}")
                }
            }
        }
    }

    private fun renderPayment(payment: MoneroPaymentResponse) {
        val root = view ?: return
        root.findViewById<TextView>(R.id.paymentAmountText).text = "${payment.amountXmr} XMR"
        root.findViewById<TextView>(R.id.paymentAddressText).text = payment.address
        root.findViewById<ImageView>(R.id.paymentQrImage).setImageBitmap(
            QRCodeGenerator.generateMoneroQR(payment.address, payment.amountXmr.toDoubleOrNull() ?: requestedAmount)
        )
        root.findViewById<Button>(R.id.openWalletButton).isEnabled = payment.uri.isNotBlank()
        updateStatus(payment)
    }

    private fun startPaymentStatusTimer(paymentId: String) {
        statusPollingJob?.cancel()
        statusPollingJob = viewLifecycleOwner.lifecycleScope.launch {
            while (isActive) {
                delay(POLL_INTERVAL_MS)
                when (val result = paymentService.checkPaymentStatus(paymentId)) {
                    is MoneroPaymentResult.Success -> {
                        currentPayment = result.value
                        renderPayment(result.value)
                        if (isCompleted(result.value.status)) {
                            statusPollingJob?.cancel()
                            showSuccessDialog()
                            break
                        }
                        if (isFailed(result.value.status)) {
                            setWaiting(false)
                            setStatusText("Pagamento fallito")
                            break
                        }
                    }

                    is MoneroPaymentResult.Error -> {
                        // Errore temporaneo: lo mostriamo, ma lasciamo il timer attivo per recuperare da rete instabile.
                        setStatusText("Errore verifica pagamento: ${result.message}")
                    }
                }
            }
        }
    }

    private fun updateStatus(payment: MoneroPaymentResponse) {
        val readableStatus = when (payment.status.lowercase()) {
            "confirmed", "completed" -> "Pagamento ricevuto"
            "detected" -> "Pagamento rilevato, attendo conferme"
            "failed", "expired", "cancelled" -> "Pagamento fallito"
            else -> "In attesa del pagamento"
        }
        setStatusText("$readableStatus (${payment.confirmations}/${payment.requiredConfirmations} conferme)")
        setWaiting(!isCompleted(payment.status) && !isFailed(payment.status))
    }

    private fun cancelPayment() {
        statusPollingJob?.cancel()
        statusPollingJob = null
        setWaiting(false)
        setStatusText("Pagamento annullato")
        parentFragmentManager.popBackStack()
    }

    private fun openExternalWallet() {
        val uri = currentPayment?.uri?.takeIf { it.isNotBlank() }
            ?: currentPayment?.let { QRCodeGenerator.buildMoneroUri(it.address, it.amountXmr.toDoubleOrNull() ?: requestedAmount) }
            ?: return
        runCatching {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri)))
        }.onFailure {
            setStatusText("Nessun wallet Monero disponibile per aprire il pagamento")
        }
    }

    private fun showSuccessDialog() {
        if (!isAdded || successDialogShown) return
        successDialogShown = true
        setWaiting(false)

        val dialogView = layoutInflater.inflate(R.layout.dialog_payment_success, null)
        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .create()
        dialogView.findViewById<Button>(R.id.closePaymentSuccessButton).setOnClickListener {
            dialog.dismiss()
        }
        dialog.show()
    }

    private fun setWaiting(waiting: Boolean) {
        view?.findViewById<ProgressBar>(R.id.paymentWaitingProgress)?.visibility = if (waiting) View.VISIBLE else View.GONE
    }

    private fun setStatusText(message: String) {
        view?.findViewById<TextView>(R.id.paymentStatusText)?.text = message
    }

    private fun isCompleted(status: String): Boolean = status.equals("confirmed", ignoreCase = true) ||
        status.equals("completed", ignoreCase = true)

    private fun isFailed(status: String): Boolean = status.equals("failed", ignoreCase = true) ||
        status.equals("expired", ignoreCase = true) ||
        status.equals("cancelled", ignoreCase = true)

    private fun formatAmount(amount: Double): String = java.math.BigDecimal.valueOf(amount)
        .stripTrailingZeros()
        .toPlainString()

    companion object {
        private const val ARG_AMOUNT = "amount"
        private const val ARG_SELLER_ID = "seller_id"
        private const val ARG_DESCRIPTION = "description"
        private const val POLL_INTERVAL_MS = 5_000L

        fun newInstance(amount: Double, sellerId: String, description: String = "Pagamento MyZubster"): PaymentFragment {
            return PaymentFragment().apply {
                arguments = Bundle().apply {
                    putDouble(ARG_AMOUNT, amount)
                    putString(ARG_SELLER_ID, sellerId)
                    putString(ARG_DESCRIPTION, description)
                }
            }
        }
    }
}
