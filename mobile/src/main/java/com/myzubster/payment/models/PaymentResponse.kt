package com.myzubster.payment.models

data class PaymentResponse(
    val success: Boolean,
    val message: String? = null,
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