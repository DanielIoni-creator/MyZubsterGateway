package com.myzubster.payment.ui

import android.os.Bundle
import android.widget.Button
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.myzubster.R

class PaymentActivity : AppCompatActivity() {

    private lateinit var tvPaymentAmount: TextView
    private lateinit var tvPaymentStatus: TextView
    private lateinit var tvPaymentAddress: TextView
    private lateinit var tvPaymentConfirmations: TextView
    private lateinit var tvPaymentFee: TextView
    private lateinit var tvPaymentNet: TextView
    private lateinit var ivQRCode: ImageView
    private lateinit var progressBar: ProgressBar
    private lateinit var btnRefresh: Button
    private lateinit var btnRelease: Button
    private lateinit var btnCopyAddress: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_payment)

        // Inizializza le view
        tvPaymentAmount = findViewById(R.id.tvPaymentAmount)
        tvPaymentStatus = findViewById(R.id.tvPaymentStatus)
        tvPaymentAddress = findViewById(R.id.tvPaymentAddress)
        tvPaymentConfirmations = findViewById(R.id.tvPaymentConfirmations)
        tvPaymentFee = findViewById(R.id.tvPaymentFee)
        tvPaymentNet = findViewById(R.id.tvPaymentNet)
        ivQRCode = findViewById(R.id.ivQRCode)
        progressBar = findViewById(R.id.progressBar)
        btnRefresh = findViewById(R.id.btnRefreshStatus)
        btnRelease = findViewById(R.id.btnReleaseFunds)
        btnCopyAddress = findViewById(R.id.btnCopyAddress)

        // Setup listener
        btnRefresh.setOnClickListener { refreshStatus() }
        btnRelease.setOnClickListener { releaseFunds() }
        btnCopyAddress.setOnClickListener { copyAddress() }

        // Carica dati di test
        loadTestData()
    }

    private fun loadTestData() {
        tvPaymentAmount.text = "100.00 XMR"
        tvPaymentFee.text = "2.00 XMR"
        tvPaymentNet.text = "98.00 XMR"
        tvPaymentStatus.text = "⏳ In attesa del pagamento"
        tvPaymentAddress.text = "4A6d7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8"
        tvPaymentConfirmations.text = "0/10"
        btnRelease.isEnabled = false
        progressBar.visibility = ProgressBar.GONE
    }

    private fun refreshStatus() {
        Toast.makeText(this, "🔄 Aggiornamento stato...", Toast.LENGTH_SHORT).show()
        // Simula aggiornamento
        tvPaymentStatus.text = "✅ Pagamento confermato"
        tvPaymentConfirmations.text = "10/10"
        btnRelease.isEnabled = true
        progressBar.visibility = ProgressBar.GONE
    }

    private fun releaseFunds() {
        Toast.makeText(this, "✅ Fondi rilasciati con successo!", Toast.LENGTH_LONG).show()
        btnRelease.isEnabled = false
        btnRelease.text = "✅ Rilasciato"
        tvPaymentStatus.text = "✅ Pagamento completato"
    }

    private fun copyAddress() {
        Toast.makeText(this, "📋 Indirizzo copiato!", Toast.LENGTH_SHORT).show()
    }
}