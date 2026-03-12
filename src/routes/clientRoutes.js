const express = require('express');
const router = express.Router();
const { getAllClients, getClientById, createClient, updateClient, deleteClient } = require('../controllers/clientController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { clientSchema, updateClientSchema } = require('../validations/schemas');

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Gestion des clients
 */

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Lister tous les clients
 *     tags: [Clients]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [actif, inactif, bloque]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom, email ou entreprise
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Liste paginée des clients
 */
router.get('/', authenticate, getAllClients);

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Obtenir un client par ID
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Données du client
 *       404:
 *         description: Client introuvable
 */
router.get('/:id', authenticate, getClientById);

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Créer un nouveau client
 *     tags: [Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Société ABC"
 *               email:
 *                 type: string
 *                 example: "contact@abc.tn"
 *               phone:
 *                 type: string
 *                 example: "+216 71 000 000"
 *               company:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [actif, inactif, bloque]
 *     responses:
 *       201:
 *         description: Client créé avec succès
 */
router.post('/', authenticate, validate(clientSchema), createClient);

/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     summary: Modifier un client
 *     tags: [Clients]
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
 *     responses:
 *       200:
 *         description: Client mis à jour
 */
router.put('/:id', authenticate, validate(updateClientSchema), updateClient);

/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     summary: Supprimer un client (manager/admin)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client supprimé
 */
router.delete('/:id', authenticate, authorize('manager', 'admin'), deleteClient);

module.exports = router;
