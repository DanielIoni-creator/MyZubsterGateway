package com.myzubster

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.myzubster.activities.BookingHistoryActivity
import com.myzubster.network.RetrofitClient
import com.myzubster.ui.auth.LoginActivity
import com.myzubster.utils.SessionManager
import com.myzubster.utils.TokenManager

class MainActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var sessionManager: SessionManager
    private lateinit var tvSessionTimer: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Inizializza TokenManager e SessionManager
        tokenManager = RetrofitClient.getTokenManager()
        sessionManager = SessionManager(this)

        // Controlla se l'utente è loggato
        if (!tokenManager.isLoggedIn()) {
            goToLogin()
            return
        }

        // Inizializza le view
        tvSessionTimer = findViewById(R.id.tvSessionTimer)
        val btnTest = findViewById<Button>(R.id.btnTest)
        val btnBookingHistory = findViewById<Button>(R.id.btnBookingHistory)
        val btnSettings = findViewById<Button>(R.id.btnSettings)
        val btnLogout = findViewById<Button>(R.id.btnLogout)

        // Avvia il monitoraggio della sessione
        sessionManager.startSessionMonitoring {
            runOnUiThread {
                Toast.makeText(this, "⏰ Sessione scaduta. Effettua di nuovo il login.", Toast.LENGTH_LONG).show()
                logout()
            }
        }

        // Avvia il countdown della sessione
        sessionManager.getSessionCountdown { time ->
            runOnUiThread {
                tvSessionTimer.text = "⏱️ Sessione: $time"
            }
        }

        // Setup listener
        btnTest.setOnClickListener {
            Toast.makeText(this, "✅ App funzionante!", Toast.LENGTH_SHORT).show()
        }

        btnBookingHistory.setOnClickListener {
            val userId = tokenManager.getUserId() ?: "65f1a2b3c4d5e6f7g8h9i0j1"
            val intent = Intent(this, BookingHistoryActivity::class.java)
            intent.putExtra("userId", userId)
            startActivity(intent)
        }

        btnSettings.setOnClickListener {
            Toast.makeText(this, "⚙️ Impostazioni", Toast.LENGTH_SHORT).show()
        }

        btnLogout.setOnClickListener {
            logout()
        }
    }

    private fun logout() {
        sessionManager.logout()
        Toast.makeText(this, "🚪 Logout effettuato", Toast.LENGTH_SHORT).show()
        goToLogin()
    }

    private fun goToLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        sessionManager.stopSessionMonitoring()
    }
}