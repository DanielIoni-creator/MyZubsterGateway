package com.myzubster.payment

import com.myzubster.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class CreateMoneroPaymentRequest(
    val amountXmr: String,
    val description: String,
    val confirmations: Int = 0,
    val metadata: Map<String, String> = emptyMap(),
    val sellerId: String = "seller-demo"
)

data class PaymentDetails(
    val paymentId: String,
    val address: String,
    val amountXmr: String,
    val amountAtomic: String,
    val description: String,
    val requiredConfirmations: Int,
    val status: PaymentStatus,
    val confirmations: Int,
    val uri: String
)

enum class PaymentStatus {
    Pending,
    Detected,
    Confirmed,
    Failed;

    companion object {
        fun fromApi(value: String?): PaymentStatus = when (value?.lowercase()) {
            "detected" -> Detected
            "confirmed" -> Confirmed
            "failed", "expired", "cancelled" -> Failed
            else -> Pending
        }
    }
}

class MoneroPaymentManager(
    private val baseUrl: String = BuildConfig.API_BASE_URL,
    client: OkHttpClient? = null
) {
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()
    private val httpClient = client ?: OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
        .build()

    suspend fun generatePaymentRequest(amount: Double, description: String, sellerId: String): PaymentDetails {
        return createPayment(
            CreateMoneroPaymentRequest(
                amountXmr = java.math.BigDecimal.valueOf(amount).stripTrailingZeros().toPlainString(),
                description = description,
                sellerId = sellerId,
                metadata = mapOf("sellerId" to sellerId)
            )
        )
    }

    suspend fun verifyPaymentStatus(paymentId: String): PaymentDetails = getPaymentStatus(paymentId)

    suspend fun createPayment(request: CreateMoneroPaymentRequest): PaymentDetails = withContext(Dispatchers.IO) {
        val bodyJson = JSONObject()
            .put("amountXmr", request.amountXmr)
            .put("amount", request.amountXmr)
            .put("description", request.description)
            .put("sellerId", request.sellerId)
            .put("confirmations", request.confirmations)
            .put("metadata", JSONObject(request.metadata + mapOf("sellerId" to request.sellerId)))

        val httpRequest = Request.Builder()
            .url("${baseUrl.trimEnd('/')}/api/payment/create")
            .post(bodyJson.toString().toRequestBody(jsonMediaType))
            .build()

        httpClient.newCall(httpRequest).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IOException("Payment create failed: ${response.code} $body")
            parsePayment(JSONObject(body))
        }
    }

    suspend fun getPaymentStatus(paymentId: String): PaymentDetails = withContext(Dispatchers.IO) {
        val httpRequest = Request.Builder()
            .url("${baseUrl.trimEnd('/')}/api/payment/status/$paymentId")
            .get()
            .build()

        httpClient.newCall(httpRequest).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IOException("Payment status failed: ${response.code} $body")
            parsePayment(JSONObject(body))
        }
    }

    private fun parsePayment(json: JSONObject): PaymentDetails = PaymentDetails(
        paymentId = json.getString("paymentId"),
        address = json.getString("address"),
        amountXmr = json.getString("amountXmr"),
        amountAtomic = json.optString("amountAtomic"),
        description = json.optString("description", "MyZubster payment"),
        requiredConfirmations = json.optInt("requiredConfirmations", 0),
        status = PaymentStatus.fromApi(json.optString("status")),
        confirmations = json.optInt("confirmations", 0),
        uri = json.optString("uri").ifBlank {
            "monero:${json.getString("address")}?amount=${json.getString("amountXmr")}&tx_description=${json.optString("description")}" 
        }
    )
}
