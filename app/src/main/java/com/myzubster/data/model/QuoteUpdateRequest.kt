package com.myzubster.data.model

import com.google.gson.annotations.SerializedName

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