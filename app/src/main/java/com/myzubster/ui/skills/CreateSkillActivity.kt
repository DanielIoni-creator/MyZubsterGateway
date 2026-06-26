package com.myzubster.ui.skills

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.myzubster.R

data class SkillDraft(
    val name: String,
    val description: String,
    val priceXmr: Double? = null
)

class CreateSkillActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_skill)

        findViewById<Button>(R.id.saveSkillButton).setOnClickListener {
            val draft = readDraft()
            // TODO: send SkillDraft to the real repository/API when the skills backend is wired.
            Toast.makeText(this, "Competenza salvata: ${draft.name}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun readDraft(): SkillDraft {
        val name = findViewById<EditText>(R.id.skillNameInput).text.toString().trim()
        val description = findViewById<EditText>(R.id.skillDescriptionInput).text.toString().trim()
        val priceText = findViewById<EditText>(R.id.skillPriceXmrInput).text.toString().trim()
        return SkillDraft(
            name = name,
            description = description,
            priceXmr = priceText.takeIf { it.isNotBlank() }?.toDoubleOrNull()
        )
    }
}
