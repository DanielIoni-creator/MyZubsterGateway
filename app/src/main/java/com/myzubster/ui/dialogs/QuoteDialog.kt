package com.myzubster.ui.dialogs

import android.app.Dialog
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.DialogFragment
import androidx.lifecycle.lifecycleScope
import com.myzubster.R
import com.myzubster.models.QuoteRequest
import com.myzubster.network.ApiClient
import kotlinx.coroutines.launch

class QuoteDialog(private val bookingId: String) : DialogFragment() {

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val builder = AlertDialog.Builder(requireContext())
        val inflater = requireActivity().layoutInflater
        val view = inflater.inflate(R.layout.dialog_quote, null)

        val etAmount = view.findViewById<EditText>(R.id.etAmount)
        val etDescription = view.findViewById<EditText>(R.id.etDescription)
        val btnSend = view.findViewById<Button>(R.id.btnSendQuote)
        val btnCancel = view.findViewById<Button>(R.id.btnCancel)

        btnSend.setOnClickListener {
            val amountStr = etAmount.text.toString()
            if (amountStr.isNotEmpty() && amountStr.toDoubleOrNull() != null) {
                val amount = amountStr.toDouble()
                if (amount > 0) {
                    val description = etDescription.text.toString()
                    val request = QuoteRequest(bookingId, amount, description)
                    sendQuote(request)
                } else {
                    Toast.makeText(context, "L'importo deve essere maggiore di 0", Toast.LENGTH_SHORT).show()
                }
            } else {
                Toast.makeText(context, "Importo non valido", Toast.LENGTH_SHORT).show()
            }
        }

        btnCancel.setOnClickListener {
            dismiss()
        }

        builder.setView(view)
        return builder.create()
    }

    private fun sendQuote(request: QuoteRequest) {
        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.createQuote(request)
                if (response.success) {
                    Toast.makeText(context, "✅ Preventivo inviato!", Toast.LENGTH_LONG).show()
                    dismiss()
                } else {
                    Toast.makeText(context, response.error ?: "Errore nell'invio", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Errore: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}