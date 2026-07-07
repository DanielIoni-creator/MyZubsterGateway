package com.myzubster.network

import com.myzubster.data.model.*
import retrofit2.Call
import retrofit2.http.*

interface ApiService {
    
    // ============================================================
    // 🔐 AUTH ENDPOINTS
    // ============================================================
    
    @POST("/auth/login")
    fun login(
        @Body request: LoginRequest
    ): Call<LoginResponse>
    
    @POST("/auth/register")
    fun register(
        @Body request: RegisterRequest
    ): Call<RegisterResponse>
    
    @POST("/auth/logout")
    fun logout(
        @Header("Authorization") token: String
    ): Call<Void>
    
    @POST("/auth/refresh")
    fun refreshToken(
        @Body request: RefreshTokenRequest
    ): Call<RefreshTokenResponse>
    
    // ============================================================
    // 👤 USER ENDPOINTS
    // ============================================================
    
    @GET("/users/me")
    fun getCurrentUser(
        @Header("Authorization") token: String
    ): Call<User>
    
    @PUT("/users/me")
    fun updateUser(
        @Header("Authorization") token: String,
        @Body request: UpdateUserRequest
    ): Call<User>
    
    @GET("/users/{userId}")
    fun getUserById(
        @Path("userId") userId: String
    ): Call<User>
    
