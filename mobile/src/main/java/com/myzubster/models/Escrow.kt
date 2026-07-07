package com.myzubster.models

import java.util.Date

data class Escrow(
    val id: String? = null,
    val transactionId: String,
    val clientId: String,
    val professionalId: String,
    val amount: Double,
    val status: String, // pending, funded, in_progress, completed, disputed, released
    val moneroAddress: String? = null,
    val paymentId: String? = null,
    val feeAmount: Double? = null,
    val netAmount: Double? = null,
    val disputeReason: String? = null,
    val clientName: String? = null,
    val professionalName: String? = null,
    val createdAt: Date = Date(),
    val updatedAt: Date = Date(),
    val completedAt: Date? = null
)

data class EscrowRequest(
    val professionalId: String,
    val amount: Double,
    val description: String? = null
)

data class EscrowResponse(
    val success: Boolean,
    val data: Escrow?,
    val error: String?
)