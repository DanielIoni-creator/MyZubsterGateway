package com.myzubster.ui.notification

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.recyclerview.widget.RecyclerView
import com.myzubster.R
import com.myzubster.data.model.Notification
import java.text.SimpleDateFormat
import java.util.Locale

class NotificationAdapter(
    private val onItemClick: (Notification) -> Unit,
    private val onMarkReadClick: (Notification) -> Unit
) : RecyclerView.Adapter<NotificationAdapter.NotificationViewHolder>() {

    private var notifications: List<Notification> = emptyList()

    fun submitList(newList: List<Notification>) {
        notifications = newList
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NotificationViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_notification, parent, false)
        return NotificationViewHolder(view)
    }

    override fun onBindViewHolder(holder: NotificationViewHolder, position: Int) {
        holder.bind(notifications[position])
    }

    override fun getItemCount(): Int = notifications.size

    inner class NotificationViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val cardView: CardView = itemView.findViewById(R.id.cardView)
        private val ivIcon: ImageView = itemView.findViewById(R.id.ivIcon)
        private val tvTitle: TextView = itemView.findViewById(R.id.tvTitle)
        private val tvMessage: TextView = itemView.findViewById(R.id.tvMessage)
        private val tvTime: TextView = itemView.findViewById(R.id.tvTime)
        private val vUnread: View = itemView.findViewById(R.id.vUnread)

        private val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())

        fun bind(notification: Notification) {
            tvTitle.text = notification.title
            tvMessage.text = notification.message
            tvTime.text = dateFormat.format(notification.createdAt)

            ivIcon.setImageResource(
                when (notification.type) {
                    com.myzubster.data.model.NotificationType.QUOTE_RECEIVED,
                    com.myzubster.data.model.NotificationType.QUOTE_ACCEPTED,
                    com.myzubster.data.model.NotificationType.QUOTE_REJECTED -> R.drawable.ic_booking
                    com.myzubster.data.model.NotificationType.BOOKING_UPDATED,
                    com.myzubster.data.model.NotificationType.BOOKING_COMPLETED -> R.drawable.ic_booking
                    com.myzubster.data.model.NotificationType.MESSAGE_RECEIVED -> R.drawable.ic_home
                    else -> R.drawable.ic_launcher
                }
            )

            vUnread.visibility = if (!notification.isRead) View.VISIBLE else View.GONE

            cardView.setCardBackgroundColor(
                if (!notification.isRead) 0xFFE3F2FD.toInt() else 0xFFFFFFFF.toInt()
            )

            cardView.setOnClickListener {
                if (!notification.isRead) {
                    onMarkReadClick(notification)
                }
                onItemClick(notification)
            }
        }
    }
}