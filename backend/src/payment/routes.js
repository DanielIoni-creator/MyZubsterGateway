const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Gestione pagamenti Monero
 */

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Ottieni la lista dei pagamenti (simulato)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Payment routes are working!
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["GET /", "GET /stats", "POST /", "GET /:id/status"]
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Payment routes are working!',
    endpoints: ['GET /', 'GET /stats', 'POST /', 'GET /:id/status']
  });
});

/**
 * @swagger
 * /payments/stats:
 *   get:
 *     summary: Ottieni le statistiche dei pagamenti
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalPayments:
 *                       type: integer
 *                       example: 0
 *                     pendingPayments:
 *                       type: integer
 *                       example: 0
 *                     confirmedPayments:
 *                       type: integer
 *                       example: 0
 *                     releasedPayments:
 *                       type: integer
 *                       example: 0
 *                     totalFees:
 *                       type: number
 *                       example: 0
 *                     totalReleased:
 *                       type: number
 *                       example: 0
 *                     platformWallet:
 *                       type: string
 *                       example: "Not configured"
 */
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalPayments: 0,
      pendingPayments: 0,
      confirmedPayments: 0,
      releasedPayments: 0,
      totalFees: 0,
      totalReleased: 0,
      platformWallet: process.env.PLATFORM_FEE_WALLET_ADDRESS || 'Not configured'
    }
  });
});

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Inizia un pagamento (simulato)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 100
 *                 description: Importo in XMR
 *               bookingId:
 *                 type: string
 *                 example: "65f1a2b3c4d5e6f7g8h9i0j1"
 *                 description: ID della prenotazione (opzionale)
 *     responses:
 *       201:
 *         description: Pagamento creato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Payment initiated (simulation mode)
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                       example: "sim_1783258342806"
 *                     amount:
 *                       type: number
 *                       example: 100
 *                     address:
 *                       type: string
 *                       example: "simulated_address_1783258342806"
 *                     feeInfo:
 *                       type: object
 *                       properties:
 *                         feePercent:
 *                           type: number
 *                           example: 2
 *                         feeAmount:
 *                           type: number
 *                           example: 2
 *                         netAmount:
 *                           type: number
 *                           example: 98
 *       400:
 *         description: Errore nella richiesta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', (req, res) => {
  const amount = req.body.amount || 0;
  const feeAmount = amount * 0.02;
  const netAmount = amount - feeAmount;

  res.status(201).json({
    success: true,
    message: 'Payment initiated (simulation mode)',
    data: {
      paymentId: 'sim_' + Date.now(),
      amount: amount,
      address: 'simulated_address_' + Date.now(),
      feeInfo: {
        feePercent: 2,
        feeAmount: feeAmount,
        netAmount: netAmount
      }
    }
  });
});

/**
 * @swagger
 * /payments/{id}/status:
 *   get:
 *     summary: Verifica lo stato di un pagamento (simulato)
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pagamento
 *     responses:
 *       200:
 *         description: Stato del pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "sim_1783258342806"
 *                     status:
 *                       type: string
 *                       example: "simulated"
 *                     confirmations:
 *                       type: integer
 *                       example: 10
 *                     message:
 *                       type: string
 *                       example: "Payment confirmed (simulation mode)"
 *       404:
 *         description: Pagamento non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/status', (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      status: 'simulated',
      confirmations: 10,
      message: 'Payment confirmed (simulation mode)'
    }
  });
});

module.exports = router;