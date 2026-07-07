package com.myzubster.payment.models

data class PaymentTransaction(
    val id: String,
    val bookingId: String,
    val clientId: String,
    val professionalId: String,
    val amount: Double,
    val feeAmount: Double,
    val netAmount: Double,
    val status: String,
    val address: String,
    val confirmations: Int = 0,
    val paymentTxId: String? = null,
    val releaseTxId: String? = null,
    val feeTxId: String? = null,
    val createdAt: String,
    val confirmedAt: String? = null,
    val releasedAt: String? = null
)