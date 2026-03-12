require('dotenv').config({ path: '.env.test' });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Client = require('../src/models/Client');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;
let adminToken;
let agentToken;
let adminUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Créer admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
  });
  adminToken = adminRes.body.data.token;
  adminUser = adminRes.body.data.user;

  // Créer agent
  const agentRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Agent User',
    email: 'agent@test.com',
    password: 'password123',
    role: 'agent',
  });
  agentToken = agentRes.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Client.deleteMany({});
});

describe('👥 Clients - GET /api/v1/clients', () => {
  it('devrait lister les clients (admin)', async () => {
    await Client.create({ name: 'Client A', email: 'a@test.com' });
    await Client.create({ name: 'Client B', email: 'b@test.com' });

    const res = await request(app)
      .get('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.clients.length).toBe(2);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('devrait rejeter sans authentification', async () => {
    const res = await request(app).get('/api/v1/clients');
    expect(res.status).toBe(401);
  });
});

describe('👥 Clients - POST /api/v1/clients', () => {
  it('devrait créer un client valide', async () => {
    const res = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nouveau Client',
        email: 'nouveau@test.com',
        phone: '+216 71 000 000',
        company: 'Société Test',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.client.name).toBe('Nouveau Client');
  });

  it('devrait rejeter un email invalide', async () => {
    const res = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test', email: 'emailinvalide' });

    expect(res.status).toBe(422);
  });

  it('devrait rejeter un email dupliqué', async () => {
    await Client.create({ name: 'Existant', email: 'exist@test.com' });

    const res = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nouveau', email: 'exist@test.com' });

    expect(res.status).toBe(409);
  });
});

describe('👥 Clients - PUT /api/v1/clients/:id', () => {
  it('devrait modifier un client existant', async () => {
    const client = await Client.create({ name: 'Ancien Nom', email: 'ancien@test.com' });

    const res = await request(app)
      .put(`/api/v1/clients/${client._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nouveau Nom', status: 'inactif' });

    expect(res.status).toBe(200);
    expect(res.body.data.client.name).toBe('Nouveau Nom');
    expect(res.body.data.client.status).toBe('inactif');
  });

  it('devrait retourner 404 pour un ID inexistant', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/v1/clients/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test' });

    expect(res.status).toBe(404);
  });
});

describe('👥 Clients - DELETE /api/v1/clients/:id', () => {
  it('devrait supprimer un client (manager/admin)', async () => {
    const client = await Client.create({ name: 'A Supprimer', email: 'del@test.com' });

    const res = await request(app)
      .delete(`/api/v1/clients/${client._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('devrait refuser la suppression à un agent', async () => {
    const client = await Client.create({ name: 'Protégé', email: 'prot@test.com' });

    const res = await request(app)
      .delete(`/api/v1/clients/${client._id}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(403);
  });
});
