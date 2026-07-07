package com.myzubster.data.model

import com.google.gson.annotations.SerializedName
import java.util.Date

data class Quote(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("bookingId")
    val bookingId: String,
    
    @SerializedName("professionalId")
    val professionalId: String,
    
    @SerializedName("professionalName")
    val professionalName: String,
    
    @SerializedName("amount")
    val amount: Double,
    
    @SerializedName("description")
    val description: String,
    
    @SerializedName("status")
    val status: QuoteStatus,
    
    @SerializedName("createdAt")
    val createdAt: Date,
    
    @SerializedName("updatedAt")
    val updatedAt: Date?
)

enum class QuoteStatus {
    @SerializedName("pending")
    PENDING,
    
    @SerializedName("accepted")
    ACCEPTED,
    
    @SerializedName("rejected")
    REJECTED,
    
    @SerializedName("expired")
    EXPIRED
}