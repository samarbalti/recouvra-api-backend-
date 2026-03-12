const express = require('express');
const router = express.Router();
const { getAllInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice } = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { invoiceSchema, updateInvoiceSchema } = require('../validations/schemas');

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Gestion des factures
 */

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Lister toutes les factures
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [en_attente, partiel, paye, en_retard, annule]
 *       - in: query
 *         name: client
 *         schema:
 *           type: string
 *         description: ID du client
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste paginée des factures
 */
router.get('/', authenticate, getAllInvoices);

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Obtenir une facture par ID
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Données de la facture
 *       404:
 *         description: Facture introuvable
 */
router.get('/:id', authenticate, getInvoiceById);

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Créer une facture
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoiceNumber, client, amount, dueDate]
 *             properties:
 *               invoiceNumber:
 *                 type: string
 *                 example: "FAC-2024-001"
 *               client:
 *                 type: string
 *                 description: ID du client
 *               amount:
 *                 type: number
 *                 example: 1500.00
 *               dueDate:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Facture créée
 */
router.post('/', authenticate, validate(invoiceSchema), createInvoice);

/**
 * @swagger
 * /invoices/{id}:
 *   put:
 *     summary: Modifier une facture
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Facture mise à jour
 */
router.put('/:id', authenticate, validate(updateInvoiceSchema), updateInvoice);

/**
 * @swagger
 * /invoices/{id}:
 *   delete:
 *     summary: Supprimer une facture (manager/admin)
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Facture supprimée
 */
router.delete('/:id', authenticate, authorize('manager', 'admin'), deleteInvoice);

module.exports = router;
