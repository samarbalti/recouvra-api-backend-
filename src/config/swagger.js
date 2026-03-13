// On importe swagger-jsdoc pour générer la documentation Swagger
const swaggerJsdoc = require('swagger-jsdoc');

// Configuration de Swagger
const options = {
  definition: {
    // Version OpenAPI
    openapi: '3.0.0',

    // Informations sur l'API
    info: {
      title: 'Mon API de Recouvrement',     
      version: '1.0.0',                      // Version actuelle
      description: 'API REST créée par moi pour gérer les factures impayées', 
      contact: {
        name: 'Samar Balti',                
        email: 'samar.balti@example.com',  
      },
    },

    // defini des  Serveurs où l'API est disponible
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
        bearerAuth: {  //le nom que tu donnes à ce type de sécurité  Tu peux l’utiliser ensuite dans security: [{ bearerAuth: [] }] 
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

    // sécurité yaani token à toutes les routes
    security: [{ bearerAuth: [] }],
  },

  apis: ['./src/routes/*.js'],
};

// Export de la configuration pour l'utiliser dans ton serveur Express
module.exports = swaggerJsdoc(options);