package com.myzubster.payment.models

data class PaymentRequest(
    val bookingId: String,
    val amount: Double,
    val professionalId: String
)