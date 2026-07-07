package com.myzubster.ui.quote

import android.os.Bundle
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.google.android.material.textfield.TextInputEditText
import com.myzubster.R
import com.myzubster.network.RetrofitClient
import com.myzubster.utils.TokenManager

class EditQuoteActivity : AppCompatActivity() {

    private lateinit var viewModel: EditQuoteViewModel
    private lateinit var tvQuoteId: TextView
    private lateinit var etAmount: TextInputEditText
    private lateinit var etDescription: TextInputEditText
    private lateinit var btnSave: Button
    private lateinit var btnCancel: Button
    private lateinit var progressBar: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit_quote)

        initViews()
        initViewModel()

        val quoteId = intent.getStringExtra("QUOTE_ID") ?: run {
            Toast.makeText(this, "ID preventivo mancante", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        tvQuoteId.text = "ID: $quoteId"
        setupListeners(quoteId)
        observeViewModel()
    }

    private fun initViews() {
        tvQuoteId = findViewById(R.id.tvQuoteId)
        etAmount = findViewById(R.id.etAmount)
        etDescription = findViewById(R.id.etDescription)
        btnSave = findViewById(R.id.btnSave)
        btnCancel = findViewById(R.id.btnCancel)
        progressBar = findViewById(R.id.progressBar)
    }

    private fun initViewModel() {
        val apiService = RetrofitClient.instance
        val tokenManager = TokenManager(this)
        viewModel = ViewModelProvider(
            this,
            object : ViewModelProvider.Factory {
                override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return EditQuoteViewModel(apiService, tokenManager) as T
                }
            }
        )[EditQuoteViewModel::class.java]
    }

    private fun setupListeners(quoteId: String) {
        btnSave.setOnClickListener {
            val amountText = etAmount.text.toString()
            val amount = if (amountText.isNotEmpty()) amountText.toDoubleOrNull() else null
            val description = etDescription.text.toString().takeIf { it.isNotEmpty() }

            if (amount == null && description == null) {
                Toast.makeText(this, "Nessuna modifica da salvare", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            viewModel.updateQuote(quoteId, amount, description, null)
        }

        btnCancel.setOnClickListener {
            finish()
        }
    }

    private fun observeViewModel() {
        viewModel.isLoading.observe(this) { loading ->
            progressBar.visibility = if (loading) android.view.View.VISIBLE else android.view.View.GONE
            btnSave.isEnabled = !loading
        }

        viewModel.error.observe(this) { error ->
            error?.let {
                Toast.makeText(this, it, Toast.LENGTH_LONG).show()
            }
        }

        viewModel.updateSuccess.observe(this) { success ->
            if (success) {
                Toast.makeText(this, "✅ Preventivo aggiornato!", Toast.LENGTH_LONG).show()
                setResult(RESULT_OK)
                finish()
            }
        }
    }
}