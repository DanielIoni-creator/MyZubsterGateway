package com.myzubster.adapters.reviews

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.myzubster.R
import com.myzubster.models.Review
import java.text.SimpleDateFormat
import java.util.*

class ReviewAdapter(
    private val reviews: List<Review>,
    private val onItemClick: (Review) -> Unit
) : RecyclerView.Adapter<ReviewAdapter.ReviewViewHolder>() {

    private val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ReviewViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_review, parent, false)
        return ReviewViewHolder(view)
    }

    override fun onBindViewHolder(holder: ReviewViewHolder, position: Int) {
        val review = reviews[position]
        holder.bind(review)
        holder.itemView.setOnClickListener { onItemClick(review) }
    }

    override fun getItemCount(): Int = reviews.size

    inner class ReviewViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvReviewerName: TextView = itemView.findViewById(R.id.tvReviewerName)
        private val tvRating: TextView = itemView.findViewById(R.id.tvRating)
        private val tvComment: TextView = itemView.findViewById(R.id.tvComment)
        private val tvDate: TextView = itemView.findViewById(R.id.tvDate)
        private val star1: ImageView = itemView.findViewById(R.id.star1)
        private val star2: ImageView = itemView.findViewById(R.id.star2)
        private val star3: ImageView = itemView.findViewById(R.id.star3)
        private val star4: ImageView = itemView.findViewById(R.id.star4)
        private val star5: ImageView = itemView.findViewById(R.id.star5)
        private val stars = listOf(star1, star2, star3, star4, star5)

        fun bind(review: Review) {
            tvReviewerName.text = review.reviewerId // Sostituisci con nome utente
            tvRating.text = "${review.rating}.0"
            tvComment.text = review.comment
            
            try {
                val date = dateFormat.parse(review.createdAt)
                tvDate.text = dateFormat.format(date)
            } catch (e: Exception) {
                tvDate.text = review.createdAt
            }

            // Aggiorna stelle
            stars.forEachIndexed { index, star ->
                if (index < review.rating) {
                    star.setImageResource(R.drawable.ic_star_filled)
                } else {
                    star.setImageResource(R.drawable.ic_star_empty)
                }
            }
        }
    }
}