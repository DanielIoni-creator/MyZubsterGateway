package com.myzubster.models

data class BookingHistory(
    val id: String? = null,
    val skillId: String? = null,
    val skillTitle: String? = null,
    val skillCategory: String? = null,
    val clientId: String? = null,
    val clientName: String? = null,
    val clientAvatar: String? = null,
    val professionalId: String? = null,
    val professionalName: String? = null,
    val professionalAvatar: String? = null,
    val date: String,
    val timeSlot: String,
    val amount: Double,
    val status: String? = null,
    val completedAt: String? = null,
    val createdAt: String
) {
    fun isPending(): Boolean = status == "pending"
    fun isConfirmed(): Boolean = status == "confirmed"
    fun isInProgress(): Boolean = status == "in_progress"
    fun isCompleted(): Boolean = status == "completed"
    fun isCancelled(): Boolean = status == "cancelled"
    
    fun getFormattedStatus(): String {
        return when (status) {
            "pending" -> "In attesa"
            "confirmed" -> "Confermata"
            "in_progress" -> "In corso"
            "completed" -> "Completata"
            "cancelled" -> "Cancellata"
            else -> "Sconosciuto"
        }
    }
    
    fun getStatusColor(): Int {
        return when (status) {
            "pending" -> android.R.color.holo_orange_light
            "confirmed" -> android.R.color.holo_blue_light
            "in_progress" -> android.R.color.holo_purple
            "completed" -> android.R.color.holo_green_light
            "cancelled" -> android.R.color.holo_red_light
            else -> android.R.color.darker_gray
        }
    }
}