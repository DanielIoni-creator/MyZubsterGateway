package com.myzubster.repositories

import com.myzubster.models.BookingHistoryResponse
import com.myzubster.network.RetrofitClient
import retrofit2.Response

class BookingHistoryRepository {
    
    suspend fun getBookingHistory(
        userId: String,
        page: Int = 1,
        limit: Int = 10,
        status: String? = null
    ): Response<BookingHistoryResponse> {
        return RetrofitClient.apiService.getBookingHistory(
            userId = userId,
            page = page,
            limit = limit,
            status = status
        )
    }
}