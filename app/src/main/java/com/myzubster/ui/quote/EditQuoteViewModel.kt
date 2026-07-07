package com.myzubster.ui.quote

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myzubster.data.model.Quote
import com.myzubster.data.model.QuoteUpdateRequest
import com.myzubster.network.ApiService
import com.myzubster.utils.TokenManager
import kotlinx.coroutines.launch
import retrofit2.Call

class EditQuoteViewModel(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _quote = MutableLiveData<Quote?>()
    val quote: LiveData<Quote?> = _quote

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _updateSuccess = MutableLiveData<Boolean>()
    val updateSuccess: LiveData<Boolean> = _updateSuccess

    fun setQuote(quote: Quote) {
        _quote.value = quote
    }

    fun updateQuote(quoteId: String, amount: Double?, description: String?, status: String?) {
        _isLoading.value = true
        _error.value = null
        _updateSuccess.value = false

        val token = tokenManager.getToken()
        if (token == null) {
            _error.value = "Token non disponibile. Effettua il login."
            _isLoading.value = false
            return
        }

        viewModelScope.launch {
            try {
                val request = QuoteUpdateRequest(
                    amount = amount,
                    description = description,
                    status = null,
                    professionalId = null
                )

                val call: Call<Quote> = apiService.updateQuote(
                    token = "Bearer $token",
                    quoteId = quoteId,
                    request = request
                )
                val response = call.execute()

                if (response.isSuccessful) {
                    _quote.value = response.body()
                    _updateSuccess.value = true
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
}