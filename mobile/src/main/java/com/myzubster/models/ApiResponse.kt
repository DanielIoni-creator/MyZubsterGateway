package com.myzubster.models

data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null,
    val message: String? = null
)

data class PaginatedResponse<T>(
    val success: Boolean,
    val data: List<T>,
    val pagination: Pagination,
    val error: String? = null
)

// Rimuovi Pagination da qui - è già in BookingHistoryResponse