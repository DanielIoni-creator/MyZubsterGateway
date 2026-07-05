package com.myzubster.network

import com.myzubster.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ==================== AUTH ENDPOINTS ====================
    
    @POST("api/auth/register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<AuthResponse>

    @POST("api/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<AuthResponse>

    @POST("api/auth/logout")
    suspend fun logout(
        @Header("Authorization") token: String
    ): Response<LogoutResponse>

    // ==================== USER ENDPOINTS ====================
    
    @GET("api/users/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): Response<UserResponse>

    @PUT("api/users/me")
    suspend fun updateProfile(
        @Header("Authorization") token: String,
        @Body request: UpdateProfileRequest
    ): Response<UserResponse>

    // ==================== SKILL ENDPOINTS ====================
    
    @GET("api/skills")
    suspend fun getSkills(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<SkillsResponse>

    @GET("api/skills/{skillId}")
    suspend fun getSkillById(
        @Path("skillId") skillId: String
    ): Response<SkillResponse>

    @POST("api/skills")
    suspend fun createSkill(
        @Header("Authorization") token: String,
        @Body request: CreateSkillRequest
    ): Response<SkillResponse>

    // ==================== BOOKING ENDPOINTS ====================
    
    @POST("api/bookings")
    suspend fun createBooking(
        @Header("Authorization") token: String,
        @Body request: CreateBookingRequest
    ): Response<BookingResponse>

    @GET("api/bookings/{bookingId}")
    suspend fun getBookingById(
        @Path("bookingId") bookingId: String
    ): Response<BookingResponse>

    @GET("api/bookings/user/{userId}")
    suspend fun getUserBookings(
        @Path("userId") userId: String,
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<BookingsResponse>

    @PUT("api/bookings/{bookingId}/status")
    suspend fun updateBookingStatus(
        @Header("Authorization") token: String,
        @Path("bookingId") bookingId: String,
        @Body request: UpdateBookingStatusRequest
    ): Response<BookingResponse>

    // ==================== BOOKING HISTORY ENDPOINT ====================
    
    @GET("api/bookings/history/{userId}")
    suspend fun getBookingHistory(
        @Path("userId") userId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
        @Query("category") category: String? = null,
        @Query("status") status: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<BookingHistoryResponse>

    // ==================== PAYMENT ENDPOINTS ====================
    
    @POST("api/payments")
    suspend fun createPayment(
        @Header("Authorization") token: String,
        @Body request: CreatePaymentRequest
    ): Response<PaymentResponse>

    @GET("api/payments/{paymentId}")
    suspend fun getPaymentById(
        @Path("paymentId") paymentId: String
    ): Response<PaymentResponse>

    @GET("api/payments/user/{userId}")
    suspend fun getUserPayments(
        @Path("userId") userId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaymentsResponse>

    // ==================== REVIEW ENDPOINTS ====================
    
    @POST("api/reviews")
    suspend fun createReview(
        @Header("Authorization") token: String,
        @Body request: CreateReviewRequest
    ): Response<ReviewResponse>

    @GET("api/reviews/user/{userId}")
    suspend fun getUserReviews(
        @Path("userId") userId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ReviewsResponse>

    @GET("api/reviews/skill/{skillId}")
    suspend fun getSkillReviews(
        @Path("skillId") skillId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ReviewsResponse>

    // ==================== ESCROW ENDPOINTS ====================
    
    @POST("api/escrow")
    suspend fun createEscrow(
        @Header("Authorization") token: String,
        @Body request: CreateEscrowRequest
    ): Response<EscrowResponse>

    @GET("api/escrow/{escrowId}")
    suspend fun getEscrowById(
        @Path("escrowId") escrowId: String
    ): Response<EscrowResponse>

    @PUT("api/escrow/{escrowId}/release")
    suspend fun releaseEscrow(
        @Header("Authorization") token: String,
        @Path("escrowId") escrowId: String
    ): Response<EscrowResponse>

    // ==================== QUOTE ENDPOINTS ====================
    
    @POST("api/quotes")
    suspend fun createQuote(
        @Header("Authorization") token: String,
        @Body request: CreateQuoteRequest
    ): Response<QuoteResponse>

    @GET("api/quotes/skill/{skillId}")
    suspend fun getQuotesForSkill(
        @Path("skillId") skillId: String
    ): Response<QuotesResponse>

    // ==================== CHAT ENDPOINTS ====================
    
    @GET("api/chats")
    suspend fun getUserChats(
        @Header("Authorization") token: String
    ): Response<ChatsResponse>

    @GET("api/chats/{chatId}/messages")
    suspend fun getChatMessages(
        @Header("Authorization") token: String,
        @Path("chatId") chatId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<MessagesResponse>

    @POST("api/chats/{chatId}/messages")
    suspend fun sendMessage(
        @Header("Authorization") token: String,
        @Path("chatId") chatId: String,
        @Body request: SendMessageRequest
    ): Response<MessageResponse>
}