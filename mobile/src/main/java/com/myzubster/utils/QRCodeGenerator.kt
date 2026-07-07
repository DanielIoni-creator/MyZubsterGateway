package com.myzubster.utils

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import java.math.BigDecimal

object QRCodeGenerator {
    private const val DEFAULT_SIZE_PX = 768

    /**
     * Genera un QR code per un URI Monero nel formato:
     * monero:[address]?amount=[amount]
     *
     * Se ZXing fallisce, ritorna un bitmap fallback con pattern di errore invece di crashare la UI.
     */
    fun generateMoneroQR(address: String, amount: Double): Bitmap {
        return try {
            require(address.isNotBlank()) { "L'indirizzo Monero non può essere vuoto" }
            require(amount > 0.0) { "L'importo XMR deve essere maggiore di zero" }

            val uri = buildMoneroUri(address, amount)
            generateQrBitmap(uri, DEFAULT_SIZE_PX)
        } catch (error: Throwable) {
            generateFallbackBitmap(error.message ?: "Errore QR Monero", DEFAULT_SIZE_PX)
        }
    }

    fun buildMoneroUri(address: String, amount: Double): String {
        val formattedAmount = BigDecimal.valueOf(amount)
            .stripTrailingZeros()
            .toPlainString()
        return "monero:$address?amount=$formattedAmount"
    }

    private fun generateQrBitmap(text: String, sizePx: Int): Bitmap {
        val hints = mapOf(
            EncodeHintType.MARGIN to 1,
            EncodeHintType.CHARACTER_SET to "UTF-8"
        )
        val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)

        for (x in 0 until sizePx) {
            for (y in 0 until sizePx) {
                bitmap.setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }

        return bitmap
    }

    private fun generateFallbackBitmap(message: String, sizePx: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val backgroundPaint = Paint().apply {
            color = Color.WHITE
            style = Paint.Style.FILL
        }
        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.RED
            style = Paint.Style.STROKE
            strokeWidth = 12f
        }
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textAlign = Paint.Align.CENTER
            textSize = 28f
        }

        canvas.drawRect(0f, 0f, sizePx.toFloat(), sizePx.toFloat(), backgroundPaint)
        canvas.drawRect(24f, 24f, sizePx - 24f, sizePx - 24f, borderPaint)
        canvas.drawText("QR Monero non disponibile", sizePx / 2f, sizePx / 2f - 16f, textPaint)
        canvas.drawText(message.take(42), sizePx / 2f, sizePx / 2f + 28f, textPaint)
        return bitmap
    }
}
