const express = require('express');
const router = express.Router();
const bountyController = require('../controllers/bountyController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * /api/bounties:
 *   get:
 *     summary: List all bounties
 *     tags: [Bounties]
 *     responses:
 *       200:
 *         description: List of bounties
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Bounty'
 */
router.get('/', bountyController.getAll);

/**
 * @swagger
 * /api/bounties/stats:
 *   get:
 *     summary: Get bounty statistics
 *     tags: [Bounties]
 *     responses:
 *       200:
 *         description: Bounty statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     inProgress:
 *                       type: integer
 *                     open:
 *                       type: integer
 */
router.get('/stats', bountyController.getStats);

/**
 * @swagger
 * /api/bounties/create:
 *   post:
 *     summary: Create a new bounty
 *     tags: [Bounties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - issueNumber
 *               - issueUrl
 *               - repository
 *               - amount
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               issueNumber:
 *                 type: integer
 *               issueUrl:
 *                 type: string
 *               repository:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Bounty created
 *       401:
 *         description: Unauthorized
 */
router.post('/create', authenticate, bountyController.create);

/**
 * @swagger
 * /api/bounties/{id}/assign:
 *   patch:
 *     summary: Assign a bounty to a user
 *     tags: [Bounties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedToUsername
 *               - walletAddress
 *             properties:
 *               assignedToUsername:
 *                 type: string
 *               walletAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bounty assigned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bounty not found
 */
router.patch('/:id/assign', authenticate, bountyController.assign);

/**
 * @swagger
 * /api/bounties/{id}/complete:
 *   patch:
 *     summary: Mark a bounty as completed
 *     tags: [Bounties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentTxHash
 *               - prNumber
 *               - prUrl
 *             properties:
 *               paymentTxHash:
 *                 type: string
 *               prNumber:
 *                 type: integer
 *               prUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bounty completed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bounty not found
 */
router.patch('/:id/complete', authenticate, bountyController.complete);

module.exports = router;
