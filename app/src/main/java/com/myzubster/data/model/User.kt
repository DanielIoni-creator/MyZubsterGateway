package com.myzubster.data.model

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("role") val role: String,
    @SerializedName("bio") val bio: String? = null,
    @SerializedName("avatar") val avatar: String? = null,
    @SerializedName("location") val location: String? = null,
    @SerializedName("rating") val rating: Double? = null,
    @SerializedName("reviewsCount") val reviewsCount: Int = 0,
    @SerializedName("isVerified") val isVerified: Boolean = false,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String?
)

data class UpdateUserRequest(
    @SerializedName("name") val name: String? = null,
    @SerializedName("bio") val bio: String? = null,
    @SerializedName("avatar") val avatar: String? = null,
    @SerializedName("location") val location: String? = null
)