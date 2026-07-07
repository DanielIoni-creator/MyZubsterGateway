package com.myzubster.data.model

import com.google.gson.annotations.SerializedName

data class AdminStats(
    @SerializedName("totalUsers") val totalUsers: Int,
    @SerializedName("totalBookings") val totalBookings: Int,
    @SerializedName("totalRevenue") val totalRevenue: Double,
    @SerializedName("pendingReviews") val pendingReviews: Int,
    @SerializedName("reportedUsers") val reportedUsers: Int,
    @SerializedName("activeUsers") val activeUsers: Int,
    @SerializedName("monthlyGrowth") val monthlyGrowth: Double
)

data class Report(
    @SerializedName("id") val id: String,
    @SerializedName("reporterId") val reporterId: String,
    @SerializedName("reportedId") val reportedId: String,
    @SerializedName("reason") val reason: String,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("resolvedAt") val resolvedAt: String? = null
)

data class UpdateUserStatusRequest(
    @SerializedName("status") val status: String
)

data class ResolveReportRequest(
    @SerializedName("action") val action: String,
    @SerializedName("note") val note: String? = null
)

data class ActivityLog(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("action") val action: String,
    @SerializedName("details") val details: String,
    @SerializedName("ipAddress") val ipAddress: String? = null,
    @SerializedName("createdAt") val createdAt: String
)