package com.myzubster.data.model

import com.google.gson.annotations.SerializedName

data class NotificationRegisterRequest(
    @SerializedName("deviceToken")
    val deviceToken: String,
    
    @SerializedName("userId")
    val userId: String,
    
    @SerializedName("deviceType")
    val deviceType: String = "android",
    
    @SerializedName("deviceName")
    val deviceName: String? = null,
    
    @SerializedName("preferences")
    val preferences: NotificationPreferences? = null
)

data class NotificationPreferences(
    @SerializedName("newQuotes")
    val newQuotes: Boolean = true,
    
    @SerializedName("quoteAccepted")
    val quoteAccepted: Boolean = true,
    
    @SerializedName("bookingUpdates")
    val bookingUpdates: Boolean = true,
    
    @SerializedName("promotions")
    val promotions: Boolean = false
)