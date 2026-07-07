package com.myzubster.data.model

import com.google.gson.annotations.SerializedName

data class Skill(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("category") val category: String,
    @SerializedName("price") val price: Double? = null,
    @SerializedName("userId") val userId: String,
    @SerializedName("user") val user: User? = null,
    @SerializedName("isActive") val isActive: Boolean = true,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String?
)

data class CreateSkillRequest(
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("category") val category: String,
    @SerializedName("price") val price: Double? = null
)

data class UpdateSkillRequest(
    @SerializedName("title") val title: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("category") val category: String? = null,
    @SerializedName("price") val price: Double? = null,
    @SerializedName("isActive") val isActive: Boolean? = null
)