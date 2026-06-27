package com.myzubster.models

data class PaymentCreateRequest(
    val amount: Double,
    val description: String,
    val sellerId: String,
    val buyerId: String? = null,
    val fcmToken: String? = null,
    val confirmations: Int = 10
)

data class Payment(
    val paymentId: String,
    val address: String,
    val moneroAddress: String? = null,
    val amount: Double? = null,
    val amountXmr: String,
    val amountAtomic: String? = null,
    val feeAmount: Double? = null,
    val netAmount: Double? = null,
    val platformFeeRate: Double? = null,
    val description: String? = null,
    val sellerId: String? = null,
    val buyerId: String? = null,
    val requiredConfirmations: Int = 10,
    val status: PaymentStatus = PaymentStatus.PENDING,
    val rawStatus: String? = null,
    val paidXmr: String? = null,
    val paidAtomic: String? = null,
    val confirmations: Int = 0,
    val txIds: List<String> = emptyList(),
    val uri: String? = null,
    val createdAt: String? = null,
    val confirmedAt: String? = null,
    val updatedAt: String? = null
)

enum class PaymentStatus {
    PENDING,
    DETECTED,
    CONFIRMED,
    FAILED;

    companion object {
        fun fromApi(value: String?): PaymentStatus = when (value?.lowercase()) {
            "detected" -> DETECTED
            "confirmed", "confermato", "completed" -> CONFIRMED
            "failed", "fallito", "expired", "cancelled" -> FAILED
            else -> PENDING
        }
    }
}
