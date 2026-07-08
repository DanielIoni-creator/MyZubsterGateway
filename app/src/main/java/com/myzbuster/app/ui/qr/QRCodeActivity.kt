package com.myzbuster.app.ui.qr

import android.graphics.Bitmap
import android.os.Bundle
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import com.myzbuster.app.R
import com.myzbuster.app.qr.QRCodeData
import com.myzbuster.app.qr.QRCodeGenerator
import com.myzbuster.app.qr.QRType
import com.myzbuster.app.ui.base.BaseActivity
import com.myzbuster.app.utils.ClipboardUtils
import com.myzbuster.app.utils.QRCodeUtils

class QRCodeActivity : BaseActivity() {
    
    private lateinit var qrImageView: ImageView
    private lateinit var qrTitleTextView: TextView
    private lateinit var qrSubtitleTextView: TextView
    private lateinit var shareButton: Button
    private lateinit var copyAddressButton: Button  // Pulsante Copia Indirizzo
    
    private var qrData: QRCodeData? = null
    private var qrBitmap: Bitmap? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_code)
        
        initViews()
        loadQRData()
        setupListeners()
    }
    
    private fun initViews() {
        qrImageView = findViewById(R.id.qr_image_view)
        qrTitleTextView = findViewById(R.id.qr_title_text)
        qrSubtitleTextView = findViewById(R.id.qr_subtitle_text)
        shareButton = findViewById(R.id.qr_share_button)
        copyAddressButton = findViewById(R.id.copy_address_button)  // Inizializza il pulsante
    }
    
    private fun loadQRData() {
        val dataJson = intent.getStringExtra("qr_data")
        
        if (dataJson != null) {
            qrData = QRCodeData.fromJson(dataJson)
            if (qrData != null) {
                generateAndDisplayQR()
                updateUI()
                return
            }
        }
        
        showDefaultQR()
    }
    
    private fun generateAndDisplayQR() {
        qrData?.let { data ->
            qrBitmap = QRCodeGenerator.generateQRCode(data)
            if (qrBitmap != null) {
                qrImageView.setImageBitmap(qrBitmap)
            } else {
                Toast.makeText(this, "Errore nella generazione del QR", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun updateUI() {
        qrData?.let { data ->
            when (data.type) {
                QRType.USER_PROFILE -> {
                    qrTitleTextView.text = "Profilo Utente"
                    qrSubtitleTextView.text = data.serviceName ?: "Utente"
                }
                QRType.PAYMENT -> {
                    qrTitleTextView.text = "Pagamento"
                    qrSubtitleTextView.text = "Importo: ${data.amount} XMR"
                }
                QRType.BOOKING -> {
                    qrTitleTextView.text = "Prenotazione"
                    qrSubtitleTextView.text = data.serviceName ?: "Servizio"
                }
                else -> {
                    qrTitleTextView.text = "QR Code"
                    qrSubtitleTextView.text = "MyZubster"
                }
            }
        }
    }
    
    private fun showDefaultQR() {
        val defaultData = QRCodeData.forUser("user_123", "Mario Rossi")
        qrData = defaultData
        generateAndDisplayQR()
        updateUI()
    }
    
    private fun setupListeners() {
        // Pulsante Condividi QR
        shareButton.setOnClickListener {
            qrBitmap?.let { bitmap ->
                QRCodeUtils.shareQRCode(this, bitmap)
            } ?: run {
                Toast.makeText(this, "Nessun QR da condividere", Toast.LENGTH_SHORT).show()
            }
        }
        
        // Pulsante Copia Indirizzo
        copyAddressButton.setOnClickListener {
            val address = qrData?.paymentAddress ?: "Indirizzo non disponibile"
            if (address != "Indirizzo non disponibile") {
                ClipboardUtils.copyToClipboard(
                    context = this,
                    text = address,
                    label = "Indirizzo pagamento",
                    successMessage = "✅ Indirizzo copiato negli appunti!"
                )
            } else {
                Toast.makeText(this, "Nessun indirizzo disponibile", Toast.LENGTH_SHORT).show()
            }
        }
    }
}