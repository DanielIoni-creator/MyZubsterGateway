package com.myzubster.ui.profile

import android.content.Context
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.appbar.MaterialToolbar
import com.myzubster.R

data class UserProfileDraft(
    val name: String,
    val location: String,
    val bio: String,
    val skills: String,
    val moneroAddress: String
)

class CreateProfileActivity : AppCompatActivity() {
    private val prefs by lazy { getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE) }

    private lateinit var nameInput: EditText
    private lateinit var locationInput: EditText
    private lateinit var bioInput: EditText
    private lateinit var skillsInput: EditText
    private lateinit var moneroInput: EditText
    private lateinit var summaryText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_profile)

        findViewById<MaterialToolbar>(R.id.createProfileToolbar).setNavigationOnClickListener { finish() }

        nameInput = findViewById(R.id.profileNameInput)
        locationInput = findViewById(R.id.profileLocationInput)
        bioInput = findViewById(R.id.profileBioInput)
        skillsInput = findViewById(R.id.profileSkillsInput)
        moneroInput = findViewById(R.id.profileMoneroInput)
        summaryText = findViewById(R.id.profileSavedSummaryText)

        loadSavedProfile()
        findViewById<Button>(R.id.saveProfileButton).setOnClickListener { saveProfile() }
    }

    private fun loadSavedProfile() {
        nameInput.setText(prefs.getString(KEY_NAME, ""))
        locationInput.setText(prefs.getString(KEY_LOCATION, ""))
        bioInput.setText(prefs.getString(KEY_BIO, ""))
        skillsInput.setText(prefs.getString(KEY_SKILLS, ""))
        moneroInput.setText(prefs.getString(KEY_MONERO, ""))
        updateSummary(readDraft())
    }

    private fun saveProfile() {
        val draft = readDraft()
        if (draft.name.isBlank()) {
            Toast.makeText(this, "Inserisci almeno nome o nickname", Toast.LENGTH_SHORT).show()
            return
        }

        prefs.edit()
            .putString(KEY_NAME, draft.name)
            .putString(KEY_LOCATION, draft.location)
            .putString(KEY_BIO, draft.bio)
            .putString(KEY_SKILLS, draft.skills)
            .putString(KEY_MONERO, draft.moneroAddress)
            .apply()

        updateSummary(draft)
        Toast.makeText(this, "Profilo salvato", Toast.LENGTH_SHORT).show()
    }

    private fun readDraft(): UserProfileDraft = UserProfileDraft(
        name = nameInput.text.toString().trim(),
        location = locationInput.text.toString().trim(),
        bio = bioInput.text.toString().trim(),
        skills = skillsInput.text.toString().trim(),
        moneroAddress = moneroInput.text.toString().trim()
    )

    private fun updateSummary(profile: UserProfileDraft) {
        summaryText.text = if (profile.name.isBlank()) {
            "Nessun profilo salvato"
        } else {
            buildString {
                appendLine("Profilo salvato")
                appendLine("Nome: ${profile.name}")
                if (profile.location.isNotBlank()) appendLine("Zona: ${profile.location}")
                if (profile.skills.isNotBlank()) appendLine("Competenze: ${profile.skills}")
                if (profile.bio.isNotBlank()) appendLine("Bio: ${profile.bio}")
                if (profile.moneroAddress.isNotBlank()) append("Monero: ${profile.moneroAddress.take(12)}...")
            }
        }
    }

    companion object {
        private const val PREFS_NAME = "myzubster_profile"
        private const val KEY_NAME = "name"
        private const val KEY_LOCATION = "location"
        private const val KEY_BIO = "bio"
        private const val KEY_SKILLS = "skills"
        private const val KEY_MONERO = "monero"
    }
}
