package com.myzubster.models

data class User(
    val id: String,
    val name: String,
    val username: String,
    val email: String,
    val role: String,
    val avatar: String? = null,
    val bio: String? = null,
    val location: String? = null,
    val rating: Double? = null,
    val reviewsCount: Int = 0,
    val createdAt: String
)

data class UserResponse(
    val success: Boolean,
    val data: User? = null,
    val error: String? = null
)

data class UpdateProfileRequest(
    val name: String? = null,
    val username: String? = null,
    val email: String? = null,
    val avatar: String? = null,
    val bio: String? = null,
    val location: String? = null
)