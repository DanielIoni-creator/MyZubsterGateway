package com.myzubster.models

import com.google.gson.annotations.SerializedName

data class Skill(
    val id: String,
    val title: String,
    val category: String,
    val type: String,
    val description: String,
    @SerializedName("priceEur") val priceEur: Double? = null,
    @SerializedName("priceXmr") val legacyPriceXmr: Double? = null,
    val distanceKm: Double? = null,
    val address: String? = null,
    val user: SkillUser,
    val sellerId: String = user.id
) {
    // I servizi vengono prezzati in euro. Il fallback legacy evita schermate vuote
    // se un backend vecchio invia ancora priceXmr durante lo sviluppo locale.
    val displayPriceEur: Double?
        get() = priceEur ?: legacyPriceXmr
}

data class SkillUser(
    val id: String,
    val name: String,
    val avatarUrl: String? = null,
    val rating: Double = 0.0,
    val reviewCount: Int = 0
)
