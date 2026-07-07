package com.myzubster.data.model

import com.google.gson.annotations.SerializedName

data class Booking(
    @SerializedName("id") val id: String,
    @SerializedName("skillId") val skillId: String,
    @SerializedName("clientId") val clientId: String,
    @SerializedName("professionalId") val professionalId: String,
    @SerializedName("status") val status: BookingStatus,
    @SerializedName("scheduledDate") val scheduledDate: String,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("price") val price: Double,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String?
)

enum class BookingStatus {
    @SerializedName("pending") PENDING,
    @SerializedName("confirmed") CONFIRMED,
    @SerializedName("in_progress") IN_PROGRESS,
    @SerializedName("completed") COMPLETED,
    @SerializedName("cancelled") CANCELLED
}

data class CreateBookingRequest(
    @SerializedName("skillId") val skillId: String,
    @SerializedName("professionalId") val professionalId: String,
    @SerializedName("scheduledDate") val scheduledDate: String,
    @SerializedName("notes") val notes: String? = null
)

data class UpdateBookingRequest(
    @SerializedName("status") val status: BookingStatus? = null,
    @SerializedName("scheduledDate") val scheduledDate: String? = null,
    @SerializedName("notes") val notes: String? = null
)