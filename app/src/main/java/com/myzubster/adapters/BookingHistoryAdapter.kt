package com.myzubster.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.myzubster.R
import com.myzubster.models.BookingHistory
import java.text.SimpleDateFormat
import java.util.*

class BookingHistoryAdapter(
    private val onItemClick: (BookingHistory) -> Unit
) : RecyclerView.Adapter<BookingHistoryAdapter.BookingHistoryViewHolder>() {

    private var bookings: List<BookingHistory> = emptyList()
    private val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())

    fun submitList(newList: List<BookingHistory>) {
        bookings = newList
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): BookingHistoryViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_booking_history, parent, false)
        return BookingHistoryViewHolder(view)
    }

    override fun onBindViewHolder(holder: BookingHistoryViewHolder, position: Int) {
        val booking = bookings[position]
        holder.bind(booking)
        holder.itemView.setOnClickListener { onItemClick(booking) }
    }

    override fun getItemCount(): Int = bookings.size

    inner class BookingHistoryViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvSkillTitle: TextView = itemView.findViewById(R.id.tv_skill_title)
        private val tvClientName: TextView = itemView.findViewById(R.id.tv_client_name)
        private val tvProfessionalName: TextView = itemView.findViewById(R.id.tv_professional_name)
        private val tvDate: TextView = itemView.findViewById(R.id.tv_date)
        private val tvTimeSlot: TextView = itemView.findViewById(R.id.tv_time_slot)
        private val tvAmount: TextView = itemView.findViewById(R.id.tv_amount)
        private val tvStatus: TextView = itemView.findViewById(R.id.tv_status)

        fun bind(booking: BookingHistory) {
            tvSkillTitle.text = booking.skillTitle ?: "Skill"
            tvClientName.text = booking.clientName ?: "Client"
            tvProfessionalName.text = booking.professionalName ?: "Professional"
            
            try {
                val date = dateFormat.parse(booking.date)
                tvDate.text = dateFormat.format(date ?: Date())
            } catch (e: Exception) {
                tvDate.text = booking.date
            }
            
            tvTimeSlot.text = booking.timeSlot
            tvAmount.text = "€${String.format("%.2f", booking.amount)}"
            tvStatus.text = booking.getFormattedStatus()
            
            // Set status color
            val color = booking.getStatusColor()
            tvStatus.setTextColor(itemView.context.getColor(color))
        }
    }
}