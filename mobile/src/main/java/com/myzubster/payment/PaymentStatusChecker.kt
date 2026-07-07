package com.myzubster.payment

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class PaymentStatusChecker(
    private val paymentManager: MoneroPaymentManager,
    private val scope: CoroutineScope,
    private val intervalMillis: Long = 5_000L
) {
    private var job: Job? = null

    fun start(paymentId: String, onStatus: (PaymentDetails) -> Unit, onError: (Throwable) -> Unit = {}) {
        stop()
        job = scope.launch {
            while (isActive) {
                try {
                    val status = paymentManager.getPaymentStatus(paymentId)
                    onStatus(status)
                    if (status.status == PaymentStatus.Confirmed || status.status == PaymentStatus.Failed) break
                } catch (error: Throwable) {
                    onError(error)
                }
                delay(intervalMillis)
            }
        }
    }

    fun stop() {
        job?.cancel()
        job = null
    }
}
