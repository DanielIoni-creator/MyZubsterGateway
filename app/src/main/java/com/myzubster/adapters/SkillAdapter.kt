package com.myzubster.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.myzubster.R
import com.myzubster.models.Skill
import java.util.Locale

class SkillAdapter(
    private var skills: List<Skill> = emptyList(),
    private val onSkillClick: (Skill) -> Unit
) : RecyclerView.Adapter<SkillAdapter.SkillViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SkillViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_skill, parent, false)
        return SkillViewHolder(view)
    }

    override fun onBindViewHolder(holder: SkillViewHolder, position: Int) {
        holder.bind(skills[position], onSkillClick)
    }

    override fun getItemCount(): Int = skills.size

    fun submitList(newSkills: List<Skill>) {
        skills = newSkills
        notifyDataSetChanged()
    }

    class SkillViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val titleText: TextView = itemView.findViewById(R.id.skillItemTitleText)
        private val metaText: TextView = itemView.findViewById(R.id.skillItemMetaText)
        private val priceText: TextView = itemView.findViewById(R.id.skillItemPriceText)

        fun bind(skill: Skill, onSkillClick: (Skill) -> Unit) {
            titleText.text = skill.title
            metaText.text = "${skill.category} • ${skill.type}"
            priceText.text = skill.displayPriceEur?.let { "💶 ${formatEur(it)}" } ?: "Prezzo non indicato"
            itemView.setOnClickListener { onSkillClick(skill) }
        }

        private fun formatEur(value: Double): String = String.format(Locale.ITALY, "€ %.2f", value)
    }
}
