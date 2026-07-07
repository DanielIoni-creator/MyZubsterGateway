package com.myzubster.ui.booking

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.myzubster.R
import com.myzubster.data.model.Quote
import com.myzubster.data.model.QuoteStatus

class QuotesAdapter(
    private val onAcceptClick: (Quote) -> Unit,
    private val onRejectClick: (Quote) -> Unit,
    private val onEditClick: (Quote) -> Unit
) : RecyclerView.Adapter<QuotesAdapter.QuoteViewHolder>() {

    private var quotes: List<Quote> = emptyList()

    fun submitList(newQuotes: List<Quote>) {
        quotes = newQuotes
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): QuoteViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_quote, parent, false)
        return QuoteViewHolder(view)
    }

    override fun onBindViewHolder(holder: QuoteViewHolder, position: Int) {
        holder.bind(quotes[position])
    }

    override fun getItemCount(): Int = quotes.size

    inner class QuoteViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvProfessionalName: TextView = itemView.findViewById(R.id.tvProfessionalName)
        private val tvAmount: TextView = itemView.findViewById(R.id.tvAmount)
        private val tvDescription: TextView = itemView.findViewById(R.id.tvDescription)
        private val tvStatus: TextView = itemView.findViewById(R.id.tvStatus)
        private val btnAccept: Button = itemView.findViewById(R.id.btnAccept)
        private val btnReject: Button = itemView.findViewById(R.id.btnReject)
        private val btnEdit: Button = itemView.findViewById(R.id.btnEdit)

        fun bind(quote: Quote) {
            tvProfessionalName.text = quote.professionalName
            tvAmount.text = "€ ${String.format("%.2f", quote.amount)}"
            tvDescription.text = quote.description
            
            when (quote.status) {
                QuoteStatus.PENDING -> {
                    tvStatus.text = "⏳ In attesa"
                    tvStatus.setBackgroundColor(0xFFFFC107.toInt())
                }
                QuoteStatus.ACCEPTED -> {
                    tvStatus.text = "✅ Accettato"
                    tvStatus.setBackgroundColor(0xFF4CAF50.toInt())
                }
                QuoteStatus.REJECTED -> {
                    tvStatus.text = "❌ Rifiutato"
                    tvStatus.setBackgroundColor(0xFFF44336.toInt())
                }
                QuoteStatus.EXPIRED -> {
                    tvStatus.text = "⏰ Scaduto"
                    tvStatus.setBackgroundColor(0xFF9E9E9E.toInt())
                }
                QuoteStatus.WITHDRAWN -> {
                    tvStatus.text = "↩️ Ritirato"
                    tvStatus.setBackgroundColor(0xFF9E9E9E.toInt())
                }
            }

            if (quote.status == QuoteStatus.PENDING) {
                btnAccept.visibility = View.VISIBLE
                btnReject.visibility = View.VISIBLE
                btnAccept.setOnClickListener { onAcceptClick(quote) }
                btnReject.setOnClickListener { onRejectClick(quote) }
            } else {
                btnAccept.visibility = View.GONE
                btnReject.visibility = View.GONE
            }

            btnEdit.visibility = View.VISIBLE
            btnEdit.setOnClickListener { onEditClick(quote) }
        }
    }
}