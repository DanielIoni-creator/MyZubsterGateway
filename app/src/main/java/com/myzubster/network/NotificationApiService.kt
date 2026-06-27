package com.myzubster.network

import com.myzubster.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

data class RegisterDeviceTokenRequest(
    val userId: String,
    val token: String,
    val platform: String = "android"
)

data class RegisterDeviceTokenResponse(
    val ok: Boolean,
    val userId: String? = null
)

private interface NotificationApi {
    @POST("api/notifications/register-token")
    suspend fun registerDeviceToken(@Body request: RegisterDeviceTokenRequest): RegisterDeviceTokenResponse
}

class NotificationApiService(
    baseUrl: String = BuildConfig.API_BASE_URL,
    okHttpClient: OkHttpClient? = null
) {
    private val api: NotificationApi

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
            .create(NotificationApi::class.java)
    }

    suspend fun registerDeviceToken(userId: String, token: String): RegisterDeviceTokenResponse =
        api.registerDeviceToken(RegisterDeviceTokenRequest(userId = userId, token = token))
}
