package com.myzubster.ui.notification

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myzubster.data.model.Notification
import com.myzubster.network.ApiService
import com.myzubster.network.RetrofitClient
import com.myzubster.utils.SessionManager
import kotlinx.coroutines.launch
import retrofit2.Call

class NotificationViewModel(
    private val sessionManager: SessionManager
) : ViewModel() {

    private val apiService: ApiService = RetrofitClient.instance

    private val _notifications = MutableLiveData<List<Notification>>()
    val notifications: LiveData<List<Notification>> = _notifications

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _unreadCount = MutableLiveData<Int>()
    val unreadCount: LiveData<Int> = _unreadCount

    private var currentFilter: String? = null
    private var currentReadFilter: Boolean? = null

    fun loadNotifications(
        limit: Int = 20,
        offset: Int = 0,
        type: String? = null,
        read: Boolean? = null
    ) {
        val userId = sessionManager.getUserId()
        if (userId == null) {
            _error.value = "Utente non autenticato"
            return
        }

        _isLoading.value = true
        _error.value = null

        currentFilter = type
        currentReadFilter = read

        viewModelScope.launch {
            try {
                val call: Call<List<Notification>> = apiService.getNotifications(
                    userId = userId,
                    limit = limit,
                    offset = offset,
                    type = type,
                    read = read
                )
                val response = call.execute()

                if (response.isSuccessful) {
                    val data = response.body() ?: emptyList()
                    _notifications.value = data
                    updateUnreadCount(data)
                } else {
                    _error.value = "Errore ${response.code()}: ${response.message()}"
                }
            } catch (e: Exception) {
                _error.value = "Errore di rete: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun markAsRead(notificationId: String) {
        val current = _notifications.value?.toMutableList()
        current?.find { it.id == notificationId }?.let {
            // Aggiornamento locale
        }
        _notifications.value = current
    }

    fun markAllAsRead() {
        val current = _notifications.value?.map { 
            it.copy(isRead = true) 
        }
        _notifications.value = current
        _unreadCount.value = 0
    }

    fun applyFilter(type: String? = null, read: Boolean? = null) {
        loadNotifications(type = type, read = read)
    }

    private fun updateUnreadCount(notifications: List<Notification>) {
        val count = notifications.count { !it.isRead }
        _unreadCount.value = count
    }
}