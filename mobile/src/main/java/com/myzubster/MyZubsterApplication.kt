package com.myzubster

import android.app.Application
import com.myzubster.network.RetrofitClient

class MyZubsterApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Inizializza Retrofit con il contesto
        RetrofitClient.initialize(applicationContext)
    }
}