package com.myzubster.ui.notification

import android.content.Context
import android.provider.Settings
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myzubster.network.NotificationApiService
import com.myzubster.utils.SessionManager
import com.myzubster.utils.TokenManager
import kotlinx.coroutines.launch

class NotificationSettingsViewModel(
    private val context: Context
) : ViewModel() {

    private val sessionManager = SessionManager(context)
    private val tokenManager = TokenManager(context)
    private val notificationApi = NotificationApiService()

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _registrationStatus = MutableLiveData<String>()
    val registrationStatus: LiveData<String> = _registrationStatus

    private val _isRegistered = MutableLiveData<Boolean>()
    val isRegistered: LiveData<Boolean> = _isRegistered

    private val _deviceToken = MutableLiveData<String>()
    val deviceToken: LiveData<String> = _deviceToken

    init {
        // Genera un token univoco per il dispositivo
        val token = getDeviceToken()
        _deviceToken.value = token
        
        // Controlla se il token è già registrato
        val savedToken = tokenManager.getToken()
        _isRegistered.value = savedToken != null && savedToken == token
        _registrationStatus.value = if (_isRegistered.value == true) "✅ Registrato" else "❌ Non registrato"
        
        // Se l'utente è loggato, verifica lo stato dal server
        val userId = sessionManager.getUserId()
        if (userId != null) {
            checkStatusFromServer(userId)
        }
    }

    fun registerForNotifications() {
        _isLoading.value = true
        _error.value = null

        val userId = sessionManager.getUserId() ?: run {
            _error.value = "Utente non autenticato"
            _isLoading.value = false
            return
        }

        val deviceToken = _deviceToken.value ?: run {
            _error.value = "Token dispositivo non disponibile"
            _isLoading.value = false
            return
        }

        viewModelScope.launch {
            try {
                val response = notificationApi.registerDeviceToken(userId, deviceToken)
                
                if (response.ok) {
                    _isRegistered.value = true
                    _registrationStatus.value = "✅ Registrato"
                    tokenManager.saveToken(deviceToken)
                } else {
                    _error.value = response.message ?: "Registrazione fallita"
                }
            } catch (e: Exception) {
                _error.value = "Errore di rete: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun unregisterFromNotifications() {
        _isLoading.value = true
        _error.value = null

        val deviceToken = _deviceToken.value ?: run {
            _error.value = "Token dispositivo non disponibile"
            _isLoading.value = false
            return
        }

        viewModelScope.launch {
            try {
                val response = notificationApi.unregisterDeviceToken(deviceToken)
                
                if (response.ok) {
                    _isRegistered.value = false
                    _registrationStatus.value = "❌ Non registrato"
                    tokenManager.clearToken()
                } else {
                    _error.value = response.message ?: "Disregistrazione fallita"
                }
            } catch (e: Exception) {
                _error.value = "Errore di rete: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun checkStatusFromServer(userId: String) {
        viewModelScope.launch {
            try {
                val response = notificationApi.getNotificationStatus(userId)
                if (response.ok) {
                    _isRegistered.value = true
                    _registrationStatus.value = "✅ Registrato"
                }
            } catch (e: Exception) {
                // Ignora errori, lo stato locale è già impostato
            }
        }
    }

    private fun getDeviceToken(): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown_device"
    }
}