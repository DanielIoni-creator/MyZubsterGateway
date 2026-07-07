package com.myzubster.activities

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.myzubster.R
import com.myzubster.models.Quote
import com.myzubster.network.ApiClient
import kotlinx.coroutines.launch

class BookingDetailActivity : AppCompatActivity() {

    private lateinit var bookingId: String
    private var quote: Quote? = null

    private lateinit var tvQuoteAmount: TextView
    private lateinit var tvQuoteDescription: TextView
    private lateinit var tvQuoteStatus: TextView
    private lateinit var btnAcceptQuote: Button
    private lateinit var btnRejectQuote: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_booking_detail)

        tvQuoteAmount = findViewById(R.id.tvQuoteAmount)
        tvQuoteDescription = findViewById(R.id.tvQuoteDescription)
        tvQuoteStatus = findViewById(R.id.tvQuoteStatus)
        btnAcceptQuote = findViewById(R.id.btnAcceptQuote)
        btnRejectQuote = findViewById(R.id.btnRejectQuote)

        bookingId = intent.getStringExtra("bookingId") ?: ""

        if (bookingId.isNotEmpty()) {
            loadBookingDetails()
        } else {
            Toast.makeText(this, "ID prenotazione non valido", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    private fun loadBookingDetails() {
        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getQuoteByBooking(bookingId)
                if (response.success && response.data != null) {
                    quote = response.data
                    updateUI()
                } else {
                    Toast.makeText(this@BookingDetailActivity, "Nessun preventivo trovato", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@BookingDetailActivity, "Errore: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateUI() {
        quote?.let { q ->
            tvQuoteAmount.text = "💰 Importo: ${q.amount} XMR"
            tvQuoteDescription.text = "📝 Descrizione: ${q.description ?: "Nessuna descrizione"}"
            tvQuoteStatus.text = "📌 Stato: ${getStatusText(q.status)}"

            if (q.status == "pending") {
                btnAcceptQuote.visibility = View.VISIBLE
                btnRejectQuote.visibility = View.VISIBLE

                btnAcceptQuote.setOnClickListener {
                    updateQuoteStatus("accepted")
                }

                btnRejectQuote.setOnClickListener {
                    updateQuoteStatus("rejected")
                }
            } else {
                btnAcceptQuote.visibility = View.GONE
                btnRejectQuote.visibility = View.GONE
            }
        } ?: run {
            tvQuoteAmount.text = "❌ Nessun preventivo disponibile"
            tvQuoteDescription.text = ""
            tvQuoteStatus.text = ""
            btnAcceptQuote.visibility = View.GONE
            btnRejectQuote.visibility = View.GONE
        }
    }

    private fun updateQuoteStatus(status: String) {
        val quoteId = quote?.id
        if (quoteId == null) {
            Toast.makeText(this, "ID preventivo non valido", Toast.LENGTH_SHORT).show()
            return
        }

        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.updateQuoteStatus(
                    quoteId,
                    mapOf("status" to status)
                )
                if (response.success) {
                    val message = if (status == "accepted") "✅ Preventivo accettato!" else "❌ Preventivo rifiutato!"
                    Toast.makeText(this@BookingDetailActivity, message, Toast.LENGTH_LONG).show()
                    loadBookingDetails()
                } else {
                    Toast.makeText(this@BookingDetailActivity, response.error ?: "Errore", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@BookingDetailActivity, "Errore: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun getStatusText(status: String): String {
        return when (status) {
            "pending" -> "⏳ In attesa"
            "accepted" -> "✅ Accettato"
            "rejected" -> "❌ Rifiutato"
            else -> status
        }
    }
}