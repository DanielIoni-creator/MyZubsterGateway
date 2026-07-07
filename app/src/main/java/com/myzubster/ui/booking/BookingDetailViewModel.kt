package com.myzubster.ui.booking

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myzubster.data.model.Quote
import com.myzubster.network.ApiService
import kotlinx.coroutines.launch
import retrofit2.Call

class BookingDetailViewModel(private val apiService: ApiService) : ViewModel() {

    private val _quotes = MutableLiveData<List<Quote>>()
    val quotes: LiveData<List<Quote>> = _quotes

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun loadQuotes(bookingId: String) {
        _isLoading.value = true
        _error.value = null
        
        viewModelScope.launch {
            try {
                val call: Call<List<Quote>> = apiService.getQuotesByBookingId(bookingId)
                val response = call.execute()
                if (response.isSuccessful) {
                    _quotes.value = response.body() ?: emptyList()
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

    fun updateQuoteStatus(quote: Quote, accept: Boolean) {
        loadQuotes(quote.bookingId)
    }
}