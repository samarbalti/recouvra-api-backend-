const express = require('express');
const router = express.Router();
const { getDashboard, getInvoiceStats } = require('../controllers/statsController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Statistiques et tableaux de bord
 */

/**
 * @swagger
 * /stats/dashboard:
 *   get:
 *     summary: Tableau de bord principal
 *     tags: [Statistics]
 *     description: Vue d'ensemble des factures, paiements, clients et actions. Réservé aux managers et admins.
 *     responses:
 *       200:
 *         description: Statistiques globales
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
 *                     overview:
 *                       type: object
 *                     invoicesByStatus:
 *                       type: array
 *                     topDebtors:
 *                       type: array
 *                     monthlyTrend:
 *                       type: array
 */
router.get('/dashboard', authenticate, authorize('manager', 'admin'), getDashboard);

/**
 * @swagger
 * /stats/invoices:
 *   get:
 *     summary: Statistiques des factures
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Statistiques par statut de facture
 */
router.get('/invoices', authenticate, authorize('manager', 'admin'), getInvoiceStats);

module.exports = router;
