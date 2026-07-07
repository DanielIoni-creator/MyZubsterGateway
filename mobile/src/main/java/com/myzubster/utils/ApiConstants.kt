package com.myzubster.utils

object ApiConstants {
    // ============================================================
    // BASE URL - Cambia in base al tuo ambiente di sviluppo
    // ============================================================
    
    // Per emulatore Android (localhost del computer host)
    const val BASE_URL = "http://10.0.2.2:5000/"
    
    // Per dispositivo fisico sulla stessa rete (sostituisci con il tuo IP)
    // const val BASE_URL = "http://192.168.1.100:5000/"
    
    // Per test su localhost (solo se usi un browser/Postman)
    // const val BASE_URL = "http://localhost:5000/"
    
    // ============================================================
    // ENDPOINTS
    // ============================================================
    
    object Auth {
        const val LOGIN = "api/auth/login"
        const val REGISTER = "api/auth/register"
        const val LOGOUT = "api/auth/logout"
    }
    
    object User {
        const val PROFILE = "api/users/me"
        const val UPDATE_PROFILE = "api/users/me"
    }
    
    object Booking {
        const val BASE = "api/bookings"
        const val HISTORY = "api/bookings/history"
        const val CREATE = "api/bookings"
        const val UPDATE_STATUS = "api/bookings/{id}/status"
    }
    
    object Skill {
        const val BASE = "api/skills"
        const val CREATE = "api/skills"
        const val CATEGORIES = "api/skills/categories"
    }
    
    object Payment {
        const val BASE = "api/payments"
        const val CREATE = "api/payments"
        const val VERIFY = "api/payments/verify"
    }
    
    object Review {
        const val BASE = "api/reviews"
        const val CREATE = "api/reviews"
    }
    
    // ============================================================
    // HEADERS
    // ============================================================
    
    const val HEADER_AUTHORIZATION = "Authorization"
    const val TOKEN_PREFIX = "Bearer "
    const val HEADER_CONTENT_TYPE = "Content-Type"
    const val CONTENT_TYPE_JSON = "application/json"
    
    // ============================================================
    // PREFERENCE KEYS
    // ============================================================
    
    object Prefs {
        const val NAME = "MyZubsterPrefs"
        const val KEY_USER_ID = "user_id"
        const val KEY_TOKEN = "auth_token"
        const val KEY_USER_NAME = "user_name"
        const val KEY_USER_EMAIL = "user_email"
        const val KEY_USER_AVATAR = "user_avatar"
    }
    
    // ============================================================
    // PAGINATION DEFAULTS
    // ============================================================
    
    const val DEFAULT_PAGE = 1
    const val DEFAULT_LIMIT = 10
    
    // ============================================================
    // BOOKING STATUS
    // ============================================================
    
    object BookingStatus {
        const val PENDING = "pending"
        const val CONFIRMED = "confirmed"
        const val IN_PROGRESS = "in_progress"
        const val COMPLETED = "completed"
        const val CANCELLED = "cancelled"
        
        fun getFormatted(status: String): String {
            return when (status) {
                PENDING -> "In attesa"
                CONFIRMED -> "Confermata"
                IN_PROGRESS -> "In corso"
                COMPLETED -> "Completata"
                CANCELLED -> "Annullata"
                else -> status
            }
        }
        
        fun getColor(status: String): Int {
            return when (status) {
                PENDING -> android.R.color.holo_orange_light
                CONFIRMED -> android.R.color.holo_blue_light
                IN_PROGRESS -> android.R.color.holo_purple
                COMPLETED -> android.R.color.holo_green_light
                CANCELLED -> android.R.color.holo_red_light
                else -> android.R.color.darker_gray
            }
        }
    }
}