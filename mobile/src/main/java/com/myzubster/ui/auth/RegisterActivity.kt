package com.myzubster.ui.auth

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.myzubster.R

class RegisterActivity : AppCompatActivity() {

    private lateinit var etName: EditText
    private lateinit var etEmail: EditText
    private lateinit var etUsername: EditText
    private lateinit var etPassword: EditText
    private lateinit var etConfirmPassword: EditText
    private lateinit var btnRegister: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var tvError: TextView
    private lateinit var tvLogin: TextView
    private lateinit var btnBack: ImageButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        etName = findViewById(R.id.etName)
        etEmail = findViewById(R.id.etEmail)
        etUsername = findViewById(R.id.etUsername)
        etPassword = findViewById(R.id.etPassword)
        etConfirmPassword = findViewById(R.id.etConfirmPassword)
        btnRegister = findViewById(R.id.btnRegister)
        progressBar = findViewById(R.id.progressBar)
        tvError = findViewById(R.id.tvError)
        tvLogin = findViewById(R.id.tvLogin)
        btnBack = findViewById(R.id.btnBack)

        btnRegister.setOnClickListener { performRegister() }
        tvLogin.setOnClickListener { goToLogin() }
        btnBack.setOnClickListener { finish() }
    }

    private fun performRegister() {
        val name = etName.text.toString().trim()
        val email = etEmail.text.toString().trim()
        val username = etUsername.text.toString().trim()
        val password = etPassword.text.toString().trim()
        val confirmPassword = etConfirmPassword.text.toString().trim()

        if (name.isEmpty()) {
            etName.error = "Inserisci il tuo nome"
            etName.requestFocus()
            return
        }

        if (email.isEmpty()) {
            etEmail.error = "Inserisci l'email"
            etEmail.requestFocus()
            return
        }

        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            etEmail.error = "Email non valida"
            etEmail.requestFocus()
            return
        }

        if (username.isEmpty()) {
            etUsername.error = "Scegli un username"
            etUsername.requestFocus()
            return
        }

        if (password.isEmpty()) {
            etPassword.error = "Inserisci una password"
            etPassword.requestFocus()
            return
        }

        if (password.length < 6) {
            etPassword.error = "La password deve essere almeno 6 caratteri"
            etPassword.requestFocus()
            return
        }

        if (password != confirmPassword) {
            etConfirmPassword.error = "Le password non coincidono"
            etConfirmPassword.requestFocus()
            return
        }

        showLoading(true)
        tvError.visibility = View.GONE

        registerSimulated()
    }

    private fun registerSimulated() {
        btnRegister.postDelayed({
            showLoading(false)
            Toast.makeText(this, "✅ Registrazione completata!", Toast.LENGTH_SHORT).show()
            goToLogin()
        }, 1500)
    }

    private fun goToLogin() {
        finish()
    }

    private fun showLoading(isLoading: Boolean) {
        btnRegister.isEnabled = !isLoading
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        btnRegister.text = if (isLoading) "" else "REGISTRATI"
    }
}