package com.myzubster.data.model

import com.google.gson.annotations.SerializedName

data class Escrow(
    @SerializedName("id") val id: String,
    @SerializedName("bookingId") val bookingId: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("fee") val fee: Double,
    @SerializedName("status") val status: EscrowStatus,
    @SerializedName("fundingTxId") val fundingTxId: String? = null,
    @SerializedName("releaseTxId") val releaseTxId: String? = null,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String?
)

enum class EscrowStatus {
    @SerializedName("pending") PENDING,
    @SerializedName("funded") FUNDED,
    @SerializedName("released") RELEASED,
    @SerializedName("disputed") DISPUTED,
    @SerializedName("refunded") REFUNDED
}

data class CreateEscrowRequest(
    @SerializedName("bookingId") val bookingId: String,
    @SerializedName("amount") val amount: Double
)

data class FundEscrowRequest(
    @SerializedName("txId") val txId: String
)

data class DisputeRequest(
    @SerializedName("reason") val reason: String
)

data class Transaction(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("type") val type: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("status") val status: String,
    @SerializedName("txId") val txId: String? = null,
    @SerializedName("createdAt") val createdAt: String
)