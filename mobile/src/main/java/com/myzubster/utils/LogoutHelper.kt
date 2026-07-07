package com.myzubster.utils

import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import com.myzubster.ui.auth.LoginActivity

object LogoutHelper {

    /**
     * Mostra un dialog di conferma logout
     */
    fun showLogoutDialog(context: Context, onLogoutConfirmed: () -> Unit) {
        AlertDialog.Builder(context)
            .setTitle("🚪 Logout")
            .setMessage("Sei sicuro di voler uscire?")
            .setPositiveButton("Sì, esci") { _, _ ->
                onLogoutConfirmed()
            }
            .setNegativeButton("Annulla", null)
            .show()
    }

    /**
     * Esegue il logout completo
     */
    fun performLogout(context: Context) {
        // 1. Pulisci token e dati
        val tokenManager = TokenManager(context)
        tokenManager.logout()
        
        // 2. Mostra feedback
        Toast.makeText(context, "🚪 Logout effettuato", Toast.LENGTH_SHORT).show()
        
        // 3. Vai al login
        val intent = Intent(context, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        context.startActivity(intent)
        
        // 4. Chiudi l'activity corrente (se è un'Activity)
        if (context is androidx.appcompat.app.AppCompatActivity) {
            context.finish()
        }
    }
}