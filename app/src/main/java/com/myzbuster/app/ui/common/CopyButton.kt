package com.myzbuster.app.ui.common

import android.content.Context
import android.util.AttributeSet
import android.widget.Button
import com.myzbuster.app.R
import com.myzbuster.app.utils.ClipboardUtils

/**
 * Pulsante per copiare un testo negli appunti
 */
class CopyButton @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : Button(context, attrs, defStyleAttr) {
    
    private var textToCopy: String = ""
    private var copyLabel: String = "Testo copiato"
    private var copyMessage: String? = null
    
    init {
        // Leggi gli attributi XML
        attrs?.let {
            val typedArray = context.obtainStyledAttributes(it, R.styleable.CopyButton)
            copyLabel = typedArray.getString(R.styleable.CopyButton_copyLabel) ?: "Testo copiato"
            copyMessage = typedArray.getString(R.styleable.CopyButton_copyMessage)
            typedArray.recycle()
        }
        
        // Imposta l'icona di copia
        setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_copy, 0, 0, 0)
        compoundDrawablePadding = 8
        
        // Imposta il click listener
        setOnClickListener {
            performCopy()
        }
    }
    
    /**
     * Copia il testo negli appunti
     */
    private fun performCopy() {
        if (textToCopy.isNotEmpty()) {
            ClipboardUtils.copyToClipboard(
                context = context,
                text = textToCopy,
                label = copyLabel,
                successMessage = copyMessage ?: "📋 Copiato negli appunti!"
            )
        } else {
            // Se non c'è testo, prova a prendere il tag
            val tagText = tag as? String
            if (!tagText.isNullOrEmpty()) {
                ClipboardUtils.copyToClipboard(
                    context = context,
                    text = tagText,
                    label = copyLabel,
                    successMessage = copyMessage ?: "📋 Copiato negli appunti!"
                )
            }
        }
    }
    
    /**
     * Imposta il testo da copiare
     */
    fun setCopyData(text: String, label: String? = null) {
        textToCopy = text
        if (label != null) {
            copyLabel = label
        }
    }
    
    /**
     * Imposta il testo da copiare tramite tag
     */
    fun setCopyDataWithTag(text: String, label: String? = null) {
        textToCopy = text
        tag = text
        if (label != null) {
            copyLabel = label
        }
    }
}