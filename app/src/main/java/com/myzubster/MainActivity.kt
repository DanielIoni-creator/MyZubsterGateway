package com.myzubster

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.myzubster.activities.LoginActivity
import com.myzubster.network.RetrofitClient
import com.myzubster.utils.SessionManager
import com.myzubster.utils.TokenManager
import android.content.Intent

class MainActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager
    private lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        sessionManager = SessionManager(this)
        tokenManager = TokenManager(this)

        // Verifica login
        if (!sessionManager.isLoggedIn()) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        } else {
            Toast.makeText(this, "Benvenuto!", Toast.LENGTH_SHORT).show()
        }
    }
}