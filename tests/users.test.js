/**
 * TESTS UNITAIRES — Gestion des Utilisateurs
 * Couvre : GET /users, GET /users/:id, PUT /users/:id, DELETE /users/:id
 */

require('dotenv').config({ path: '.env.test' });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;
let adminToken, adminId;
let managerToken, managerId;
let agentToken, agentId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Créer admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin Principal',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
  });
  adminToken = adminRes.body.data.token;
  adminId = adminRes.body.data.user._id;

  // Créer manager
  const managerRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Manager Test',
    email: 'manager@test.com',
    password: 'password123',
    role: 'manager',
  });
  managerToken = managerRes.body.data.token;
  managerId = managerRes.body.data.user._id;

  // Créer agent
  const agentRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Agent Test',
    email: 'agent@test.com',
    password: 'password123',
    role: 'agent',
  });
  agentToken = agentRes.body.data.token;
  agentId = agentRes.body.data.user._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ─── GET /users ─────────────────────────────────────────────────────────────

describe('👤 Users - GET /api/v1/users', () => {
  it('devrait lister tous les utilisateurs (admin)', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(3);
  });

  it('devrait lister tous les utilisateurs (manager)', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('devrait refuser l\'accès à un agent', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('devrait refuser sans token', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('devrait filtrer par rôle', async () => {
    const res = await request(app)
      .get('/api/v1/users?role=agent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.users.forEach((u) => expect(u.role).toBe('agent'));
  });

  it('devrait paginer les résultats', async () => {
    const res = await request(app)
      .get('/api/v1/users?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBeLessThanOrEqual(2);
    expect(res.body.data.pagination.limit).toBe(2);
  });

  it('ne devrait pas exposer les mots de passe', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    res.body.data.users.forEach((u) => {
      expect(u.password).toBeUndefined();
    });
  });
});

// ─── GET /users/:id ──────────────────────────────────────────────────────────

describe('👤 Users - GET /api/v1/users/:id', () => {
  it('devrait retourner un utilisateur par son ID', async () => {
    const res = await request(app)
      .get(`/api/v1/users/${agentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user._id).toBe(agentId);
    expect(res.body.data.user.name).toBe('Agent Test');
  });

  it('devrait retourner 404 pour un ID inexistant', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/users/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('devrait retourner 400 pour un ID mal formé', async () => {
    const res = await request(app)
      .get('/api/v1/users/id-invalide')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('un agent peut voir son propre profil', async () => {
    const res = await request(app)
      .get(`/api/v1/users/${agentId}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(200);
  });
});

// ─── PUT /users/:id ──────────────────────────────────────────────────────────

describe('👤 Users - PUT /api/v1/users/:id', () => {
  it('un admin peut modifier n\'importe quel utilisateur', async () => {
    const res = await request(app)
      .put(`/api/v1/users/${agentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Agent Modifié' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Agent Modifié');
  });

  it('un admin peut changer le rôle d\'un utilisateur', async () => {
    const res = await request(app)
      .put(`/api/v1/users/${agentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'manager' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('manager');

    // Remettre agent pour les autres tests
    await User.findByIdAndUpdate(agentId, { role: 'agent' });
  });

  it('un agent ne peut pas changer le rôle', async () => {
    const res = await request(app)
      .put(`/api/v1/users/${agentId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(403);
  });

  it('un agent ne peut pas modifier un autre utilisateur', async () => {
    const res = await request(app)
      .put(`/api/v1/users/${managerId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ name: 'Tentative' });

    expect(res.status).toBe(403);
  });

  it('devrait valider les données (email invalide)', async () => {
    const res = await request(app)
      .put(`/api/v1/users/${agentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'pas-un-email' });

    expect(res.status).toBe(422);
  });

  it('devrait retourner 404 pour un ID inexistant', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/v1/users/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test' });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /users/:id ───────────────────────────────────────────────────────

describe('👤 Users - DELETE /api/v1/users/:id', () => {
  let tempUserId;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Temp User',
      email: `temp_${Date.now()}@test.com`,
      password: 'password123',
      role: 'agent',
    });
    tempUserId = res.body.data.user._id;
  });

  it('un admin peut désactiver un utilisateur', async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${tempUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Vérifier que le compte est désactivé (pas supprimé)
    const user = await User.findById(tempUserId);
    expect(user).not.toBeNull();
    expect(user.isActive).toBe(false);
  });

  it('un manager ne peut pas supprimer un utilisateur', async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${tempUserId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
  });

  it('un agent ne peut pas supprimer un utilisateur', async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${tempUserId}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(403);
  });

  it('un admin ne peut pas supprimer son propre compte', async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('devrait retourner 404 pour un ID inexistant', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/v1/users/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
