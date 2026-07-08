package com.myzbuster.app.ui.common

import android.content.Context
import android.util.AttributeSet
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.widget.AppCompatTextView
import com.myzbuster.app.R
import com.myzbuster.app.utils.ClipboardUtils

/**
 * TextView che permette di copiare il testo al tocco
 */
class CopyableTextView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : AppCompatTextView(context, attrs, defStyleAttr) {
    
    private var copyLabel: String = "Testo copiato"
    private var copyMessage: String? = null
    private var enableCopy: Boolean = true
    
    init {
        // Leggi gli attributi XML
        attrs?.let {
            val typedArray = context.obtainStyledAttributes(it, R.styleable.CopyableTextView)
            copyLabel = typedArray.getString(R.styleable.CopyableTextView_copyLabel) ?: "Testo copiato"
            copyMessage = typedArray.getString(R.styleable.CopyableTextView_copyMessage)
            enableCopy = typedArray.getBoolean(R.styleable.CopyableTextView_enableCopy, true)
            typedArray.recycle()
        }
        
        // Imposta il click listener
        if (enableCopy) {
            setOnClickListener {
                copyText()
            }
            
            // Mostra feedback visivo
            setOnLongClickListener {
                copyText()
                true
            }
        }
    }
    
    /**
     * Copia il testo negli appunti
     */
    private fun copyText() {
        val textToCopy = text.toString()
        if (textToCopy.isNotEmpty()) {
            ClipboardUtils.copyToClipboard(
                context = context,
                text = textToCopy,
                label = copyLabel,
                successMessage = copyMessage ?: "📋 Copiato negli appunti!"
            )
        } else {
            Toast.makeText(context, "Nessun testo da copiare", Toast.LENGTH_SHORT).show()
        }
    }
    
    /**
     * Imposta il testo da copiare
     */
    fun setCopyText(text: String, label: String = "Testo copiato") {
        this.text = text
        this.copyLabel = label
    }
    
    /**
     * Abilita/disabilita la copia
     */
    fun setCopyEnabled(enabled: Boolean) {
        enableCopy = enabled
        isClickable = enabled
        isFocusable = enabled
    }
}