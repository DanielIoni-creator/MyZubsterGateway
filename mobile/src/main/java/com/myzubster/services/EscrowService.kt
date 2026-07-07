package com.myzubster.services

import com.myzubster.models.Escrow
import com.myzubster.models.EscrowRequest
import com.myzubster.models.EscrowResponse
import retrofit2.http.*

interface EscrowApi {
    @POST("/api/escrow/create")
    suspend fun createEscrow(@Body request: EscrowRequest): EscrowResponse

    @POST("/api/escrow/fund")
    suspend fun fundEscrow(@Body transactionId: Map<String, String>): EscrowResponse

    @POST("/api/escrow/release")
    suspend fun releaseEscrow(@Body transactionId: Map<String, String>): EscrowResponse

    @POST("/api/escrow/dispute")
    suspend fun disputeEscrow(@Body request: Map<String, String>): EscrowResponse

    @GET("/api/escrow/status/{transactionId}")
    suspend fun getEscrowStatus(@Path("transactionId") transactionId: String): EscrowResponse

    @GET("/api/escrow/user/{userId}")
    suspend fun getUserEscrows(@Path("userId") userId: String): EscrowListResponse
}

data class EscrowListResponse(
    val success: Boolean,
    val data: List<Escrow>?,
    val count: Int?,
    val error: String?
)

class EscrowService(private val api: EscrowApi) {

    suspend fun createEscrow(professionalId: String, amount: Double, description: String? = null): EscrowResponse {
        return api.createEscrow(EscrowRequest(professionalId, amount, description))
    }

    suspend fun fundEscrow(transactionId: String): EscrowResponse {
        return api.fundEscrow(mapOf("transactionId" to transactionId))
    }

    suspend fun releaseEscrow(transactionId: String): EscrowResponse {
        return api.releaseEscrow(mapOf("transactionId" to transactionId))
    }

    suspend fun disputeEscrow(transactionId: String, reason: String): EscrowResponse {
        return api.disputeEscrow(mapOf(
            "transactionId" to transactionId,
            "disputeReason" to reason
        ))
    }

    suspend fun getEscrowStatus(transactionId: String): EscrowResponse {
        return api.getEscrowStatus(transactionId)
    }

    suspend fun getUserEscrows(userId: String): EscrowListResponse {
        return api.getUserEscrows(userId)
    }
}