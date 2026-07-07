package com.myzubster.payment

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
import kotlinx.coroutines.launch

class PaymentFragment : Fragment() {
    private val paymentManager = MoneroPaymentManager()
    private lateinit var statusChecker: PaymentStatusChecker
    private var currentPayment: PaymentDetails? = null
    private var successDialogShown = false

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_payment, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        statusChecker = PaymentStatusChecker(paymentManager, viewLifecycleOwner.lifecycleScope)

        val amount = requireArguments().getString(ARG_AMOUNT_XMR, "0.01")
        val description = requireArguments().getString(ARG_DESCRIPTION, "MyZubster payment")
        val confirmations = requireArguments().getInt(ARG_CONFIRMATIONS, 0)

        view.findViewById<Button>(R.id.cancelPaymentButton).setOnClickListener {
            statusChecker.stop()
            parentFragmentManager.popBackStack()
        }

        view.findViewById<Button>(R.id.openWalletButton).setOnClickListener {
            currentPayment?.let(::openExternalWallet)
        }

        viewLifecycleOwner.lifecycleScope.launch {
            setStatus(PaymentStatus.Pending, confirmations = 0)
            setWaiting(true)
            runCatching {
                paymentManager.createPayment(CreateMoneroPaymentRequest(amount, description, confirmations))
            }.onSuccess { payment ->
                currentPayment = payment
                renderPayment(payment)
                statusChecker.start(payment.paymentId, ::renderPayment) { error ->
                    view.findViewById<TextView>(R.id.paymentStatusText).text = error.message ?: "Errore verifica pagamento"
                }
            }.onFailure { error ->
                setWaiting(false)
                view.findViewById<TextView>(R.id.paymentStatusText).text = error.message ?: "Errore creazione pagamento"
            }
        }
    }

    override fun onDestroyView() {
        statusChecker.stop()
        super.onDestroyView()
    }

    private fun renderPayment(payment: PaymentDetails) {
        val view = view ?: return
        view.findViewById<ImageView>(R.id.paymentQrImage).setImageBitmap(QRCodeGenerator.generatePaymentQr(payment))
        view.findViewById<TextView>(R.id.paymentAmountText).text = "${payment.amountXmr} XMR"
        view.findViewById<TextView>(R.id.paymentAddressText).text = payment.address
        view.findViewById<Button>(R.id.openWalletButton).isEnabled = payment.uri.isNotBlank()
        setStatus(payment.status, payment.confirmations)
        setWaiting(payment.status == PaymentStatus.Pending || payment.status == PaymentStatus.Detected)
        if (payment.status == PaymentStatus.Confirmed && !successDialogShown) showSuccessDialog(payment)
    }

    private fun setStatus(status: PaymentStatus, confirmations: Int) {
        val view = view ?: return
        val text = when (status) {
            PaymentStatus.Confirmed -> getString(R.string.payment_status_confirmed)
            PaymentStatus.Detected -> getString(R.string.payment_status_detected)
            PaymentStatus.Failed -> "Pagamento fallito"
            PaymentStatus.Pending -> getString(R.string.payment_status_pending)
        }
        view.findViewById<TextView>(R.id.paymentStatusText).text = "$text ($confirmations conferme)"
    }

    private fun setWaiting(waiting: Boolean) {
        view?.findViewById<ProgressBar>(R.id.paymentWaitingProgress)?.visibility = if (waiting) View.VISIBLE else View.GONE
    }

    private fun openExternalWallet(payment: PaymentDetails) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(payment.uri))
        runCatching { startActivity(intent) }
    }

    private fun showSuccessDialog(payment: PaymentDetails) {
        if (!isAdded) return
        successDialogShown = true
        setWaiting(false)
        val dialogView = layoutInflater.inflate(R.layout.dialog_payment_success, null)
        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .setMessage("Pagamento ${payment.paymentId} confermato")
            .create()
        dialogView.findViewById<Button>(R.id.closePaymentSuccessButton).setOnClickListener {
            dialog.dismiss()
        }
        dialog.show()
    }

    companion object {
        private const val ARG_AMOUNT_XMR = "amount_xmr"
        private const val ARG_DESCRIPTION = "description"
        private const val ARG_CONFIRMATIONS = "confirmations"

        fun newInstance(amountXmr: String, description: String, confirmations: Int = 0): PaymentFragment = PaymentFragment().apply {
            arguments = Bundle().apply {
                putString(ARG_AMOUNT_XMR, amountXmr)
                putString(ARG_DESCRIPTION, description)
                putInt(ARG_CONFIRMATIONS, confirmations)
            }
        }
    }
}
