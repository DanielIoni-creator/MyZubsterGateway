package com.myzubster.models

data class CreatePaymentRequest(
    val bookingId: String,
    val amount: Double,
    val professionalId: String
)

data class PaymentResponse(
    val success: Boolean,
    val data: PaymentData? = null,
    val error: String? = null
)

data class PaymentData(
    val paymentId: String,
    val amount: Double,
    val address: String,
    val feeInfo: FeeInfo
)

data class FeeInfo(
    val feePercent: Double,
    val feeAmount: Double,
    val netAmount: Double
)

data class PaymentStatusResponse(
    val success: Boolean,
    val data: PaymentTransaction? = null,
    val error: String? = null
)

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