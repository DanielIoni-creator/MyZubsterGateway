package com.myzubster.ui.notification

import android.os.Bundle
import android.widget.Button
import android.widget.CheckBox
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.lifecycle.ViewModelProvider
import com.myzubster.R

class NotificationSettingsActivity : AppCompatActivity() {

    private lateinit var viewModel: NotificationSettingsViewModel

    private lateinit var tvRegistrationStatus: TextView
    private lateinit var tvDeviceToken: TextView
    private lateinit var switchNotifications: SwitchCompat
    private lateinit var chkNewQuotes: CheckBox
    private lateinit var chkQuoteAccepted: CheckBox
    private lateinit var chkBookingUpdates: CheckBox
    private lateinit var chkPromotions: CheckBox
    private lateinit var btnRegister: Button
    private lateinit var btnUnregister: Button
    private lateinit var progressBar: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_notification_settings)

        initViews()
        initViewModel()
        observeViewModel()
        setupListeners()
    }

    private fun initViews() {
        tvRegistrationStatus = findViewById(R.id.tvRegistrationStatus)
        tvDeviceToken = findViewById(R.id.tvDeviceToken)
        switchNotifications = findViewById(R.id.switchNotifications)
        chkNewQuotes = findViewById(R.id.chkNewQuotes)
        chkQuoteAccepted = findViewById(R.id.chkQuoteAccepted)
        chkBookingUpdates = findViewById(R.id.chkBookingUpdates)
        chkPromotions = findViewById(R.id.chkPromotions)
        btnRegister = findViewById(R.id.btnRegister)
        btnUnregister = findViewById(R.id.btnUnregister)
        progressBar = findViewById(R.id.progressBar)
    }

    private fun initViewModel() {
        viewModel = ViewModelProvider(
            this,
            object : ViewModelProvider.Factory {
                override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return NotificationSettingsViewModel(applicationContext) as T
                }
            }
        )[NotificationSettingsViewModel::class.java]
    }

    private fun observeViewModel() {
        viewModel.isLoading.observe(this) { loading ->
            progressBar.visibility = if (loading) android.view.View.VISIBLE else android.view.View.GONE
            btnRegister.isEnabled = !loading
            btnUnregister.isEnabled = !loading
        }

        viewModel.error.observe(this) { error ->
            error?.let {
                Toast.makeText(this, it, Toast.LENGTH_LONG).show()
            }
        }

        viewModel.registrationStatus.observe(this) { status ->
            tvRegistrationStatus.text = status
        }

        viewModel.isRegistered.observe(this) { registered ->
            switchNotifications.isChecked = registered
            tvRegistrationStatus.text = if (registered) "✅ Registrato" else "❌ Non registrato"
            tvRegistrationStatus.setTextColor(
                if (registered) 0xFF4CAF50.toInt() else 0xFFF44336.toInt()
            )
        }

        viewModel.deviceToken.observe(this) { token ->
            tvDeviceToken.text = "Token: $token"
        }
    }

    private fun setupListeners() {
        switchNotifications.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                viewModel.registerForNotifications()
            } else {
                viewModel.unregisterFromNotifications()
            }
        }

        btnRegister.setOnClickListener {
            viewModel.registerForNotifications()
        }

        btnUnregister.setOnClickListener {
            viewModel.unregisterFromNotifications()
        }
    }
}