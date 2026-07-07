package com.myzubster.models

import java.util.Date

data class Booking(
    val id: String? = null,
    val skillId: String,
    val clientId: String,
    val professionalId: String,
    val date: Date,
    val timeSlot: String,
    val status: String = "pending",
    val quoteAmount: Double? = null,
    val quoteStatus: String? = null,
    val notes: String? = null,
    val createdAt: Date? = null,
    val updatedAt: Date? = null,
    val completedAt: Date? = null
)

data class BookingRequest(
    val skillId: String,
    val date: String,
    val timeSlot: String,
    val notes: String? = null
)

data class BookingResponse(
    val success: Boolean,
    val data: Booking?,
    val error: String?
)

data class BookingListResponse(
    val success: Boolean,
    val data: List<Booking>?,
    val pagination: Pagination?,
    val error: String?
)

data class AvailableSlotsResponse(
    val success: Boolean,
    val data: AvailableSlotsData?,
    val error: String?
)

data class AvailableSlotsData(
    val date: String,
    val availableSlots: List<String>,
    val bookedSlots: List<String>
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val pages: Int
)