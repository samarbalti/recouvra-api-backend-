// On importe swagger-jsdoc pour générer la documentation Swagger
const swaggerJsdoc = require('swagger-jsdoc');

// Configuration de Swagger
const options = {
  definition: {
    // Version OpenAPI
    openapi: '3.0.0',

    // Informations sur l'API
    info: {
      title: 'Mon API de Recouvrement',     // Nom de ton API (original)
      version: '1.0.0',                      // Version actuelle
      description: 'API REST créée par moi pour gérer les factures impayées', // Description du projet
      contact: {
        name: 'Samar Balti',                // Ton nom pour montrer que c'est ton travail
        email: 'samar.balti@example.com',   // Ton email
      },
    },

    // Serveurs où l'API est disponible
    servers: [
      {
        url: 'http://localhost:3000/api/v1', // URL du serveur de dev
        description: 'Serveur de développement', // Description
      },
    ],

    // Composants réutilisables
    components: {
      // Définition de la sécurité (authentification JWT)
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT', // JSON Web Token
        },
      },

      // Schémas réutilisables pour les réponses
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false }, // Booléen pour échec
            message: { type: 'string' },                  // Message d'erreur
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true }, // Booléen pour succès
            message: { type: 'string' },                 // Message de succès
          },
        },
      },
    },

    // Sécurité globale appliquée à toutes les routes
    security: [{ bearerAuth: [] }],
  },

  // Chemins vers les fichiers où Swagger va chercher les annotations
  apis: ['./src/routes/*.js'],
};

// Export de la configuration pour l'utiliser dans ton serveur Express
module.exports = swaggerJsdoc(options);