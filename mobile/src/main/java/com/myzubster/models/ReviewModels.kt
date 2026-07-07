package com.myzubster.models

data class Review(
    val id: String,
    val bookingId: String,
    val reviewerId: String,
    val targetId: String,
    val rating: Int,
    val comment: String,
    val createdAt: String,
    val updatedAt: String? = null
)

data class CreateReviewRequest(
    val bookingId: String,
    val targetId: String,
    val rating: Int,
    val comment: String
)

data class ReviewResponse(
    val success: Boolean,
    val data: Review? = null,
    val error: String? = null
)

data class ReviewsResponse(
    val success: Boolean,
    val data: List<Review>,
    val pagination: Pagination,
    val error: String? = null
)