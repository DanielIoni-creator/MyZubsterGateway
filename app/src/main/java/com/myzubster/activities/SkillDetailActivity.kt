package com.myzubster.activities

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.RatingBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.myzubster.R
import com.myzubster.adapters.ReviewAdapter
import com.myzubster.models.Review
import com.myzubster.models.Skill
import com.myzubster.network.ApiService
import com.myzubster.ui.chat.ChatActivity
import com.myzubster.ui.reviews.ReviewDialog
import kotlinx.coroutines.launch
import java.util.Locale

class SkillDetailActivity : AppCompatActivity() {
    private val apiService: ApiService by lazy { ApiService.create() }
    private lateinit var reviewAdapter: ReviewAdapter
    private var publisherUserId: String? = null
    private var currentSkillId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_skill_detail)
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left)

        val skillId = intent.getStringExtra(EXTRA_SKILL_ID)
        if (skillId.isNullOrBlank()) {
            showError("ID competenza mancante")
            return
        }

        reviewAdapter = ReviewAdapter()
        findViewById<RecyclerView>(R.id.skillDetailReviewsRecyclerView).apply {
            layoutManager = LinearLayoutManager(this@SkillDetailActivity)
            adapter = reviewAdapter
        }

        findViewById<Button>(R.id.contactSellerButton).setOnClickListener {
            openChatWithPublisher()
        }
        findViewById<Button>(R.id.leaveReviewButton).setOnClickListener {
            openReviewDialog()
        }

        loadSkill(skillId)
    }

    private fun loadSkill(skillId: String) {
        currentSkillId = skillId
        setLoading(true)
        hideError()

        lifecycleScope.launch {
            runCatching { apiService.getSkillDetail(skillId) }
                .onSuccess { skill ->
                    setLoading(false)
                    bindSkill(skill)
                    loadReviews(skill.id)
                }
                .onFailure { error ->
                    setLoading(false)
                    showError(error.message ?: "Errore durante il caricamento della competenza")
                }
        }
    }

    private fun bindSkill(skill: Skill) {
        publisherUserId = skill.user.id

        findViewById<TextView>(R.id.skillDetailTitleText).text = skill.title
        findViewById<TextView>(R.id.skillDetailCategoryBadge).text = skill.category
        findViewById<TextView>(R.id.skillDetailTypeBadge).text = skill.type
        findViewById<TextView>(R.id.skillDetailDescriptionText).text = skill.description
        findViewById<TextView>(R.id.skillDetailPriceText).text = skill.displayPriceEur
            ?.let { "Prezzo: ${formatEur(it)}" }
            ?: "Prezzo: non indicato"
        findViewById<TextView>(R.id.skillDetailDistanceText).text = skill.distanceKm
            ?.let { "Distanza: ${String.format(Locale.US, "%.1f", it)} km" }
            ?: "Distanza: non disponibile"
        findViewById<TextView>(R.id.skillDetailAddressText).text = "Indirizzo: ${skill.address ?: "non disponibile"}"
        findViewById<TextView>(R.id.skillDetailUserNameText).text = skill.user.name
        findViewById<TextView>(R.id.skillDetailAvatarText).text = skill.user.name.firstOrNull()?.uppercaseChar()?.toString() ?: "👤"
        findViewById<RatingBar>(R.id.skillDetailUserRatingBar).rating = skill.user.rating.toFloat()
        findViewById<TextView>(R.id.skillDetailUserRatingText).text = if (skill.user.reviewCount > 0) {
            String.format(Locale.US, "%.1f (%d recensioni)", skill.user.rating, skill.user.reviewCount)
        } else {
            "Nessuna recensione"
        }
        findViewById<Button>(R.id.contactSellerButton).isEnabled = skill.user.id.isNotBlank()
        findViewById<Button>(R.id.leaveReviewButton).isEnabled = skill.user.id.isNotBlank()
    }

    private fun loadReviews(skillId: String) {
        setReviewsLoading(true)
        lifecycleScope.launch {
            runCatching { apiService.getReviewsForSkill(skillId) }
                .onSuccess { reviews ->
                    setReviewsLoading(false)
                    bindReviews(reviews)
                }
                .onFailure { error ->
                    setReviewsLoading(false)
                    findViewById<TextView>(R.id.skillDetailReviewsEmptyText).apply {
                        text = error.message ?: "Errore caricamento recensioni"
                        visibility = View.VISIBLE
                    }
                }
        }
    }

    private fun bindReviews(reviews: List<Review>) {
        reviewAdapter.submitList(reviews)
        findViewById<TextView>(R.id.skillDetailReviewsEmptyText).apply {
            text = "Ancora nessuna recensione"
            visibility = if (reviews.isEmpty()) View.VISIBLE else View.GONE
        }
    }

    private fun openChatWithPublisher() {
        val userId = publisherUserId ?: return
        val intent = Intent(this, ChatActivity::class.java).apply {
            putExtra(ChatActivity.EXTRA_CONTACT_USER_ID, userId)
        }
        startActivity(intent)
    }

    private fun openReviewDialog() {
        val skillId = currentSkillId ?: return
        val targetUserId = publisherUserId ?: return
        ReviewDialog.newInstance(
            authorId = CURRENT_USER_ID,
            targetUserId = targetUserId,
            skillId = skillId
        ).setOnReviewCreated {
            loadReviews(skillId)
        }.show(supportFragmentManager, "review-dialog")
    }

    private fun setLoading(loading: Boolean) {
        findViewById<ProgressBar>(R.id.skillDetailProgress).visibility = if (loading) View.VISIBLE else View.GONE
        findViewById<Button>(R.id.contactSellerButton).isEnabled = !loading && !publisherUserId.isNullOrBlank()
        findViewById<Button>(R.id.leaveReviewButton).isEnabled = !loading && !publisherUserId.isNullOrBlank()
    }

    private fun setReviewsLoading(loading: Boolean) {
        findViewById<ProgressBar>(R.id.skillDetailReviewsProgress).visibility = if (loading) View.VISIBLE else View.GONE
    }

    private fun showError(message: String) {
        findViewById<TextView>(R.id.skillDetailErrorText).apply {
            text = message
            visibility = View.VISIBLE
        }
        findViewById<Button>(R.id.contactSellerButton).isEnabled = false
        findViewById<Button>(R.id.leaveReviewButton).isEnabled = false
    }

    private fun hideError() {
        findViewById<TextView>(R.id.skillDetailErrorText).visibility = View.GONE
    }

    private fun formatEur(value: Double): String = String.format(Locale.ITALY, "€ %.2f", value)

    override fun finish() {
        super.finish()
        overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right)
    }

    companion object {
        const val EXTRA_SKILL_ID = "extra_skill_id"
        private const val CURRENT_USER_ID = "current-user-demo"
    }
}
