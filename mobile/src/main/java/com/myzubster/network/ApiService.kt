package com.myzubster.network

import com.myzubster.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ============================================
    // AUTH ENDPOINTS
    // ============================================
    
    @POST("api/v1/auth/register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<AuthResponse>

    @POST("api/v1/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<AuthResponse>

    @POST("api/v1/auth/logout")
    suspend fun logout(
        @Header("Authorization") token: String
    ): Response<ApiResponse<Unit>>

    @POST("api/v1/auth/refresh")
    suspend fun refreshToken(
        @Body request: RefreshTokenRequest
    ): Response<AuthResponse>

    // ============================================
    // USER ENDPOINTS
    // ============================================
    
    @GET("api/v1/users/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): Response<UserResponse>

    @PUT("api/v1/users/me")
    suspend fun updateProfile(
        @Header("Authorization") token: String,
        @Body request: UpdateProfileRequest
    ): Response<UserResponse>

    @GET("api/v1/users/{userId}")
    suspend fun getUserById(
        @Path("userId") userId: String,
        @Header("Authorization") token: String
    ): Response<UserResponse>

    // ============================================
    // SKILL ENDPOINTS
    // ============================================
    
    @GET("api/v1/skills")
    suspend fun getSkills(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<SkillsResponse>

    @GET("api/v1/skills/{skillId}")
    suspend fun getSkillById(
        @Path("skillId") skillId: String
    ): Response<SkillResponse>

    @POST("api/v1/skills")
    suspend fun createSkill(
        @Header("Authorization") token: String,
        @Body request: CreateSkillRequest
    ): Response<SkillResponse>

    @GET("api/v1/skills/categories")
    suspend fun getSkillCategories(): Response<SkillCategoriesResponse>

    // ============================================
    // BOOKING ENDPOINTS
    // ============================================
    
    @POST("api/v1/bookings")
    suspend fun createBooking(
        @Header("Authorization") token: String,
        @Body request: CreateBookingRequest
    ): Response<BookingResponse>

    @GET("api/v1/bookings/{bookingId}")
    suspend fun getBookingById(
        @Path("bookingId") bookingId: String
    ): Response<BookingResponse>

    @GET("api/v1/bookings/user/{userId}")
    suspend fun getUserBookings(
        @Path("userId") userId: String,
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<BookingsResponse>

    @PUT("api/v1/bookings/{bookingId}/status")
    suspend fun updateBookingStatus(
        @Header("Authorization") token: String,
        @Path("bookingId") bookingId: String,
        @Body request: UpdateBookingStatusRequest
    ): Response<BookingResponse>

    @GET("api/v1/bookings/history/{userId}")
    suspend fun getBookingHistory(
        @Path("userId") userId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
        @Query("category") category: String? = null,
        @Query("status") status: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<BookingHistoryResponse>

    // ============================================
    // PAYMENT ENDPOINTS
    // ============================================
    
    @POST("api/v1/payments")
    suspend fun createPayment(
        @Header("Authorization") token: String,
        @Body request: CreatePaymentRequest
    ): Response<PaymentResponse>

    @GET("api/v1/payments/{paymentId}/status")
    suspend fun checkPaymentStatus(
        @Path("paymentId") paymentId: String,
        @Header("Authorization") token: String
    ): Response<PaymentStatusResponse>

    @POST("api/v1/payments/{paymentId}/release")
    suspend fun releasePayment(
        @Path("paymentId") paymentId: String,
        @Header("Authorization") token: String,
        @Body request: ReleasePaymentRequest
    ): Response<PaymentResponse>

    @POST("api/v1/payments/{paymentId}/complete-work")
    suspend fun completeWork(
        @Path("paymentId") paymentId: String,
        @Header("Authorization") token: String
    ): Response<PaymentResponse>

    @GET("api/v1/payments/user/{userId}")
    suspend fun getUserPayments(
        @Path("userId") userId: String,
        @Header("Authorization") token: String,
        @Query("role") role: String = "client"
    ): Response<ApiResponse<List<PaymentTransaction>>>

    // ============================================
    // REVIEWS
    // ============================================
    @POST("api/v1/reviews")
    suspend fun createReview(
        @Header("Authorization") token: String,
        @Body request: CreateReviewRequest
    ): Response<ReviewResponse>

    @GET("api/v1/reviews/user/{userId}")
    suspend fun getUserReviews(
        @Path("userId") userId: String,
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ReviewsResponse>

    @GET("api/v1/reviews/target/{targetId}")
    suspend fun getTargetReviews(
        @Path("targetId") targetId: String,
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ReviewsResponse>

    // ============================================
    // QUOTES - DA IMPLEMENTARE
    // ============================================
    // Endpoint quotes saranno aggiunti in futuro

    // ============================================
    // NOTIFICATIONS - DA IMPLEMENTARE
    // ============================================
    // Endpoint notifications saranno aggiunti in futuro
}