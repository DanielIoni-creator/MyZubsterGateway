package com.myzbuster.app.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

@Entity(tableName = "cached_users")
data class CachedUser(
    @PrimaryKey
    val id: String,
    val name: String,
    val email: String,
    val phoneNumber: String?,
    val address: String?,
    val rating: Double?,
    val skills: String?, // JSON array salvato come stringa
    val lastUpdated: Long = System.currentTimeMillis()
) {
    companion object {
        private val gson = Gson()
        
        fun fromUserData(userData: Map<String, Any>): CachedUser {
            val id = userData["id"] as? String ?: ""
            val name = userData["name"] as? String ?: ""
            val email = userData["email"] as? String ?: ""
            val phoneNumber = userData["phoneNumber"] as? String
            val address = userData["address"] as? String
            val rating = (userData["rating"] as? Number)?.toDouble()
            
            // Gestisci skills come List<String>
            val skillsJson = when (val skillsData = userData["skills"]) {
                is List<*> -> {
                    val stringList = skillsData.mapNotNull { it as? String }
                    gson.toJson(stringList)
                }
                is String -> skillsData
                else -> "[]"
            }
            
            return CachedUser(
                id = id,
                name = name,
                email = email,
                phoneNumber = phoneNumber,
                address = address,
                rating = rating,
                skills = skillsJson
            )
        }
    }
}