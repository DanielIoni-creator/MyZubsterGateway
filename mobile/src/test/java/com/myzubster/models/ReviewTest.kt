package com.myzubster.models

import org.junit.Assert.*
import org.junit.Test
import java.util.Date

/**
 * Test unitari per il modello Review di MyZubster.
 * Verifica la creazione, validazione e comportamento dei dati delle recensioni.
 */
class ReviewTest {

    @Test
    fun testReviewCreation() {
        // Crea una recensione con dati validi
        val review = Review(
            id = "review_123",
            authorId = "user_author_1",
            targetUserId = "user_target_1",
            skillId = "skill_456",
            rating = 5,
            comment = "Ottimo lavoro! Professionale e puntuale.",
            createdAt = Date().toString()
        )

        // Verifica che i campi siano impostati correttamente
        assertEquals("review_123", review.id)
        assertEquals("user_author_1", review.authorId)
        assertEquals("user_target_1", review.targetUserId)
        assertEquals("skill_456", review.skillId)
        assertEquals(5, review.rating)
        assertEquals("Ottimo lavoro! Professionale e puntuale.", review.comment)
        assertNotNull(review.createdAt)
    }

    @Test
    fun testReviewMinimumRating() {
        // Crea una recensione con il punteggio minimo (1)
        val review = Review(
            id = "review_min",
            authorId = "author1",
            targetUserId = "user1",
            skillId = "skill1",
            rating = 1,
            comment = "Da migliorare."
        )
        assertEquals(1, review.rating)
    }

    @Test
    fun testReviewMaximumRating() {
        // Crea una recensione con il punteggio massimo (5)
        val review = Review(
            id = "review_max",
            authorId = "author1",
            targetUserId = "user1",
            skillId = "skill1",
            rating = 5,
            comment = "Eccellente!"
        )
        assertEquals(5, review.rating)
    }

    @Test
    fun testReviewWithEmptyComment() {
        // Crea una recensione con commento vuoto (opzionale)
        val review = Review(
            id = "review_empty",
            authorId = "author1",
            targetUserId = "user1",
            skillId = "skill1",
            rating = 4,
            comment = ""
        )
        assertEquals("", review.comment)
    }

    @Test
    fun testReviewWithLongComment() {
        // Crea una recensione con un commento lungo (500 caratteri)
        val longComment = "A".repeat(500)
        val review = Review(
            id = "review_long",
            authorId = "author1",
            targetUserId = "user1",
            skillId = "skill1",
            rating = 3,
            comment = longComment
        )
        assertEquals(500, review.comment.length)
    }

    @Test
    fun testReviewDataClassEquality() {
        // Verifica che due recensioni con stessi dati siano uguali
        val review1 = Review(
            id = "review_eq",
            authorId = "author1",
            targetUserId = "user1",
            skillId = "skill1",
            rating = 5,
            comment = "Ottimo!"
        )
        val review2 = Review(
            id = "review_eq",
            authorId = "author1",
            targetUserId = "user1",
            skillId = "skill1",
            rating = 5,
            comment = "Ottimo!"
        )
        assertEquals(review1, review2)
    }

    @Test
    fun testReviewToString() {
        // Verifica che il toString non sia vuoto e contenga informazioni chiave
        val review = Review(
            id = "review_str",
            authorId = "author1",
            targetUserId = "user1",
            skillId = "skill1",
            rating = 4,
            comment = "Buon lavoro"
        )
        val toString = review.toString()
        assertTrue(toString.contains("review_str"))
        assertTrue(toString.contains("4"))
        assertTrue(toString.contains("Buon lavoro"))
    }
}