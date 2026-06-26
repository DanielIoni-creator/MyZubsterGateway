package com.myzubster.models

/**
 * Stato lifecycle di una transazione Monero in MyZubster.
 *
 * PENDING: richiesta creata, pagamento non ancora rilevato.
 * CONFIRMED: pagamento rilevato con le conferme richieste sulla blockchain Monero.
 * COMPLETED: servizio/ordine completato dopo la conferma del pagamento.
 * FAILED: pagamento annullato, scaduto o non valido.
 */
enum class TransactionStatus {
    PENDING,
    CONFIRMED,
    COMPLETED,
    FAILED
}

/**
 * Modello dati locale per tracciare una transazione XMR collegata a una richiesta di pagamento.
 * Le chiavi private non vengono mai salvate nel client: il client conserva solo riferimenti pubblici.
 */
data class MoneroTransaction(
    val id: String,
    val paymentId: String,
    val amount: Double,
    val recipientAddress: String,
    val status: TransactionStatus,
    val createdAt: Long,
    val confirmedAt: Long? = null,
    val description: String? = null
)

/**
 * Richiesta app-level per creare un pagamento verso un venditore.
 */
data class PaymentRequest(
    val amount: Double,
    val description: String,
    val sellerId: String
)
