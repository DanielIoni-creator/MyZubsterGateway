package com.myzubster.network

import com.myzubster.data.model.Quote
import com.myzubster.data.model.QuoteUpdateRequest
import com.myzubster.data.model.NotificationRegisterRequest
import com.myzubster.data.model.NotificationRegisterResponse
import retrofit2.Call
import retrofit2.http.*

interface ApiService {
    
    // =============================================
    // QUOTES ENDPOINTS
    // =============================================
    
    // GET: Ottieni tutti i preventivi di una prenotazione
    @GET("/quotes/booking/{bookingId}")
    fun getQuotesByBookingId(@Path("bookingId") bookingId: String): Call<List<Quote>>
    
    // PUT: Aggiorna un preventivo esistente
    @PUT("/quotes/{quoteId}")
    fun updateQuote(
        @Path("quoteId") quoteId: String,
        @Body request: QuoteUpdateRequest
    ): Call<Quote>
    
    // =============================================
    // BOOKINGS ENDPOINTS
    // =============================================
    
    // GET: Ottieni storico prenotazioni
    @GET("/bookings/history")
    fun getBookingHistory(): Call<List<Any>>
    
    // =============================================
    // NOTIFICATIONS ENDPOINTS
    // =============================================
    
    // POST: Registra il dispositivo per le notifiche push
    @POST("/notifications/register")
    fun registerNotification(
        @Body request: NotificationRegisterRequest
    ): Call<NotificationRegisterResponse>
    
    // DELETE: Disregistra il dispositivo dalle notifiche
    @DELETE("/notifications/unregister")
    fun unregisterNotification(
        @Query("deviceToken") deviceToken: String
    ): Call<Void>
    
    // GET: Ottieni lo stato delle notifiche per un utente
    @GET("/notifications/status")
    fun getNotificationStatus(
        @Query("userId") userId: String
    ): Call<NotificationRegisterResponse>
    
    // =============================================
    // ALTRI ENDPOINT (DA AGGIUNGERE FUTURAMENTE)
    // =============================================
    
    // GET: Ottieni dettaglio di un singolo preventivo
    // @GET("/quotes/{quoteId}")
    // fun getQuoteById(@Path("quoteId") quoteId: String): Call<Quote>
    
    // DELETE: Elimina un preventivo
    // @DELETE("/quotes/{quoteId}")
    // fun deleteQuote(@Path("quoteId") quoteId: String): Call<Void>
    
    // POST: Crea un nuovo preventivo
    // @POST("/quotes")
    // fun createQuote(@Body request: QuoteCreateRequest): Call<Quote>
}