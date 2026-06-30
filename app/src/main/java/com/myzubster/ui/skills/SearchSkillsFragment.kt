package com.myzubster.ui.skills

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.myzubster.R
import com.myzubster.activities.SkillDetailActivity
import com.myzubster.adapters.SkillAdapter
import com.myzubster.models.Skill
import com.myzubster.models.SkillUser
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SearchSkillsFragment : Fragment() {
    private lateinit var skillAdapter: SkillAdapter
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var loadingProgress: ProgressBar
    private lateinit var emptyText: TextView

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_search_skills, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        skillAdapter = SkillAdapter(onSkillClick = { skill -> openSkillDetail(skill.id) })
        swipeRefresh = view.findViewById(R.id.skillsSwipeRefresh)
        loadingProgress = view.findViewById(R.id.skillsLoadingProgress)
        emptyText = view.findViewById(R.id.skillsEmptyText)

        view.findViewById<RecyclerView>(R.id.skillsRecyclerView).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = skillAdapter
        }

        swipeRefresh.setColorSchemeResources(android.R.color.holo_orange_dark, android.R.color.holo_blue_dark)
        swipeRefresh.setOnRefreshListener { loadSkills(isRefresh = true) }

        loadSkills(isRefresh = false)
    }

    private fun loadSkills(isRefresh: Boolean) {
        if (!isRefresh) setLoading(true)
        viewLifecycleOwner.lifecycleScope.launch {
            // Placeholder for GET /api/skills when the list endpoint is wired.
            delay(350)
            val results = sampleResults()
            skillAdapter.submitList(results)
            emptyText.visibility = if (results.isEmpty()) View.VISIBLE else View.GONE
            swipeRefresh.isRefreshing = false
            setLoading(false)
        }
    }

    private fun setLoading(loading: Boolean) {
        loadingProgress.visibility = if (loading) View.VISIBLE else View.GONE
    }

    private fun openSkillDetail(skillId: String) {
        val intent = Intent(requireContext(), SkillDetailActivity::class.java).apply {
            putExtra(SkillDetailActivity.EXTRA_SKILL_ID, skillId)
        }
        startActivity(intent)
        requireActivity().overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left)
    }

    private fun sampleResults(): List<Skill> = listOf(
        Skill(
            id = "1",
            title = "Riparazioni rapide",
            category = "Casa",
            type = "Offerta",
            description = "Piccole riparazioni domestiche nel quartiere.",
            priceEur = 25.0,
            distanceKm = 1.4,
            address = "Via Roma 10",
            user = SkillUser(id = "seller-1", name = "Marco")
        ),
        Skill(
            id = "2",
            title = "Aiuto compiti",
            category = "Studio",
            type = "Offerta",
            description = "Supporto matematica e inglese.",
            priceEur = 15.0,
            distanceKm = 0.8,
            address = "Piazza Verdi",
            user = SkillUser(id = "seller-2", name = "Giulia")
        )
    )
}
