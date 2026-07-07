package com.myzubster.ui.reviews

import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.myzubster.R
import com.myzubster.adapters.reviews.ReviewAdapter
import com.myzubster.models.Review
import com.myzubster.network.RetrofitClient
import com.myzubster.utils.TokenManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class UserReviewsActivity : AppCompatActivity() {

    private lateinit var toolbar: Toolbar
    private lateinit var recyclerView: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvEmpty: TextView
    private lateinit var tvError: TextView
    private lateinit var tvAverageRating: TextView
    private lateinit var tvReviewCount: TextView
    private val stars = mutableListOf<ImageView>()

    private lateinit var adapter: ReviewAdapter
    private var reviews = listOf<Review>()
    private var userId: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_user_reviews)

        userId = intent.getStringExtra("userId") ?: ""

        initViews()
        setupToolbar()
        setupRecyclerView()
        loadReviews()
    }

    private fun initViews() {
        toolbar = findViewById(R.id.toolbar)
        recyclerView = findViewById(R.id.recyclerView)
        progressBar = findViewById(R.id.progressBar)
        tvEmpty = findViewById(R.id.tvEmpty)
        tvError = findViewById(R.id.tvError)
        tvAverageRating = findViewById(R.id.tvAverageRating)
        tvReviewCount = findViewById(R.id.tvReviewCount)

        stars.add(findViewById(R.id.star1))
        stars.add(findViewById(R.id.star2))
        stars.add(findViewById(R.id.star3))
        stars.add(findViewById(R.id.star4))
        stars.add(findViewById(R.id.star5))
    }

    private fun setupToolbar() {
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Recensioni"
        toolbar.setNavigationOnClickListener {
            finish()
        }
    }

    private fun setupRecyclerView() {
        adapter = ReviewAdapter(reviews) { review ->
            Toast.makeText(this, "Recensione: ${review.rating} stelle", Toast.LENGTH_SHORT).show()
        }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
    }

    private fun loadReviews() {
        progressBar.visibility = View.VISIBLE
        tvError.visibility = View.GONE

        val tokenManager = TokenManager(this)
        val token = tokenManager.getToken()

        if (token.isNullOrEmpty()) {
            showError("Token non valido")
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = RetrofitClient.apiService.getUserReviews(
                    userId = userId,
                    token = "Bearer $token",
                    page = 1,
                    limit = 20
                )

                withContext(Dispatchers.Main) {
                    progressBar.visibility = View.GONE
                    if (response.isSuccessful && response.body()?.success == true) {
                        reviews = response.body()?.data ?: emptyList()
                        updateUI()
                    } else {
                        showError(response.body()?.error ?: "Errore durante il caricamento")
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    progressBar.visibility = View.GONE
                    showError("Errore di connessione: ${e.message}")
                }
            }
        }
    }

    private fun updateUI() {
        if (reviews.isEmpty()) {
            tvEmpty.visibility = View.VISIBLE
            recyclerView.visibility = View.GONE
            tvAverageRating.text = "0.0"
            tvReviewCount.text = "0 recensioni"
            return
        }

        tvEmpty.visibility = View.GONE
        recyclerView.visibility = View.VISIBLE

        // Calcola media
        val average = reviews.map { it.rating }.average()
        tvAverageRating.text = String.format("%.1f", average)
        tvReviewCount.text = "${reviews.size} recensioni"

        // Aggiorna stelle medie
        val roundedAverage = average.toInt()
        stars.forEachIndexed { index, star ->
            if (index < roundedAverage) {
                star.setImageResource(R.drawable.ic_star_filled)
            } else {
                star.setImageResource(R.drawable.ic_star_empty)
            }
        }

        // Aggiorna adapter
        adapter = ReviewAdapter(reviews) { review ->
            Toast.makeText(this, "Recensione: ${review.rating} stelle", Toast.LENGTH_SHORT).show()
        }
        recyclerView.adapter = adapter
        adapter.notifyDataSetChanged()
    }

    private fun showError(message: String) {
        tvError.text = message
        tvError.visibility = View.VISIBLE
        recyclerView.visibility = View.GONE
        tvEmpty.visibility = View.GONE
    }
}