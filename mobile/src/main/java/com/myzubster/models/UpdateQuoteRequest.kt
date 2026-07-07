package com.myzubster.models

data class UpdateQuoteRequest(
    val status: String // accepted, rejected, pending
)