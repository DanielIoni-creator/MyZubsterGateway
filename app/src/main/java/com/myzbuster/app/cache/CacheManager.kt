package com.myzbuster.app.cache

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.util.Date

/**
 * Strategie di caching
 */
enum class CacheStrategy {
    CACHE_FIRST,
    NETWORK_FIRST,
    CACHE_ONLY,
    NETWORK_ONLY,
    CACHE_IF_AVAILABLE
}

/**
 * Politiche di validità della cache
 */
enum class CacheValidity {
    PERMANENT,
    SHORT_TERM,
    MEDIUM_TERM,
    LONG_TERM,
    DAY
}

/**
 * Estensione per ottenere il tempo di validità in millisecondi
 */
fun CacheValidity.getValidityMillis(): Long {
    return when (this) {
        CacheValidity.PERMANENT -> Long.MAX_VALUE
        CacheValidity.SHORT_TERM -> 5 * 60 * 1000
        CacheValidity.MEDIUM_TERM -> 30 * 60 * 1000
        CacheValidity.LONG_TERM -> 60 * 60 * 1000
        CacheValidity.DAY -> 24 * 60 * 60 * 1000
    }
}

/**
 * Gestore centrale della cache - VERSIONE SEMPLIFICATA E FUNZIONANTE
 */
class CacheManager(private val context: Context) {
    
    private val prefs: SharedPreferences = context.getSharedPreferences("myzubster_cache", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val memoryCache = mutableMapOf<String, String>() // Salva JSON in memoria
    
    /**
     * Salva un oggetto in cache
     */
    suspend fun put(key: String, value: Any, validity: CacheValidity = CacheValidity.MEDIUM_TERM) {
        val entry = CacheEntry(
            data = value,
            timestamp = Date().time,
            validity = validity.getValidityMillis()
        )
        
        try {
            val json = gson.toJson(entry)
            memoryCache[key] = json
            prefs.edit().putString(key, json).apply()
        } catch (e: Exception) {
            // Errore di serializzazione
        }
    }
    
    /**
     * Recupera un oggetto dalla cache
     */
    suspend fun <T> get(key: String, clazz: Class<T>): T? {
        // Prova dalla memoria
        val memJson = memoryCache[key]
        if (memJson != null) {
            try {
                val type = TypeToken.getParameterized(CacheEntry::class.java, clazz).type
                val entry: CacheEntry<T> = gson.fromJson(memJson, type)
                if (!isEntryExpired(entry)) {
                    return entry.data
                } else {
                    memoryCache.remove(key)
                }
            } catch (e: Exception) {
                // Errore di parsing
            }
        }
        
        // Prova dal disco
        val json = prefs.getString(key, null) ?: return null
        return try {
            val type = TypeToken.getParameterized(CacheEntry::class.java, clazz).type
            val entry: CacheEntry<T> = gson.fromJson(json, type)
            if (!isEntryExpired(entry)) {
                memoryCache[key] = json
                entry.data
            } else {
                prefs.edit().remove(key).apply()
                null
            }
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Verifica se una chiave esiste in cache
     */
    suspend fun contains(key: String): Boolean {
        return memoryCache.containsKey(key) || prefs.contains(key)
    }
    
    /**
     * Rimuove un elemento dalla cache
     */
    suspend fun remove(key: String) {
        memoryCache.remove(key)
        prefs.edit().remove(key).apply()
    }
    
    /**
     * Svuota tutta la cache
     */
    suspend fun clear() {
        memoryCache.clear()
        prefs.edit().clear().apply()
    }
    
    /**
     * Verifica se un entry è scaduta
     */
    private fun isEntryExpired(entry: CacheEntry<*>): Boolean {
        val elapsed = Date().time - entry.timestamp
        return elapsed > entry.validity
    }
    
    /**
     * Entry della cache
     */
    data class CacheEntry<T>(
        val data: T,
        val timestamp: Long,
        val validity: Long
    )
}