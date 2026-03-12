const express = require('express');
const router = express.Router();
const { getAllPayments, getPaymentById, createPayment } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { paymentSchema } = require('../validations/schemas');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Enregistrement des paiements manuels
 */

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Lister tous les paiements
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: invoice
 *         schema:
 *           type: string
 *       - in: query
 *         name: client
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des paiements
 */
router.get('/', authenticate, getAllPayments);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Obtenir un paiement par ID
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Données du paiement
 */
router.get('/:id', authenticate, getPaymentById);

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Enregistrer un paiement manuel
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoice, amount, paymentMethod]
 *             properties:
 *               invoice:
 *                 type: string
 *                 description: ID de la facture
 *               amount:
 *                 type: number
 *                 example: 500.00
 *               paymentMethod:
 *                 type: string
 *                 enum: [virement, cheque, especes, carte, autre]
 *               paymentDate:
 *                 type: string
 *                 format: date
 *               reference:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Paiement enregistré
 *       400:
 *         description: Montant invalide ou facture déjà payée
 */
router.post('/', authenticate, validate(paymentSchema), createPayment);

module.exports = router;
