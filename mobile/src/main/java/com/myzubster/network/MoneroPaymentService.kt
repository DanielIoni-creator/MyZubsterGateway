package com.myzubster.network

import com.myzubster.BuildConfig
import com.myzubster.models.PaymentRequest
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import java.io.IOException
import java.net.SocketTimeoutException
import java.util.concurrent.TimeUnit

/**
 * Risposta pubblica del backend /api/payment/create e /api/payment/status/:paymentId.
 * Non contiene mai chiavi private: solo indirizzo, importo, stato e metadati pubblici.
 */
data class MoneroPaymentResponse(
    val paymentId: String,
    val address: String,
    val amountXmr: String,
    val amountAtomic: String,
    val description: String?,
    val requiredConfirmations: Int,
    val status: String,
    val paidXmr: String? = null,
    val paidAtomic: String? = null,
    val confirmations: Int = 0,
    val txIds: List<String> = emptyList(),
    val uri: String,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

private data class CreatePaymentBody(
    val amountXmr: String,
    val description: String,
    val sellerId: String,
    val metadata: Map<String, String>
)

sealed class MoneroPaymentResult<out T> {
    data class Success<T>(val value: T) : MoneroPaymentResult<T>()
    data class Error(val kind: Kind, val message: String, val cause: Throwable? = null) : MoneroPaymentResult<Nothing>() {
        enum class Kind {
            Network,
            Timeout,
            Http,
            Unknown
        }
    }
}

private interface MoneroPaymentApi {
    @POST("api/payment/create")
    suspend fun createPayment(@Body body: CreatePaymentBody): MoneroPaymentResponse

    @GET("api/payment/status/{paymentId}")
    suspend fun checkPaymentStatus(@Path("paymentId") paymentId: String): MoneroPaymentResponse
}

class MoneroPaymentService(
    baseUrl: String = BuildConfig.API_BASE_URL,
    okHttpClient: OkHttpClient? = null,
    private val requestTimeoutMillis: Long = 30_000L
) {
    private val api: MoneroPaymentApi

    init {
        val client = okHttpClient ?: OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .callTimeout(35, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
            .build()

        api = Retrofit.Builder()
            .baseUrl(normalizeBaseUrl(baseUrl))
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(MoneroPaymentApi::class.java)
    }

    /**
     * Crea una richiesta di pagamento Monero chiamando POST /api/payment/create.
     */
    suspend fun createPaymentRequest(
        amount: Double,
        description: String,
        sellerId: String
    ): MoneroPaymentResult<MoneroPaymentResponse> = safeApiCall {
        val paymentRequest = PaymentRequest(
            amount = amount,
            description = description,
            sellerId = sellerId
        )
        api.createPayment(
            CreatePaymentBody(
                amountXmr = formatAmount(paymentRequest.amount),
                description = paymentRequest.description,
                sellerId = paymentRequest.sellerId,
                metadata = mapOf("sellerId" to paymentRequest.sellerId)
            )
        )
    }

    /**
     * Verifica lo stato di un pagamento chiamando GET /api/payment/status/:paymentId.
     */
    suspend fun checkPaymentStatus(paymentId: String): MoneroPaymentResult<MoneroPaymentResponse> = safeApiCall {
        api.checkPaymentStatus(paymentId)
    }

    private suspend fun <T> safeApiCall(block: suspend () -> T): MoneroPaymentResult<T> {
        return try {
            MoneroPaymentResult.Success(withTimeout(requestTimeoutMillis) { block() })
        } catch (error: TimeoutCancellationException) {
            MoneroPaymentResult.Error(
                kind = MoneroPaymentResult.Error.Kind.Timeout,
                message = "Timeout durante la comunicazione con il gateway Monero",
                cause = error
            )
        } catch (error: SocketTimeoutException) {
            MoneroPaymentResult.Error(
                kind = MoneroPaymentResult.Error.Kind.Timeout,
                message = "Timeout di rete durante la comunicazione con il gateway Monero",
                cause = error
            )
        } catch (error: HttpException) {
            MoneroPaymentResult.Error(
                kind = MoneroPaymentResult.Error.Kind.Http,
                message = "Errore HTTP ${error.code()} dal gateway Monero",
                cause = error
            )
        } catch (error: IOException) {
            MoneroPaymentResult.Error(
                kind = MoneroPaymentResult.Error.Kind.Network,
                message = error.message ?: "Errore di rete verso il gateway Monero",
                cause = error
            )
        } catch (error: Throwable) {
            MoneroPaymentResult.Error(
                kind = MoneroPaymentResult.Error.Kind.Unknown,
                message = error.message ?: "Errore sconosciuto durante il pagamento Monero",
                cause = error
            )
        }
    }

    private fun normalizeBaseUrl(value: String): String = value.trimEnd('/') + "/"

    private fun formatAmount(amount: Double): String {
        require(amount > 0.0) { "L'importo XMR deve essere maggiore di zero" }
        return java.math.BigDecimal.valueOf(amount)
            .stripTrailingZeros()
            .toPlainString()
    }
}
