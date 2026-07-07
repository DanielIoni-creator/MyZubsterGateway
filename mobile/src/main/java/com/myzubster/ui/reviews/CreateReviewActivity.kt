package com.myzubster.ui.reviews

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import com.myzubster.R
import com.myzubster.models.CreateReviewRequest
import com.myzubster.network.RetrofitClient
import com.myzubster.utils.TokenManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class CreateReviewActivity : AppCompatActivity() {

    private lateinit var toolbar: Toolbar
    private lateinit var tvServiceName: TextView
    private lateinit var starContainer: LinearLayout
    private lateinit var tvRatingLabel: TextView
    private lateinit var etComment: EditText
    private lateinit var btnSubmit: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var tvError: TextView

    private val stars = mutableListOf<ImageView>()
    private var selectedRating = 0
    private var bookingId: String = ""
    private var targetId: String = ""
    private var serviceName: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_review)

        // Ottieni i dati dall'intent
        bookingId = intent.getStringExtra("bookingId") ?: ""
        targetId = intent.getStringExtra("targetId") ?: ""
        serviceName = intent.getStringExtra("serviceName") ?: "Servizio"

        initViews()
        setupToolbar()
        setupStars()
        setupListeners()
    }

    private fun initViews() {
        toolbar = findViewById(R.id.toolbar)
        tvServiceName = findViewById(R.id.tvServiceName)
        starContainer = findViewById(R.id.starContainer)
        tvRatingLabel = findViewById(R.id.tvRatingLabel)
        etComment = findViewById(R.id.etComment)
        btnSubmit = findViewById(R.id.btnSubmitReview)
        progressBar = findViewById(R.id.progressBar)
        tvError = findViewById(R.id.tvError)

        tvServiceName.text = serviceName

        // Inizializza le stelle
        stars.add(findViewById(R.id.star1))
        stars.add(findViewById(R.id.star2))
        stars.add(findViewById(R.id.star3))
        stars.add(findViewById(R.id.star4))
        stars.add(findViewById(R.id.star5))
    }

    private fun setupToolbar() {
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        toolbar.setNavigationOnClickListener {
            finish()
        }
    }

    private fun setupStars() {
        stars.forEachIndexed { index, star ->
            star.setOnClickListener {
                selectedRating = index + 1
                updateStars()
                updateRatingLabel()
            }
        }
    }

    private fun updateStars() {
        stars.forEachIndexed { index, star ->
            if (index < selectedRating) {
                star.setImageResource(R.drawable.ic_star_filled)
            } else {
                star.setImageResource(R.drawable.ic_star_empty)
            }
        }
    }

    private fun updateRatingLabel() {
        val labels = arrayOf(
            "Seleziona un voto",
            "⭐ Pessimo",
            "⭐ Insufficiente",
            "⭐ Sufficiente",
            "⭐ Buono",
            "⭐ Ottimo!"
        )
        tvRatingLabel.text = labels[selectedRating]
    }

    private fun setupListeners() {
        btnSubmit.setOnClickListener {
            submitReview()
        }
    }

    private fun submitReview() {
        val comment = etComment.text.toString().trim()

        if (selectedRating == 0) {
            tvError.text = "Seleziona una valutazione"
            tvError.visibility = View.VISIBLE
            return
        }

        if (comment.isEmpty()) {
            tvError.text = "Scrivi un commento"
            tvError.visibility = View.VISIBLE
            return
        }

        tvError.visibility = View.GONE
        showLoading(true)

        val tokenManager = TokenManager(this)
        val token = tokenManager.getToken()

        if (token.isNullOrEmpty()) {
            Toast.makeText(this, "Token non valido", Toast.LENGTH_SHORT).show()
            showLoading(false)
            return
        }

        val request = CreateReviewRequest(
            bookingId = bookingId,
            targetId = targetId,
            rating = selectedRating,
            comment = comment
        )

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = RetrofitClient.apiService.createReview(
                    token = "Bearer $token",
                    request = request
                )

                withContext(Dispatchers.Main) {
                    showLoading(false)
                    if (response.isSuccessful && response.body()?.success == true) {
                        Toast.makeText(
                            this@CreateReviewActivity,
                            "✅ Recensione inviata!",
                            Toast.LENGTH_LONG
                        ).show()
                        finish()
                    } else {
                        tvError.text = response.body()?.error ?: "Errore durante l'invio"
                        tvError.visibility = View.VISIBLE
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    showLoading(false)
                    tvError.text = "Errore di connessione: ${e.message}"
                    tvError.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun showLoading(isLoading: Boolean) {
        btnSubmit.isEnabled = !isLoading
        btnSubmit.text = if (isLoading) "" else "Invia Recensione"
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
    }
}