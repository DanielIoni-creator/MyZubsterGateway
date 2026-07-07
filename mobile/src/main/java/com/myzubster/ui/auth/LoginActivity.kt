package com.myzubster.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.myzubster.MainActivity
import com.myzubster.R
import com.myzubster.network.RetrofitClient
import com.myzubster.utils.SessionManager

class LoginActivity : AppCompatActivity() {

    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnLogin: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var tvError: TextView
    private lateinit var tvRegister: TextView
    private lateinit var tvForgotPassword: TextView
    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        // Inizializza SessionManager
        sessionManager = SessionManager(this)

        // Inizializza le view
        etEmail = findViewById(R.id.etEmail)
        etPassword = findViewById(R.id.etPassword)
        btnLogin = findViewById(R.id.btnLogin)
        progressBar = findViewById(R.id.progressBar)
        tvError = findViewById(R.id.tvError)
        tvRegister = findViewById(R.id.tvRegister)
        tvForgotPassword = findViewById(R.id.tvForgotPassword)

        // Setup listener
        btnLogin.setOnClickListener { performLogin() }
        tvRegister.setOnClickListener { goToRegister() }
        tvForgotPassword.setOnClickListener { showForgotPassword() }

        // Controlla se c'è già una sessione attiva
        val tokenManager = RetrofitClient.getTokenManager()
        if (tokenManager.isSessionValid()) {
            goToMain()
        }
    }

    private fun performLogin() {
        val email = etEmail.text.toString().trim()
        val password = etPassword.text.toString().trim()

        // Validazione
        if (email.isEmpty()) {
            etEmail.error = "Inserisci l'email"
            etEmail.requestFocus()
            return
        }

        if (password.isEmpty()) {
            etPassword.error = "Inserisci la password"
            etPassword.requestFocus()
            return
        }

        showLoading(true)
        tvError.visibility = View.GONE

        // Simula login (da sostituire con chiamata API reale)
        loginSimulated(email, password)
    }

    private fun loginSimulated(email: String, password: String) {
        btnLogin.postDelayed({
            showLoading(false)

            // Simula controllo credenziali
            if (email == "test@test.com" && password == "password") {
                // Simula token JWT
                val token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjFhMmIzYzRkNWU2ZjdnOGg5aTBqMSIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTY5MDAwMDAwMCwiZXhwIjoxNjkwMDgzNjAwfQ.test_signature"

                // Salva token e dati utente
                val tokenManager = RetrofitClient.getTokenManager()
                tokenManager.saveAuthData(
                    token = token,
                    userId = "65f1a2b3c4d5e6f7g8h9i0j1",
                    email = email,
                    name = "Test User",
                    role = "client",
                    expiresIn = 3600 // 1 ora
                )

                Toast.makeText(this, "✅ Login effettuato!", Toast.LENGTH_SHORT).show()
                goToMain()
            } else {
                tvError.text = "Email o password errati"
                tvError.visibility = View.VISIBLE
            }
        }, 1500)
    }

    private fun goToMain() {
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun goToRegister() {
        startActivity(Intent(this, RegisterActivity::class.java))
    }

    private fun showForgotPassword() {
        Toast.makeText(this, "🔑 Funzionalità in arrivo", Toast.LENGTH_SHORT).show()
    }

    private fun showLoading(isLoading: Boolean) {
        btnLogin.isEnabled = !isLoading
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        btnLogin.text = if (isLoading) "" else "ACCEDI"
    }
}