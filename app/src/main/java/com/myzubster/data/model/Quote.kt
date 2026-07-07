package com.myzubster.data.model

import com.google.gson.annotations.SerializedName
import java.util.Date

// ============================================================
// 📋 QUOTE (Preventivo)
// ============================================================

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
    val updatedAt: Date?,
    
    @SerializedName("professional")
    val professional: User? = null,
    
    @SerializedName("booking")
    val booking: Booking? = null
)

enum class QuoteStatus {
    @SerializedName("pending")
    PENDING,
    
    @SerializedName("accepted")
    ACCEPTED,
    
    @SerializedName("rejected")
    REJECTED,
    
    @SerializedName("expired")
    EXPIRED,
    
    @SerializedName("withdrawn")
    WITHDRAWN
}

// ============================================================
// 📝 RICHIESTE PER QUOTE
// ============================================================

data class CreateQuoteRequest(
    @SerializedName("bookingId")
    val bookingId: String,
    
    @SerializedName("amount")
    val amount: Double,
    
    @SerializedName("description")
    val description: String,
    
    @SerializedName("validUntil")
    val validUntil: String? = null
)

data class QuoteUpdateRequest(
    @SerializedName("amount")
    val amount: Double? = null,
    
    @SerializedName("description")
    val description: String? = null,
    
    @SerializedName("status")
    val status: QuoteStatus? = null,
    
    @SerializedName("professionalId")
    val professionalId: String? = null
)