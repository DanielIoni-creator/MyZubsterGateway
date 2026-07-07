package com.myzubster.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider

class BookingHistoryViewModelFactory : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(BookingHistoryViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return BookingHistoryViewModel() as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}