package com.myzubster.data.model

import com.google.gson.annotations.SerializedName

data class Review(
    @SerializedName("id") val id: String,
    @SerializedName("reviewerId") val reviewerId: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String?,
    @SerializedName("reviewer") val reviewer: User? = null,
    @SerializedName("user") val user: User? = null
)

data class CreateReviewRequest(
    @SerializedName("userId") val userId: String,
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String
)

data class UpdateReviewRequest(
    @SerializedName("rating") val rating: Int? = null,
    @SerializedName("comment") val comment: String? = null
)