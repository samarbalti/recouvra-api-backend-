const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validations/schemas');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification et gestion de session
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Créer un compte utilisateur
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Ahmed Ben Ali"
 *               email:
 *                 type: string
 *                 example: "ahmed@example.com"
 *               password:
 *                 type: string
 *                 example: "motdepasse123"
 *               role:
 *                 type: string
 *                 enum: [agent, manager, admin]
 *                 default: agent
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 *       409:
 *         description: Email déjà utilisé
 *       422:
 *         description: Données invalides
 */
router.post('/register', validate(registerSchema), register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Se connecter
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "ahmed@example.com"
 *               password:
 *                 type: string
 *                 example: "motdepasse123"
 *     responses:
 *       200:
 *         description: Connexion réussie avec token JWT
 *       401:
 *         description: Identifiants incorrects
 */
router.post('/login', validate(loginSchema), login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtenir le profil de l'utilisateur connecté
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *       401:
 *         description: Non authentifié
 */
router.get('/me', authenticate, getMe);

module.exports = router;
