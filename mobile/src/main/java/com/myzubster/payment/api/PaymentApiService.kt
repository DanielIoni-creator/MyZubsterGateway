package com.myzubster.payment.api

import com.myzubster.payment.models.PaymentRequest
import com.myzubster.payment.models.PaymentResponse
import com.myzubster.payment.models.PaymentStatusResponse
import retrofit2.Response
import retrofit2.http.*

interface PaymentApiService {

    @POST("api/v1/payments")
    suspend fun initiatePayment(
        @Header("Authorization") token: String,
        @Body request: PaymentRequest
    ): Response<PaymentResponse>

    @GET("api/v1/payments/{id}/status")
    suspend fun checkPaymentStatus(
        @Path("id") paymentId: String,
        @Header("Authorization") token: String
    ): Response<PaymentStatusResponse>

    @POST("api/v1/payments/{id}/release")
    suspend fun releaseFunds(
        @Path("id") paymentId: String,
        @Header("Authorization") token: String
    ): Response<PaymentResponse>

    @POST("api/v1/payments/{id}/complete-work")
    suspend fun completeWork(
        @Path("id") paymentId: String,
        @Header("Authorization") token: String
    ): Response<PaymentResponse>
}