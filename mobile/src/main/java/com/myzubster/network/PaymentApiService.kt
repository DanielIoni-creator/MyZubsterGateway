package com.myzubster.network

import com.google.gson.annotations.SerializedName
import com.myzubster.BuildConfig
import com.myzubster.models.Payment
import com.myzubster.models.PaymentCreateRequest
import com.myzubster.models.PaymentStatus
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

private data class PaymentDto(
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
    @SerializedName("status") val statusValue: String? = null,
    val rawStatus: String? = null,
    val paidXmr: String? = null,
    val paidAtomic: String? = null,
    val confirmations: Int = 0,
    val txIds: List<String> = emptyList(),
    val uri: String? = null,
    val createdAt: String? = null,
    val confirmedAt: String? = null,
    val updatedAt: String? = null
) {
    fun toPayment(): Payment = Payment(
        paymentId = paymentId,
        address = address,
        moneroAddress = moneroAddress,
        amount = amount,
        amountXmr = amountXmr,
        amountAtomic = amountAtomic,
        feeAmount = feeAmount,
        netAmount = netAmount,
        platformFeeRate = platformFeeRate,
        description = description,
        sellerId = sellerId,
        buyerId = buyerId,
        requiredConfirmations = requiredConfirmations,
        status = PaymentStatus.fromApi(statusValue),
        rawStatus = rawStatus,
        paidXmr = paidXmr,
        paidAtomic = paidAtomic,
        confirmations = confirmations,
        txIds = txIds,
        uri = uri,
        createdAt = createdAt,
        confirmedAt = confirmedAt,
        updatedAt = updatedAt
    )
}

private interface PaymentApi {
    @POST("api/payment/create")
    suspend fun createPayment(@Body request: PaymentCreateRequest): PaymentDto

    @GET("api/payment/status/{paymentId}")
    suspend fun getPaymentStatus(@Path("paymentId") paymentId: String): PaymentDto
}

class PaymentApiService(
    baseUrl: String = BuildConfig.API_BASE_URL,
    okHttpClient: OkHttpClient? = null
) {
    private val api: PaymentApi

    init {
        val client = okHttpClient ?: OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
            .build()

        api = Retrofit.Builder()
            .baseUrl(baseUrl.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(PaymentApi::class.java)
    }

    suspend fun createPayment(request: PaymentCreateRequest): Payment = api.createPayment(request).toPayment()

    suspend fun checkPaymentStatus(paymentId: String): Payment = api.getPaymentStatus(paymentId).toPayment()
}
