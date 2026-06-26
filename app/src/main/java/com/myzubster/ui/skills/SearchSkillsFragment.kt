package com.myzubster.ui.skills

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.myzubster.R
import java.util.Locale

data class SkillSearchResult(
    val id: String,
    val title: String,
    val sellerId: String,
    val priceXmr: Double? = null
)

class SearchSkillsFragment : Fragment() {
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_search_skills, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val sampleResults = listOf(
            SkillSearchResult("1", "Riparazioni rapide", "seller-1", 0.02),
            SkillSearchResult("2", "Aiuto compiti", "seller-2", null)
        )
        renderResults(view.findViewById(R.id.skillsListContainer), sampleResults)
    }

    private fun renderResults(container: LinearLayout, results: List<SkillSearchResult>) {
        container.removeAllViews()
        results.forEach { result ->
            val priceBadge = result.priceXmr?.let { "  💰 XMR ${formatXmr(it)}" }.orEmpty()
            val row = TextView(requireContext()).apply {
                text = "${result.title}$priceBadge"
                textSize = 16f
                setPadding(0, 16, 0, 16)
            }
            container.addView(row)
        }
    }

    private fun formatXmr(value: Double): String = String.format(Locale.US, "%.12f", value).trimEnd('0').trimEnd('.')
}
