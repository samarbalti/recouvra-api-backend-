const express = require('express');
const router = express.Router();
const { getAllActions, getActionById, createAction, updateAction, deleteAction } = require('../controllers/recoveryController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { recoveryActionSchema, updateRecoveryActionSchema } = require('../validations/schemas');

/**
 * @swagger
 * tags:
 *   name: Recovery Actions
 *   description: Suivi des actions de recouvrement
 */

/**
 * @swagger
 * /recovery-actions:
 *   get:
 *     summary: Lister toutes les actions de recouvrement
 *     tags: [Recovery Actions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planifie, en_cours, effectue, echoue, annule]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [appel, email, courrier, visite, relance, mise_en_demeure]
 *       - in: query
 *         name: invoice
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des actions de recouvrement
 */
router.get('/', authenticate, getAllActions);
router.get('/:id', authenticate, getActionById);

/**
 * @swagger
 * /recovery-actions:
 *   post:
 *     summary: Créer une action de recouvrement
 *     tags: [Recovery Actions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoice, type, scheduledDate]
 *             properties:
 *               invoice:
 *                 type: string
 *                 description: ID de la facture
 *               type:
 *                 type: string
 *                 enum: [appel, email, courrier, visite, relance, mise_en_demeure]
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               nextActionDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Action créée
 */
router.post('/', authenticate, validate(recoveryActionSchema), createAction);

/**
 * @swagger
 * /recovery-actions/{id}:
 *   put:
 *     summary: Mettre à jour une action
 *     tags: [Recovery Actions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [planifie, en_cours, effectue, echoue, annule]
 *               result:
 *                 type: string
 *               completedDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Action mise à jour
 */
router.put('/:id', authenticate, validate(updateRecoveryActionSchema), updateAction);
router.delete('/:id', authenticate, authorize('manager', 'admin'), deleteAction);

module.exports = router;
