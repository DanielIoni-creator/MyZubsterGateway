package com.myzubster.activities

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
    private lateinit var tvMoneroAddress: TextView
    private lateinit var ivQrCode: ImageView
    private lateinit var progressBar: ProgressBar
    private lateinit var btnOpenWallet: Button
    private lateinit var btnCopyAddress: Button
    private lateinit var btnReleaseFunds: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_payment)

        // Inizializza le view
        tvPaymentAmount = findViewById(R.id.tvPaymentAmount)
        tvPaymentStatus = findViewById(R.id.tvPaymentStatus)
        tvMoneroAddress = findViewById(R.id.tvPaymentAddress)
        ivQrCode = findViewById(R.id.ivQRCode)
        progressBar = findViewById(R.id.progressBar)
        btnOpenWallet = findViewById(R.id.btnRefreshStatus)
        btnCopyAddress = findViewById(R.id.btnCopyAddress)
        btnReleaseFunds = findViewById(R.id.btnReleaseFunds)

        // Setup listener
        btnReleaseFunds.setOnClickListener { releaseFunds() }
        btnOpenWallet.setOnClickListener { openWallet() }
        btnCopyAddress.setOnClickListener { copyAddress() }

        // Carica i dati di test
        loadPaymentData()
    }

    private fun loadPaymentData() {
        // Dati di test (simulazione)
        tvPaymentAmount.text = "100.00 XMR"
        tvPaymentStatus.text = "✅ In attesa del pagamento"
        tvMoneroAddress.text = "4A6d7... (indirizzo Monero)"
        
        // Mostra QR Code (placeholder)
        // ivQrCode.setImageResource(R.drawable.ic_qr_code)
        
        // Nascondi progress bar
        progressBar.visibility = ProgressBar.GONE
    }

    private fun releaseFunds() {
        Toast.makeText(this, "💰 Fondi rilasciati con successo!", Toast.LENGTH_LONG).show()
        btnReleaseFunds.isEnabled = false
        btnReleaseFunds.text = "✅ Rilasciato"
    }

    private fun openWallet() {
        Toast.makeText(this, "📱 Apri wallet Monero", Toast.LENGTH_SHORT).show()
    }

    private fun copyAddress() {
        Toast.makeText(this, "📋 Indirizzo copiato!", Toast.LENGTH_SHORT).show()
    }
}