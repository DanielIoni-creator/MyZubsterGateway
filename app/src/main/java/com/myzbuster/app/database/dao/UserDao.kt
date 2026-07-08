package com.myzbuster.app.database.dao

import androidx.room.*
import com.myzbuster.app.database.entities.CachedUser
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM cached_users WHERE id = :userId")
    fun getUser(userId: String): Flow<CachedUser?>
    
    @Query("SELECT * FROM cached_users")
    fun getAllUsers(): Flow<List<CachedUser>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: CachedUser)
    
    @Update
    suspend fun updateUser(user: CachedUser)
    
    @Delete
    suspend fun deleteUser(user: CachedUser)
    
    @Query("DELETE FROM cached_users")
    suspend fun deleteAllUsers()
    
    @Query("SELECT * FROM cached_users WHERE id = :userId")
    suspend fun getUserSync(userId: String): CachedUser?
}