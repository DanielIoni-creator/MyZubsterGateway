package com.myzbuster.app.repository

import android.content.Context
import com.myzbuster.app.cache.CacheManager
import com.myzbuster.app.cache.CacheValidity
import com.myzbuster.app.database.AppDatabase
import com.myzbuster.app.database.entities.CachedUser

class OfflineCapableRepository(
    private val context: Context,
    private val cacheManager: CacheManager
) {
    
    private val database = AppDatabase.getInstance(context)
    private val userDao = database.userDao()
    
    suspend fun saveUserData(userData: Map<String, Any>) {
        val userId = userData["id"] as? String ?: "current_user"
        
        // Versione corretta: solo 3 parametri
        cacheManager.put(
            key = "user_profile_$userId",
            value = userData,
            validity = CacheValidity.MEDIUM_TERM
        )
        
        val cachedUser = CachedUser.fromUserData(userData)
        userDao.insertUser(cachedUser)
    }
    
    suspend fun getUserData(userId: String = "current_user"): Map<String, Any>? {
        @Suppress("UNCHECKED_CAST")
        return cacheManager.get("user_profile_$userId", Map::class.java) as? Map<String, Any>
    }
    
    suspend fun hasUserData(userId: String = "current_user"): Boolean {
        return cacheManager.contains("user_profile_$userId")
    }
    
    suspend fun clearUserCache() {
        val userId = "current_user"
        cacheManager.remove("user_profile_$userId")
        userDao.deleteAllUsers()
    }
}