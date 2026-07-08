package com.myzbuster.app.cache

import android.content.Context
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

/**
 * Interceptor per gestire la cache a livello HTTP
 * Funziona insieme a CacheManager per una cache più intelligente
 */
class CacheInterceptor(private val context: Context) : Interceptor {
    
    companion object {
        private const val CACHE_CONTROL_HEADER = "Cache-Control"
        private const val MAX_AGE = 60 * 60 * 24 // 24 ore
    }
    
    @Throws(IOException::class)
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        
        // Se siamo offline, usa la cache
        if (!isNetworkAvailable()) {
            val cacheRequest = request.newBuilder()
                .header(CACHE_CONTROL_HEADER, "only-if-cached, max-stale=$MAX_AGE")
                .build()
            return chain.proceed(cacheRequest)
        }
        
        // Online: usa cache con validità
        val response = chain.proceed(request)
        
        // Aggiungi header per caching
        return response.newBuilder()
            .header(CACHE_CONTROL_HEADER, "public, max-age=$MAX_AGE")
            .build()
    }
    
    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
        val networkInfo = connectivityManager.activeNetworkInfo
        return networkInfo != null && networkInfo.isConnected
    }
}