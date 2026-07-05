package com.myzubster.repositories

import com.myzubster.models.BookingHistoryResponse
import com.myzubster.network.ApiService
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookingHistoryRepository @Inject constructor(
    private val apiService: ApiService
) {

    suspend fun getBookingHistory(
        userId: String,
        page: Int = 1,
        limit: Int = 10,
        category: String? = null,
        status: String? = null,
        startDate: String? = null,
        endDate: String? = null
    ): Response<BookingHistoryResponse> {
        return apiService.getBookingHistory(
            userId = userId,
            page = page,
            limit = limit,
            category = category,
            status = status,
            startDate = startDate,
            endDate = endDate
        )
    }

    suspend fun getBookingHistoryByStatus(
        userId: String,
        status: String,
        page: Int = 1,
        limit: Int = 10
    ): Response<BookingHistoryResponse> {
        return apiService.getBookingHistory(
            userId = userId,
            page = page,
            limit = limit,
            status = status
        )
    }

    suspend fun getBookingHistoryByCategory(
        userId: String,
        category: String,
        page: Int = 1,
        limit: Int = 10
    ): Response<BookingHistoryResponse> {
        return apiService.getBookingHistory(
            userId = userId,
            page = page,
            limit = limit,
            category = category
        )
    }
}