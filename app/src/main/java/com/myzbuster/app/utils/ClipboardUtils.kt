package com.myzbuster.app.utils

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.core.content.ContextCompat.getSystemService

/**
 * Utility per gestire la clipboard (copia/incolla)
 */
object ClipboardUtils {
    
    /**
     * Copia un testo nella clipboard
     * @param context Context dell'app
     * @param text Testo da copiare
     * @param label Label descrittiva (opzionale)
     * @param showToast Mostra conferma all'utente
     * @param successMessage Messaggio di conferma personalizzato
     */
    fun copyToClipboard(
        context: Context,
        text: String,
        label: String = "Testo copiato",
        showToast: Boolean = true,
        successMessage: String? = null
    ): Boolean {
        return try {
            val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText(label, text)
            clipboardManager.setPrimaryClip(clip)
            
            if (showToast) {
                val message = successMessage ?: "📋 Copiato negli appunti!"
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            }
            true
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Errore durante la copia", Toast.LENGTH_SHORT).show()
            false
        }
    }
    
    /**
     * Copia un indirizzo (formattato per pagamenti)
     */
    fun copyAddress(
        context: Context,
        address: String,
        label: String = "Indirizzo copiato"
    ): Boolean {
        return copyToClipboard(
            context = context,
            text = address,
            label = label,
            successMessage = "✅ Indirizzo copiato negli appunti!"
        )
    }
    
    /**
     * Copia un ID (utente, prenotazione, ecc.)
     */
    fun copyId(
        context: Context,
        id: String,
        type: String = "ID"
    ): Boolean {
        return copyToClipboard(
            context = context,
            text = id,
            label = "$type copiato",
            successMessage = "✅ $type copiato negli appunti!"
        )
    }
    
    /**
     * Copia un codice QR
     */
    fun copyQRCode(
        context: Context,
        qrData: String,
        label: String = "QR Code copiato"
    ): Boolean {
        return copyToClipboard(
            context = context,
            text = qrData,
            label = label,
            successMessage = "✅ QR Code copiato negli appunti!"
        )
    }
    
    /**
     * Ottiene il testo dalla clipboard
     */
    fun getFromClipboard(context: Context): String? {
        return try {
            val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = clipboardManager.primaryClip
            if (clip != null && clip.itemCount > 0) {
                clip.getItemAt(0).text.toString()
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    /**
     * Verifica se la clipboard contiene testo
     */
    fun hasText(context: Context): Boolean {
        return try {
            val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboardManager.hasPrimaryClip()
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Svuota la clipboard
     */
    fun clearClipboard(context: Context) {
        try {
            val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("", "")
            clipboardManager.setPrimaryClip(clip)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}