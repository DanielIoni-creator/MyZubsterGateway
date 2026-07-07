package com.myzubster.models

data class BookingHistoryResponse(
    val success: Boolean,
    val data: List<BookingHistory>,
    val pagination: Pagination,
    val error: String? = null
)

data class Pagination(
    val total: Int,
    val page: Int,
    val limit: Int
)