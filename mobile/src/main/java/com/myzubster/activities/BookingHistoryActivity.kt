package com.myzubster.activities

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.Observer
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.myzubster.R
import com.myzubster.adapters.BookingHistoryAdapter
import com.myzubster.databinding.ActivityBookingHistoryBinding
import com.myzubster.models.BookingHistory
import com.myzubster.network.ApiClient
import com.myzubster.network.ApiService
import com.myzubster.utils.SessionManager
import com.myzubster.viewmodels.BookingHistoryViewModel
import com.myzubster.viewmodels.BookingHistoryViewModelFactory

class BookingHistoryActivity : AppCompatActivity() {

    private lateinit var binding: ActivityBookingHistoryBinding
    private lateinit var viewModel: BookingHistoryViewModel
    private lateinit var adapter: BookingHistoryAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBookingHistoryBinding.inflate(layoutInflater)
        setContentView(binding.root)

        initViewModel()
        initRecyclerView()
        setupObservers()
        
        viewModel.loadBookings()
    }

    private fun initViewModel() {
        val factory = BookingHistoryViewModelFactory()
        viewModel = ViewModelProvider(this, factory).get(BookingHistoryViewModel::class.java)
    }

    private fun initRecyclerView() {
        adapter = BookingHistoryAdapter { booking ->
            // Naviga al dettaglio
        }
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter
    }

    private fun setupObservers() {
        viewModel.bookings.observe(this, Observer { bookings ->
            if (bookings.isNullOrEmpty()) {
                binding.recyclerView.visibility = View.GONE
                binding.tvEmpty.visibility = View.VISIBLE
            } else {
                binding.recyclerView.visibility = View.VISIBLE
                binding.tvEmpty.visibility = View.GONE
                adapter.submitList(bookings)
            }
        })

        viewModel.isLoading.observe(this, Observer { isLoading ->
            if (isLoading == true) {
                binding.swipeRefreshLayout.isRefreshing = true
            } else {
                binding.swipeRefreshLayout.isRefreshing = false
            }
        })

        viewModel.error.observe(this, Observer { errorMessage ->
            if (!errorMessage.isNullOrEmpty()) {
                binding.tvError.text = errorMessage
                binding.tvError.visibility = View.VISIBLE
            } else {
                binding.tvError.visibility = View.GONE
            }
        })
    }
}