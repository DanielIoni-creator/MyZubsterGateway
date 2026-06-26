package com.myzubster.payment

import android.graphics.Bitmap
import android.graphics.Color
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

object QRCodeGenerator {
    fun moneroUri(address: String, amountXmr: String, description: String): String {
        val encodedDescription = URLEncoder.encode(description, StandardCharsets.UTF_8.name())
        return "monero:$address?amount=$amountXmr&tx_description=$encodedDescription"
    }

    fun generate(text: String, sizePx: Int = 768): Bitmap {
        val hints = mapOf(EncodeHintType.MARGIN to 1)
        val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        for (x in 0 until sizePx) {
            for (y in 0 until sizePx) {
                bitmap.setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }
        return bitmap
    }

    fun generatePaymentQr(payment: PaymentDetails, sizePx: Int = 768): Bitmap {
        val uri = payment.uri.ifBlank {
            moneroUri(payment.address, payment.amountXmr, payment.description)
        }
        return generate(uri, sizePx)
    }
}
