package com.myzubster.models

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val username: String,
    val email: String,
    val password: String,
    val role: String = "client"
)

data class AuthResponse(
    val success: Boolean,
    val data: AuthData? = null,
    val error: String? = null
)

data class AuthData(
    val id: String,
    val name: String,
    val username: String,
    val email: String,
    val role: String,
    val token: String
)