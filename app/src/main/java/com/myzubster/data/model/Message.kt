package com.myzubster.data.model

import com.google.gson.annotations.SerializedName

data class Message(
    @SerializedName("id") val id: String,
    @SerializedName("senderId") val senderId: String,
    @SerializedName("receiverId") val receiverId: String,
    @SerializedName("content") val content: String,
    @SerializedName("isRead") val isRead: Boolean = false,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("sender") val sender: User? = null,
    @SerializedName("receiver") val receiver: User? = null
)

data class SendMessageRequest(
    @SerializedName("receiverId") val receiverId: String,
    @SerializedName("content") val content: String
)

data class Conversation(
    @SerializedName("userId") val userId: String,
    @SerializedName("user") val user: User? = null,
    @SerializedName("lastMessage") val lastMessage: Message? = null,
    @SerializedName("unreadCount") val unreadCount: Int = 0
)