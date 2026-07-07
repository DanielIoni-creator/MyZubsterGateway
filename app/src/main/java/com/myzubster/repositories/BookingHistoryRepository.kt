package com.myzubster.repositories

import com.myzubster.network.ApiService
import com.myzubster.network.RetrofitClient

class BookingHistoryRepository {
    private val apiService: ApiService = RetrofitClient.instance

    fun getBookingHistory() {
        // Implementazione futura
    }
}