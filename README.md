# Recouvra+ API

> API REST de gestion du recouvrement des factures impayées

## 🛠 Technologies

| Technologie | Version | Rôle |
|-------------|---------|------|
| Node.js | 22.x | Runtime |
| Express.js | 4.x | Framework API REST |
| MongoDB | Latest | Base de données |
| Mongoose | 8.x | ODM MongoDB |
| JWT | 9.x | Authentification |
| Joi | 17.x | Validation des données |
| Swagger | 6.x | Documentation API |
| Jest + Supertest | 29.x | Tests unitaires |

---

## 📁 Structure du Projet

```
recouvra-api/
├── src/
│   ├── config/
│   │   ├── database.js        # Connexion MongoDB
│   │   └── swagger.js         # Configuration Swagger
│   ├── controllers/
│   │   ├── authController.js  # Inscription / Connexion
│   │   ├── userController.js  # CRUD Utilisateurs
│   │   ├── clientController.js# CRUD Clients
│   │   ├── invoiceController.js  # CRUD Factures
│   │   ├── paymentController.js  # Paiements manuels
│   │   ├── recoveryController.js # Actions de recouvrement
│   │   └── statsController.js    # Statistiques
│   ├── middleware/
│   │   ├── auth.js            # JWT + Autorisation par rôle
│   │   ├── validate.js        # Validation Joi
│   │   └── errorHandler.js    # Gestion centralisée des erreurs
│   ├── models/
│   │   ├── User.js            # Utilisateurs (agent, manager, admin)
│   │   ├── Client.js          # Clients débiteurs
│   │   ├── Invoice.js         # Factures impayées
│   │   ├── Payment.js         # Paiements enregistrés
│   │   └── RecoveryAction.js  # Actions de recouvrement
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── clientRoutes.js
│   │   ├── invoiceRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── recoveryRoutes.js
│   │   └── statsRoutes.js
│   ├── validations/
│   │   └── schemas.js         # Schémas Joi pour chaque entité
│   ├── app.js                 # Configuration Express
│   └── server.js              # Point d'entrée
├── tests/
│   ├── auth.test.js
│   ├── clients.test.js
│   ├── invoices.test.js
│   └── models.test.js
├── .env
├── .env.test
├── .gitignore
└── package.json
```

---

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 22+
- MongoDB (local ou Atlas)

### Installation
```bash
git clone https://github.com/votre-repo/recouvra-api.git
cd recouvra-api
npm install
```

### Configuration
Créer un fichier `.env` à la racine :
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/recouvra
JWT_SECRET=votre_secret_tres_securise
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### Démarrer en développement
```bash
npm run dev
```

### Démarrer en production
```bash
npm start
```

### Lancer les tests
```bash
npm test
```

---

## 📚 Documentation API

Accéder à la documentation Swagger après démarrage :
```
http://localhost:3000/api-docs
```

---

## 🔗 Endpoints

### Authentification
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Créer un compte | ❌ |
| POST | `/api/v1/auth/login` | Se connecter | ❌ |
| GET | `/api/v1/auth/me` | Mon profil | ✅ |

### Utilisateurs
| Méthode | Endpoint | Description | Rôles |
|---------|----------|-------------|-------|
| GET | `/api/v1/users` | Lister les utilisateurs | manager, admin |
| GET | `/api/v1/users/:id` | Détail utilisateur | Tous |
| PUT | `/api/v1/users/:id` | Modifier utilisateur | Tous (limité) |
| DELETE | `/api/v1/users/:id` | Désactiver utilisateur | admin |

### Clients
| Méthode | Endpoint | Description | Rôles |
|---------|----------|-------------|-------|
| GET | `/api/v1/clients` | Lister clients (paginé) | Tous |
| GET | `/api/v1/clients/:id` | Détail client | Tous |
| POST | `/api/v1/clients` | Créer client | Tous |
| PUT | `/api/v1/clients/:id` | Modifier client | Tous (limité) |
| DELETE | `/api/v1/clients/:id` | Supprimer client | manager, admin |

### Factures
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/invoices` | Lister factures |
| GET | `/api/v1/invoices/:id` | Détail facture |
| POST | `/api/v1/invoices` | Créer facture |
| PUT | `/api/v1/invoices/:id` | Modifier facture |
| DELETE | `/api/v1/invoices/:id` | Supprimer facture |

### Paiements
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/payments` | Lister paiements |
| GET | `/api/v1/payments/:id` | Détail paiement |
| POST | `/api/v1/payments` | Enregistrer paiement |

### Actions de Recouvrement
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/recovery-actions` | Lister actions |
| GET | `/api/v1/recovery-actions/:id` | Détail action |
| POST | `/api/v1/recovery-actions` | Créer action |
| PUT | `/api/v1/recovery-actions/:id` | Mettre à jour action |
| DELETE | `/api/v1/recovery-actions/:id` | Supprimer action |

### Statistiques
| Méthode | Endpoint | Description | Rôles |
|---------|----------|-------------|-------|
| GET | `/api/v1/stats/dashboard` | Tableau de bord | manager, admin |
| GET | `/api/v1/stats/invoices` | Stats factures | manager, admin |

---

## 🔒 Rôles et Permissions

| Action | Agent | Manager | Admin |
|--------|-------|---------|-------|
| Voir ses clients | ✅ | ✅ | ✅ |
| Voir tous les clients | ❌ | ✅ | ✅ |
| Supprimer client | ❌ | ✅ | ✅ |
| Créer facture | ✅ | ✅ | ✅ |
| Supprimer facture | ❌ | ✅ | ✅ |
| Enregistrer paiement | ✅ | ✅ | ✅ |
| Voir statistiques | ❌ | ✅ | ✅ |
| Gérer utilisateurs | ❌ | 👁 | ✅ |

---

## 🧪 Tests

Les tests utilisent **MongoDB In-Memory** pour isoler chaque suite.

```bash
# Lancer tous les tests
npm test

# Avec couverture
npm test -- --coverage

# Fichier spécifique
npm test -- tests/auth.test.js
```

Couverture cible : > 70% des contrôleurs et middlewares.

---

## 📊 Modèles de Données

### User
```json
{ "name": "string", "email": "string", "password": "hashed", "role": "agent|manager|admin", "isActive": "boolean" }
```

### Client
```json
{ "name": "string", "email": "string", "phone": "string", "company": "string", "status": "actif|inactif|bloque", "assignedAgent": "ObjectId" }
```

### Invoice
```json
{ "invoiceNumber": "string", "client": "ObjectId", "amount": "number", "amountPaid": "number", "dueDate": "Date", "status": "en_attente|partiel|paye|en_retard|annule" }
```

### Payment
```json
{ "invoice": "ObjectId", "client": "ObjectId", "amount": "number", "paymentMethod": "virement|cheque|especes|carte|autre", "reference": "string" }
```

### RecoveryAction
```json
{ "invoice": "ObjectId", "agent": "ObjectId", "type": "appel|email|courrier|visite|relance|mise_en_demeure", "status": "planifie|en_cours|effectue|echoue|annule", "scheduledDate": "Date" }
```

---

## 🔑 Authentification

L'API utilise **JWT Bearer Token**. Inclure dans chaque requête protégée :
```
Authorization: Bearer <votre_token>
```

---

## ⚠️ Codes de Réponse

| Code | Signification |
|------|--------------|
| 200 | Succès |
| 201 | Ressource créée |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Accès refusé |
| 404 | Ressource introuvable |
| 409 | Conflit (doublon) |
| 422 | Données invalides (validation) |
| 500 | Erreur serveur |