    @GET("/users/search")
    fun searchUsers(
        @Query("query") query: String,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Call<List<User>>
    
    // ============================================================
    // 📋 SKILLS ENDPOINTS
    // ============================================================
    
    @GET("/skills")
    fun getSkills(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Call<List<Skill>>
    
    @GET("/skills/{skillId}")
    fun getSkillById(
        @Path("skillId") skillId: String
    ): Call<Skill>
    
    @POST("/skills")
    fun createSkill(
        @Header("Authorization") token: String,
        @Body request: CreateSkillRequest
    ): Call<Skill>
    
    @PUT("/skills/{skillId}")
    fun updateSkill(
        @Header("Authorization") token: String,
        @Path("skillId") skillId: String,
        @Body request: UpdateSkillRequest
    ): Call<Skill>
    
    @DELETE("/skills/{skillId}")
    fun deleteSkill(
        @Header("Authorization") token: String,
        @Path("skillId") skillId: String
    ): Call<Void>
    
    @GET("/users/{userId}/skills")
    fun getUserSkills(
        @Path("userId") userId: String
    ): Call<List<Skill>>
    
    // ============================================================
    // 📅 BOOKINGS ENDPOINTS
    // ============================================================
    
    @GET("/bookings")
    fun getBookings(
        @Query("userId") userId: String? = null,
        @Query("status") status: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Call<List<Booking>>
    
    @GET("/bookings/{bookingId}")
    fun getBookingById(
        @Path("bookingId") bookingId: String
    ): Call<Booking>
    
    @POST("/bookings")
    fun createBooking(
        @Header("Authorization") token: String,
        @Body request: CreateBookingRequest
    ): Call<Booking>
    
    @PUT("/bookings/{bookingId}")
    fun updateBooking(
        @Header("Authorization") token: String,
        @Path("bookingId") bookingId: String,
        @Body request: UpdateBookingRequest
    ): Call<Booking>
    
    @DELETE("/bookings/{bookingId}")
    fun deleteBooking(
        @Header("Authorization") token: String,
        @Path("bookingId") bookingId: String
    ): Call<Void>
    
    @GET("/bookings/history")
    fun getBookingHistory(
        @Query("userId") userId: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Call<List<Booking>>
    
    @GET("/bookings/{bookingId}/quotes")
    fun getBookingQuotes(
        @Path("bookingId") bookingId: String
    ): Call<List<Quote>>
    
    // ============================================================
    // 💬 QUOTES ENDPOINTS
    // ============================================================
    
    @GET("/quotes")
    fun getQuotes(
        @Query("bookingId") bookingId: String? = null,
        @Query("professionalId") professionalId: String? = null,
        @Query("status") status: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Call<List<Quote>>
    
    @GET("/quotes/{quoteId}")
    fun getQuoteById(
        @Path("quoteId") quoteId: String
    ): Call<Quote>
    
    @POST("/quotes")
    fun createQuote(
        @Header("Authorization") token: String,
        @Body request: CreateQuoteRequest
    ): Call<Quote>
    
    @PUT("/quotes/{quoteId}")
    fun updateQuote(
        @Header("Authorization") token: String,
        @Path("quoteId") quoteId: String,
        @Body request: QuoteUpdateRequest
    ): Call<Quote>
    
    @DELETE("/quotes/{quoteId}")
    fun deleteQuote(
        @Header("Authorization") token: String,
        @Path("quoteId") quoteId: String
    ): Call<Void>
    
    @POST("/quotes/{quoteId}/accept")
    fun acceptQuote(
        @Header("Authorization") token: String,
        @Path("quoteId") quoteId: String
    ): Call<Quote>
    
    @POST("/quotes/{quoteId}/reject")
    fun rejectQuote(
        @Header("Authorization") token: String,
        @Path("quoteId") quoteId: String
    ): Call<Quote>
    
    @GET("/quotes/booking/{bookingId}")
    fun getQuotesByBookingId(
        @Path("bookingId") bookingId: String
    ): Call<List<Quote>>
    
    // ============================================================
    // 💬 MESSAGES ENDPOINTS
    // ============================================================
    
    @GET("/messages")
    fun getMessages(
        @Query("userId") userId: String,
        @Query("contactId") contactId: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Call<List<Message>>
    
    @POST("/messages")
    fun sendMessage(
        @Header("Authorization") token: String,
        @Body request: SendMessageRequest
    ): Call<Message>
    
    @PUT("/messages/{messageId}/read")
    fun markMessageAsRead(
        @Header("Authorization") token: String,
        @Path("messageId") messageId: String
    ): Call<Void>
    
    @GET("/messages/conversations")
    fun getConversations(
        @Query("userId") userId: String
    ): Call<List<Conversation>>
    
    // ============================================================
    // 💰 PAYMENTS ENDPOINTS
    // ============================================================
    
    @POST("/payments/escrow")
    fun createEscrow(
        @Header("Authorization") token: String,
        @Body request: CreateEscrowRequest
    ): Call<Escrow>
    
    @GET("/payments/escrow/{escrowId}")
    fun getEscrow(
        @Path("escrowId") escrowId: String
    ): Call<Escrow>
    
    @POST("/payments/escrow/{escrowId}/fund")
    fun fundEscrow(
        @Header("Authorization") token: String,
        @Path("escrowId") escrowId: String,
        @Body request: FundEscrowRequest
    ): Call<Escrow>
    
    @POST("/payments/escrow/{escrowId}/release")
    fun releaseEscrow(
        @Header("Authorization") token: String,
        @Path("escrowId") escrowId: String
    ): Call<Escrow>
    
    @POST("/payments/escrow/{escrowId}/dispute")
    fun disputeEscrow(
        @Header("Authorization") token: String,
        @Path("escrowId") escrowId: String,
        @Body request: DisputeRequest
    ): Call<Escrow>
    
    @GET("/payments/transactions")
    fun getTransactions(
        @Query("userId") userId: String,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Call<List<Transaction>>
    
    // ============================================================
    // 🔔 NOTIFICATIONS ENDPOINTS
    // ============================================================
    
    @POST("/notifications/register")
    fun registerNotification(
        @Body request: NotificationRegisterRequest
    ): Call<NotificationRegisterResponse>
    
    @DELETE("/notifications/unregister")
    fun unregisterNotification(
        @Query("deviceToken") deviceToken: String
    ): Call<Void>
    
    @GET("/notifications/status")
    fun getNotificationStatus(
        @Query("userId") userId: String
    ): Call<NotificationRegisterResponse>
    
    @GET("/notifications")
    fun getNotifications(
        @Query("userId") userId: String,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
        @Query("type") type: String? = null,
        @Query("read") read: Boolean? = null
    ): Call<List<Notification>>
    
    @PUT("/notifications/{notificationId}/read")
    fun markNotificationAsRead(
        @Header("Authorization") token: String,
        @Path("notificationId") notificationId: String
    ): Call<Void>
    
    @PUT("/notifications/read-all")
    fun markAllNotificationsAsRead(
        @Header("Authorization") token: String,
        @Query("userId") userId: String
    ): Call<Void>
    
    // ============================================================
    // 📊 REVIEWS ENDPOINTS
    // ============================================================
    
    @GET("/reviews")
    fun getReviews(
        @Query("userId") userId: String,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Call<List<Review>>
    
    @POST("/reviews")
    fun createReview(
        @Header("Authorization") token: String,
        @Body request: CreateReviewRequest
    ): Call<Review>
    
    @GET("/reviews/{reviewId}")
    fun getReviewById(
        @Path("reviewId") reviewId: String
    ): Call<Review>
    
    @PUT("/reviews/{reviewId}")
    fun updateReview(
        @Header("Authorization") token: String,
        @Path("reviewId") reviewId: String,
        @Body request: UpdateReviewRequest
    ): Call<Review>
    
    @DELETE("/reviews/{reviewId}")
    fun deleteReview(
        @Header("Authorization") token: String,
        @Path("reviewId") reviewId: String
    ): Call<Void>
    
    @GET("/users/{userId}/reviews")
    fun getUserReviews(
        @Path("userId") userId: String,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Call<List<Review>>
    
    // ============================================================
    // 🛠️ ADMIN ENDPOINTS
    // ============================================================
    
    @GET("/admin/users")
    fun getUsers(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
        @Query("search") search: String? = null
    ): Call<List<User>>
    
    @PUT("/admin/users/{userId}/status")
    fun updateUserStatus(
        @Header("Authorization") token: String,
        @Path("userId") userId: String,
        @Body request: UpdateUserStatusRequest
    ): Call<Void>
    
    @GET("/admin/reports")
    fun getReports(
        @Header("Authorization") token: String,
        @Query("status") status: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Call<List<Report>>
    
    @PUT("/admin/reports/{reportId}/resolve")
    fun resolveReport(
        @Header("Authorization") token: String,
        @Path("reportId") reportId: String,
        @Body request: ResolveReportRequest
    ): Call<Void>
    
    @GET("/admin/stats")
    fun getAdminStats(
        @Header("Authorization") token: String
    ): Call<AdminStats>
    
    @GET("/admin/activity-logs")
    fun getActivityLogs(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Call<List<ActivityLog>>
}