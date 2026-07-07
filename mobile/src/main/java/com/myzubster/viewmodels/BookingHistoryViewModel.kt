package com.myzubster.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.myzubster.models.BookingHistory

class BookingHistoryViewModel : ViewModel() {

    private val _bookings = MutableLiveData<List<BookingHistory>>()
    val bookings: LiveData<List<BookingHistory>> = _bookings

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun loadBookings() {
        _isLoading.value = true
        _error.value = null
        
        // TODO: Implementare il caricamento delle prenotazioni
        // Usa ApiClient.apiService per chiamare l'API
        
        _isLoading.value = false
    }

    fun loadMoreBookings() {
        // TODO: Implementare il caricamento di più prenotazioni
    }
}