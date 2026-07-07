package com.myzubster.ui.booking

import android.os.Bundle
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.myzubster.R
import com.myzubster.network.ApiClient

class BookingDetailActivity : AppCompatActivity() {

    private lateinit var viewModel: BookingDetailViewModel
    private lateinit var adapter: QuotesAdapter
    
    private lateinit var rvQuotes: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvEmpty: TextView
    private lateinit var tvBookingId: TextView
    private lateinit var tvServiceName: TextView
    private lateinit var tvProfessionalName: TextView
    private lateinit var tvBookingStatus: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_booking_detail)

        val bookingId = intent.getStringExtra("BOOKING_ID") ?: run {
            Toast.makeText(this, "ID prenotazione mancante", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        val serviceName = intent.getStringExtra("SERVICE_NAME") ?: "Servizio"
        val professionalName = intent.getStringExtra("PROFESSIONAL_NAME") ?: "Professionista"
        val bookingStatus = intent.getStringExtra("BOOKING_STATUS") ?: "In attesa"

        initViews()
        initViewModel()
        initAdapter()
        
        tvBookingId.text = "ID: $bookingId"
        tvServiceName.text = "Servizio: $serviceName"
        tvProfessionalName.text = "Professionista: $professionalName"
        tvBookingStatus.text = "Stato: $bookingStatus"
        
        viewModel.loadQuotes(bookingId)
    }

    private fun initViews() {
        rvQuotes = findViewById(R.id.rvQuotes)
        progressBar = findViewById(R.id.progressBar)
        tvEmpty = findViewById(R.id.tvEmpty)
        tvBookingId = findViewById(R.id.tvBookingId)
        tvServiceName = findViewById(R.id.tvServiceName)
        tvProfessionalName = findViewById(R.id.tvProfessionalName)
        tvBookingStatus = findViewById(R.id.tvBookingStatus)
    }

    private fun initViewModel() {
        val apiService = ApiClient.create()
        viewModel = ViewModelProvider(
            this,
            object : ViewModelProvider.Factory {
                override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return BookingDetailViewModel(apiService) as T
                }
            }
        )[BookingDetailViewModel::class.java]

        viewModel.quotes.observe(this) { quotes ->
            if (quotes.isEmpty()) {
                tvEmpty.visibility = android.view.View.VISIBLE
                rvQuotes.visibility = android.view.View.GONE
            } else {
                tvEmpty.visibility = android.view.View.GONE
                rvQuotes.visibility = android.view.View.VISIBLE
                adapter.submitList(quotes)
            }
        }

        viewModel.isLoading.observe(this) { loading ->
            progressBar.visibility = if (loading) android.view.View.VISIBLE else android.view.View.GONE
        }

        viewModel.error.observe(this) { error ->
            error?.let {
                Toast.makeText(this, it, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun initAdapter() {
        adapter = QuotesAdapter(
            onAcceptClick = { quote -> 
                Toast.makeText(this, "Preventivo accettato!", Toast.LENGTH_SHORT).show()
                viewModel.updateQuoteStatus(quote, accept = true)
            },
            onRejectClick = { quote ->
                Toast.makeText(this, "Preventivo rifiutato", Toast.LENGTH_SHORT).show()
                viewModel.updateQuoteStatus(quote, accept = false)
            }
        )
        rvQuotes.layoutManager = LinearLayoutManager(this)
        rvQuotes.adapter = adapter
    }
}