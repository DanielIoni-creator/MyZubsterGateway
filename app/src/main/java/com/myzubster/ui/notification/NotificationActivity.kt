package com.myzubster.ui.notification

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.myzubster.R
import com.myzubster.utils.SessionManager

class NotificationActivity : AppCompatActivity() {

    private lateinit var viewModel: NotificationViewModel
    private lateinit var adapter: NotificationAdapter

    private lateinit var rvNotifications: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var llEmpty: View
    private lateinit var btnAll: Button
    private lateinit var btnUnread: Button
    private lateinit var btnQuotes: Button
    private lateinit var btnBookings: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_notifications)

        initViews()
        initViewModel()
        initAdapter()
        setupListeners()

        viewModel.loadNotifications()
    }

    private fun initViews() {
        rvNotifications = findViewById(R.id.rvNotifications)
        progressBar = findViewById(R.id.progressBar)
        llEmpty = findViewById(R.id.llEmpty)
        btnAll = findViewById(R.id.btnAll)
        btnUnread = findViewById(R.id.btnUnread)
        btnQuotes = findViewById(R.id.btnQuotes)
        btnBookings = findViewById(R.id.btnBookings)
    }

    private fun initViewModel() {
        val sessionManager = SessionManager(this)
        viewModel = ViewModelProvider(
            this,
            object : ViewModelProvider.Factory {
                override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return NotificationViewModel(sessionManager) as T
                }
            }
        )[NotificationViewModel::class.java]

        viewModel.notifications.observe(this) { notifications ->
            if (notifications.isEmpty()) {
                llEmpty.visibility = View.VISIBLE
                rvNotifications.visibility = View.GONE
            } else {
                llEmpty.visibility = View.GONE
                rvNotifications.visibility = View.VISIBLE
                adapter.submitList(notifications)
            }
        }

        viewModel.isLoading.observe(this) { loading ->
            progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        }

        viewModel.error.observe(this) { error ->
            error?.let {
                Toast.makeText(this, it, Toast.LENGTH_LONG).show()
            }
        }

        viewModel.unreadCount.observe(this) { count ->
            supportActionBar?.title = "🔔 Notifiche ($count non lette)"
        }
    }

    private fun initAdapter() {
        adapter = NotificationAdapter(
            onItemClick = { notification ->
                viewModel.markAsRead(notification.id)
                Toast.makeText(this, "Notifica: ${notification.title}", Toast.LENGTH_SHORT).show()
            },
            onMarkReadClick = { notification ->
                viewModel.markAsRead(notification.id)
            }
        )
        rvNotifications.layoutManager = LinearLayoutManager(this)
        rvNotifications.adapter = adapter
    }

    private fun setupListeners() {
        btnAll.setOnClickListener {
            setActiveFilter(btnAll)
            viewModel.applyFilter(type = null, read = null)
        }

        btnUnread.setOnClickListener {
            setActiveFilter(btnUnread)
            viewModel.applyFilter(type = null, read = false)
        }

        btnQuotes.setOnClickListener {
            setActiveFilter(btnQuotes)
            viewModel.applyFilter(type = "quote_received,quote_accepted,quote_rejected", read = null)
        }

        btnBookings.setOnClickListener {
            setActiveFilter(btnBookings)
            viewModel.applyFilter(type = "booking_updated,booking_completed", read = null)
        }
    }

    private fun setActiveFilter(activeButton: Button) {
        val buttons = listOf(btnAll, btnUnread, btnQuotes, btnBookings)
        buttons.forEach { btn ->
            btn.isEnabled = btn != activeButton
            btn.alpha = if (btn == activeButton) 1.0f else 0.5f
        }
    }
}