package com.myzubster.models

import org.junit.Assert.*
import org.junit.Test
import java.util.Date

/**
 * Test unitari per il modello User di MyZubster.
 * Verifica la creazione, validazione e comportamento dei dati degli utenti.
 */
class UserTest {

    @Test
    fun testUserCreation() {
        // Crea un utente con dati validi
        val user = User(
            id = "user_123",
            username = "mariorossi",
            email = "mario@example.com",
            name = "Mario Rossi",
            bio = "Idraulico esperto con 10 anni di esperienza",
            location = "Rimini",
            avatarUrl = "https://example.com/avatar.jpg",
            rating = 4.5f,
            reviewCount = 12,
            totalJobsCompleted = 8,
            responseRate = 95,
            isIdentityVerified = true,
            badges = listOf("Idraulico Verificato", "Puntualità d'Oro"),
            skillsOffered = listOf("Idraulica", "Riparazioni"),
            skillsWanted = listOf("Elettricista"),
            moneroAddress = "4ABC123...",
            role = "user",
            createdAt = Date().toString()
        )

        // Verifica che i campi siano impostati correttamente
        assertEquals("user_123", user.id)
        assertEquals("mariorossi", user.username)
        assertEquals("mario@example.com", user.email)
        assertEquals("Mario Rossi", user.name)
        assertEquals("Idraulico esperto con 10 anni di esperienza", user.bio)
        assertEquals("Rimini", user.location)
        assertEquals("https://example.com/avatar.jpg", user.avatarUrl)
        assertEquals(4.5f, user.rating, 0.01f)
        assertEquals(12, user.reviewCount)
        assertEquals(8, user.totalJobsCompleted)
        assertEquals(95, user.responseRate)
        assertTrue(user.isIdentityVerified)
        assertEquals(2, user.badges.size)
        assertEquals(2, user.skillsOffered.size)
        assertEquals(1, user.skillsWanted.size)
        assertEquals("4ABC123...", user.moneroAddress)
        assertEquals("user", user.role)
        assertNotNull(user.createdAt)
    }

    @Test
    fun testUserWithDefaultValues() {
        // Crea un utente con valori di default
        val user = User(
            username = "newuser",
            email = "new@example.com"
        )

        assertEquals("newuser", user.username)
        assertEquals("new@example.com", user.email)
        assertEquals(0f, user.rating, 0.01f)
        assertEquals(0, user.reviewCount)
        assertEquals(0, user.totalJobsCompleted)
        assertEquals(0, user.responseRate)
        assertFalse(user.isIdentityVerified)
        assertTrue(user.badges.isEmpty())
        assertTrue(user.skillsOffered.isEmpty())
        assertTrue(user.skillsWanted.isEmpty())
        assertEquals("user", user.role)
    }

    @Test
    fun testUserRoles() {
        val user = User(
            username = "testuser",
            email = "test@example.com",
            role = "admin"
        )
        assertEquals("admin", user.role)
    }

    @Test
    fun testUserRatingValidation() {
        val user = User(
            username = "ratinguser",
            email = "rating@example.com",
            rating = 4.5f
        )
        assertTrue(user.rating in 0f..5f)
    }

    @Test
    fun testUserBadgesList() {
        val badges = listOf("Badge1", "Badge2", "Badge3")
        val user = User(
            username = "badgeuser",
            email = "badge@example.com",
            badges = badges
        )
        assertEquals(3, user.badges.size)
        assertTrue(user.badges.contains("Badge2"))
    }

    @Test
    fun testUserSkillsOffered() {
        val skills = listOf("Idraulica", "Elettricista", "Tutor")
        val user = User(
            username = "skillsuser",
            email = "skills@example.com",
            skillsOffered = skills
        )
        assertEquals(3, user.skillsOffered.size)
        assertTrue(user.skillsOffered.contains("Tutor"))
    }

    @Test
    fun testUserSkillsWanted() {
        val skills = listOf("Giardiniere", "Babysitter")
        val user = User(
            username = "needuser",
            email = "need@example.com",
            skillsWanted = skills
        )
        assertEquals(2, user.skillsWanted.size)
        assertTrue(user.skillsWanted.contains("Babysitter"))
    }

    @Test
    fun testUserDataClassEquality() {
        val user1 = User(
            id = "user_eq",
            username = "equaluser",
            email = "equal@example.com",
            rating = 4.0f
        )
        val user2 = User(
            id = "user_eq",
            username = "equaluser",
            email = "equal@example.com",
            rating = 4.0f
        )
        assertEquals(user1, user2)
    }

    @Test
    fun testUserWithEmptyBio() {
        val user = User(
            username = "biocleaning",
            email = "bio@example.com",
            bio = ""
        )
        assertEquals("", user.bio)
    }

    @Test
    fun testUserWithLongBio() {
        val longBio = "A".repeat(500)
        val user = User(
            username = "longbio",
            email = "long@example.com",
            bio = longBio
        )
        assertEquals(500, user.bio.length)
    }

    @Test
    fun testUserMoneroAddressOptional() {
        val user1 = User(
            username = "withxmr",
            email = "xmr@example.com",
            moneroAddress = "4XYZ..."
        )
        val user2 = User(
            username = "withoutxmr",
            email = "no@example.com"
        )

        assertEquals("4XYZ...", user1.moneroAddress)
        assertNull(user2.moneroAddress)
    }

    @Test
    fun testUserResponseRateRange() {
        val validRates = listOf(0, 50, 100)
        validRates.forEach { rate ->
            val user = User(
                username = "rate$rate",
                email = "rate@example.com",
                responseRate = rate
            )
            assertTrue(user.responseRate in 0..100)
        }
    }

    @Test
    fun testUserTotalJobsCompletedIncrement() {
        val user = User(
            username = "jobuser",
            email = "job@example.com",
            totalJobsCompleted = 5
        )
        assertEquals(5, user.totalJobsCompleted)

        // Simula incremento
        val newTotal = user.totalJobsCompleted + 1
        assertEquals(6, newTotal)
    }

    @Test
    fun testUserIsIdentityVerifiedFlag() {
        val verified = User(
            username = "verified",
            email = "ver@example.com",
            isIdentityVerified = true
        )
        val unverified = User(
            username = "unverified",
            email = "unver@example.com",
            isIdentityVerified = false
        )

        assertTrue(verified.isIdentityVerified)
        assertFalse(unverified.isIdentityVerified)
    }

    @Test
    fun testUserToString() {
        val user = User(
            id = "user_str",
            username = "struser",
            email = "str@example.com",
            name = "String Test"
        )
        val toString = user.toString()
        assertTrue(toString.contains("struser"))
        assertTrue(toString.contains("String Test"))
    }
}