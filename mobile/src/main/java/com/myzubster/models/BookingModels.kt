package com.myzubster.models

data class Booking(
    val id: String,
    val clientId: String,
    val professionalId: String,
    val skillId: String,
    val date: String,
    val timeSlot: String,
    val amount: Double,
    val status: String,
    val completedAt: String? = null,
    val notes: String? = null,
    val location: String? = null,
    val createdAt: String,
    val updatedAt: String
)

data class BookingResponse(
    val success: Boolean,
    val data: Booking? = null,
    val error: String? = null
)

data class BookingsResponse(
    val success: Boolean,
    val data: List<Booking>,
    val pagination: Pagination,
    val error: String? = null
)

data class CreateBookingRequest(
    val professionalId: String,
    val skillId: String,
    val date: String,
    val timeSlot: String,
    val amount: Double,
    val notes: String? = null,
    val location: String? = null
)

data class UpdateBookingStatusRequest(
    val status: String
)