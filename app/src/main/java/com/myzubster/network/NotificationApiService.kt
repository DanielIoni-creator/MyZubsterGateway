package com.myzubster.network

import com.myzubster.BuildConfig
import com.myzubster.data.model.NotificationRegisterRequest
import com.myzubster.data.model.NotificationRegisterResponse
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

// =============================================
// MODELLI DATI (inclusi qui per compatibilità)
// =============================================

data class RegisterDeviceTokenRequest(
    val userId: String,
    val token: String,
    val platform: String = "android"
)

data class RegisterDeviceTokenResponse(
    val ok: Boolean,
    val userId: String? = null,
    val message: String? = null
)

// =============================================
// INTERFACE RETROFIT
// =============================================

private interface NotificationApi {
    
    // Endpoint per registrare il token
    @POST("api/notifications/register-token")
    suspend fun registerDeviceToken(
        @Body request: RegisterDeviceTokenRequest
    ): RegisterDeviceTokenResponse
    
    // Endpoint per disregistrare il token
    @DELETE("api/notifications/unregister-token")
    suspend fun unregisterDeviceToken(
        @Query("token") token: String
    ): RegisterDeviceTokenResponse
    
    // Endpoint per verificare lo stato
    @GET("api/notifications/status")
    suspend fun getNotificationStatus(
        @Query("userId") userId: String
    ): RegisterDeviceTokenResponse
}

// =============================================
// SERVICE PRINCIPALE
// =============================================

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
            .addInterceptor(HttpLoggingInterceptor().apply { 
                level = HttpLoggingInterceptor.Level.BODY 
            })
            .build()

        api = Retrofit.Builder()
            .baseUrl(baseUrl.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(NotificationApi::class.java)
    }

    // Registra il dispositivo per le notifiche
    suspend fun registerDeviceToken(userId: String, token: String): RegisterDeviceTokenResponse =
        api.registerDeviceToken(
            RegisterDeviceTokenRequest(
                userId = userId,
                token = token,
                platform = "android"
            )
        )

    // Disregistra il dispositivo dalle notifiche
    suspend fun unregisterDeviceToken(token: String): RegisterDeviceTokenResponse =
        api.unregisterDeviceToken(token)

    // Ottieni lo stato delle notifiche
    suspend fun getNotificationStatus(userId: String): RegisterDeviceTokenResponse =
        api.getNotificationStatus(userId)
}