package com.myzubster.data.model

import com.google.gson.annotations.SerializedName
import java.util.Date

data class Notification(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("userId")
    val userId: String,
    
    @SerializedName("title")
    val title: String,
    
    @SerializedName("message")
    val message: String,
    
    @SerializedName("type")
    val type: NotificationType,
    
    @SerializedName("data")
    val data: Map<String, String>? = null,
    
    @SerializedName("isRead")
    val isRead: Boolean = false,
    
    @SerializedName("createdAt")
    val createdAt: Date,
    
    @SerializedName("updatedAt")
    val updatedAt: Date?
)

enum class NotificationType {
    @SerializedName("quote_received")
    QUOTE_RECEIVED,
    
    @SerializedName("quote_accepted")
    QUOTE_ACCEPTED,
    
    @SerializedName("quote_rejected")
    QUOTE_REJECTED,
    
    @SerializedName("booking_updated")
    BOOKING_UPDATED,
    
    @SerializedName("booking_completed")
    BOOKING_COMPLETED,
    
    @SerializedName("message_received")
    MESSAGE_RECEIVED,
    
    @SerializedName("system")
    SYSTEM,
    
    @SerializedName("promotion")
    PROMOTION
}