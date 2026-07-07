package com.myzubster.data.model

import com.google.gson.annotations.SerializedName

data class NotificationRegisterResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("message")
    val message: String? = null,
    
    @SerializedName("registrationId")
    val registrationId: String? = null,
    
    @SerializedName("deviceToken")
    val deviceToken: String? = null,
    
    @SerializedName("isRegistered")
    val isRegistered: Boolean? = null
)