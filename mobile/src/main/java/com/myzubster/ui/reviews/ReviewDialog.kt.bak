package com.myzubster.ui.reviews

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.RatingBar
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.DialogFragment
import androidx.lifecycle.lifecycleScope
import com.myzubster.R
import com.myzubster.models.CreateReviewRequest
import com.myzubster.network.ApiService
import kotlinx.coroutines.launch

class ReviewDialog : DialogFragment() {
    private val apiService: ApiService by lazy { ApiService.create() }
    private var onReviewCreated: (() -> Unit)? = null

    private lateinit var ratingBar: RatingBar
    private lateinit var commentEdit: EditText
    private lateinit var progress: ProgressBar

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_review, null)
        ratingBar = dialogView.findViewById(R.id.reviewDialogRatingBar)
        commentEdit = dialogView.findViewById(R.id.reviewDialogCommentEdit)
        progress = dialogView.findViewById(R.id.reviewDialogProgress)

        return AlertDialog.Builder(requireContext())
            .setTitle("Lascia una recensione")
            .setView(dialogView)
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton("Invia", null)
            .create()
            .also { alertDialog ->
                alertDialog.setOnShowListener {
                    alertDialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                        submitReview(alertDialog)
                    }
                }
            }
    }

    fun setOnReviewCreated(listener: () -> Unit): ReviewDialog {
        onReviewCreated = listener
        return this
    }

    private fun submitReview(dialog: AlertDialog) {
        val args = requireArguments()
        val authorId = args.getString(ARG_AUTHOR_ID).orEmpty()
        val targetUserId = args.getString(ARG_TARGET_USER_ID).orEmpty()
        val skillId = args.getString(ARG_SKILL_ID).orEmpty()
        val rating = ratingBar.rating.toInt().coerceIn(1, 5)
        val comment = commentEdit.text?.toString()?.trim().orEmpty().ifBlank { null }

        if (authorId.isBlank() || targetUserId.isBlank() || skillId.isBlank()) {
            Toast.makeText(requireContext(), "Dati recensione mancanti", Toast.LENGTH_SHORT).show()
            return
        }

        setSubmitting(dialog, true)
        lifecycleScope.launch {
            runCatching {
                apiService.createReview(
                    CreateReviewRequest(
                        authorId = authorId,
                        targetUserId = targetUserId,
                        skillId = skillId,
                        rating = rating,
                        comment = comment
                    )
                )
            }.onSuccess {
                Toast.makeText(requireContext(), "Recensione salvata", Toast.LENGTH_SHORT).show()
                onReviewCreated?.invoke()
                dismissAllowingStateLoss()
            }.onFailure { error ->
                setSubmitting(dialog, false)
                Toast.makeText(
                    requireContext(),
                    error.message ?: "Errore durante il salvataggio della recensione",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun setSubmitting(dialog: AlertDialog, submitting: Boolean) {
        progress.visibility = if (submitting) View.VISIBLE else View.GONE
        dialog.getButton(AlertDialog.BUTTON_POSITIVE)?.isEnabled = !submitting
        dialog.getButton(AlertDialog.BUTTON_NEGATIVE)?.isEnabled = !submitting
        ratingBar.isEnabled = !submitting
        commentEdit.isEnabled = !submitting
    }

    companion object {
        private const val ARG_AUTHOR_ID = "arg_author_id"
        private const val ARG_TARGET_USER_ID = "arg_target_user_id"
        private const val ARG_SKILL_ID = "arg_skill_id"

        fun newInstance(authorId: String, targetUserId: String, skillId: String): ReviewDialog {
            return ReviewDialog().apply {
                arguments = Bundle().apply {
                    putString(ARG_AUTHOR_ID, authorId)
                    putString(ARG_TARGET_USER_ID, targetUserId)
                    putString(ARG_SKILL_ID, skillId)
                }
            }
        }
    }
}
