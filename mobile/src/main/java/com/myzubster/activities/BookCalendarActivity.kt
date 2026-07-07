package com.myzubster.activities

import android.os.Bundle
import android.widget.Button
import android.widget.CalendarView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.myzubster.R

class BookCalendarActivity : AppCompatActivity() {

    private lateinit var calendarView: CalendarView
    private lateinit var btnSelectTimeSlot: Button
    private lateinit var tvSelectedDate: TextView
    private lateinit var tvSelectedTime: TextView
    private lateinit var btnConfirmBooking: Button

    private var selectedDate: String? = null
    private var selectedTimeSlot: String? = null
    private val timeSlots = listOf(
        "09:00 - 10:00",
        "10:00 - 11:00",
        "11:00 - 12:00",
        "12:00 - 13:00",
        "14:00 - 15:00",
        "15:00 - 16:00",
        "16:00 - 17:00",
        "17:00 - 18:00"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_book_calendar)

        // Inizializza view
        calendarView = findViewById(R.id.calendarView)
        btnSelectTimeSlot = findViewById(R.id.btnSelectTimeSlot)
        tvSelectedDate = findViewById(R.id.tvSelectedDate)
        tvSelectedTime = findViewById(R.id.tvSelectedTime)
        btnConfirmBooking = findViewById(R.id.btnConfirmBooking)

        // Imposta data di default (oggi)
        val today = java.util.Calendar.getInstance()
        val year = today.get(java.util.Calendar.YEAR)
        val month = today.get(java.util.Calendar.MONTH)
        val day = today.get(java.util.Calendar.DAY_OF_MONTH)
        selectedDate = "$year-${month + 1}-$day"
        tvSelectedDate.text = "Data selezionata: $selectedDate"

        // CalendarView - selezione data
        calendarView.setOnDateChangeListener { _, year, month, dayOfMonth ->
            selectedDate = "$year-${month + 1}-$dayOfMonth"
            tvSelectedDate.text = "Data selezionata: $selectedDate"
            selectedTimeSlot = null
            tvSelectedTime.text = "Orario: non selezionato"
        }

        // Pulsante selezione orario
        btnSelectTimeSlot.setOnClickListener {
            showTimeSlotDialog()
        }

        // Pulsante conferma prenotazione
        btnConfirmBooking.setOnClickListener {
            confirmBooking()
        }

        // Back button dalla toolbar
        findViewById<com.google.android.material.appbar.MaterialToolbar>(R.id.toolbar)
            .setNavigationOnClickListener { onBackPressed() }
    }

    private fun showTimeSlotDialog() {
        if (selectedDate == null) {
            Toast.makeText(this, "Seleziona prima una data", Toast.LENGTH_SHORT).show()
            return
        }

        MaterialAlertDialogBuilder(this)
            .setTitle("Seleziona un orario")
            .setItems(timeSlots.toTypedArray()) { _, which ->
                selectedTimeSlot = timeSlots[which]
                tvSelectedTime.text = "Orario: $selectedTimeSlot"
                Toast.makeText(this, "Orario selezionato: ${timeSlots[which]}", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Annulla", null)
            .show()
    }

    private fun confirmBooking() {
        if (selectedDate == null) {
            Toast.makeText(this, "Seleziona una data", Toast.LENGTH_SHORT).show()
            return
        }

        if (selectedTimeSlot == null) {
            Toast.makeText(this, "Seleziona un orario", Toast.LENGTH_SHORT).show()
            return
        }

        MaterialAlertDialogBuilder(this)
            .setTitle("Conferma prenotazione")
            .setMessage("Data: $selectedDate\nOrario: $selectedTimeSlot")
            .setPositiveButton("Conferma") { _, _ ->
                createBooking()
            }
            .setNegativeButton("Annulla", null)
            .show()
    }

    private fun createBooking() {
        val skillId = intent.getStringExtra("skillId") ?: ""
        val professionalId = intent.getStringExtra("professionalId") ?: ""

        Toast.makeText(this, "✅ Prenotazione creata!", Toast.LENGTH_LONG).show()
        finish()
    }

    companion object {
        const val EXTRA_SKILL_ID = "skillId"
        const val EXTRA_PROFESSIONAL_ID = "professionalId"
        const val EXTRA_SERVICE_TITLE = "serviceTitle"
        const val EXTRA_SERVICE_PRICE = "servicePrice"
        const val EXTRA_PROFESSIONAL_NAME = "professionalName"
    }
}