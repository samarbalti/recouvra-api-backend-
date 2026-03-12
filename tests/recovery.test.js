/**
 * TESTS UNITAIRES — Actions de Recouvrement
 * Couvre : GET, POST, PUT, DELETE /recovery-actions
 */

require('dotenv').config({ path: '.env.test' });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Client = require('../src/models/Client');
const Invoice = require('../src/models/Invoice');
const RecoveryAction = require('../src/models/RecoveryAction');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;
let managerToken, managerId;
let agentToken, agentId;
let agent2Token, agent2Id;
let clientId;
let invoiceId;
let paidInvoiceId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Créer manager
  const mRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Manager', email: 'manager@rec.com', password: 'password123', role: 'manager',
  });
  managerToken = mRes.body.data.token;
  managerId = mRes.body.data.user._id;

  // Créer agent 1
  const aRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Agent 1', email: 'agent1@rec.com', password: 'password123', role: 'agent',
  });
  agentToken = aRes.body.data.token;
  agentId = aRes.body.data.user._id;

  // Créer agent 2
  const a2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Agent 2', email: 'agent2@rec.com', password: 'password123', role: 'agent',
  });
  agent2Token = a2Res.body.data.token;
  agent2Id = a2Res.body.data.user._id;

  // Créer client et factures
  const client = await Client.create({ name: 'Client Rec', email: 'rec@test.com' });
  clientId = client._id;

  const invoice = await Invoice.create({
    invoiceNumber: 'REC-001',
    client: clientId,
    amount: 5000,
    dueDate: new Date('2020-01-01'), // en retard
    createdBy: managerId,
  });
  invoiceId = invoice._id;

  const paidInvoice = await Invoice.create({
    invoiceNumber: 'REC-PAID',
    client: clientId,
    amount: 1000,
    amountPaid: 1000,
    dueDate: new Date('2025-12-31'),
    createdBy: managerId,
  });
  paidInvoiceId = paidInvoice._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await RecoveryAction.deleteMany({});
});

// ─── POST /recovery-actions ──────────────────────────────────────────────────

describe('🔁 Recovery - POST /api/v1/recovery-actions', () => {
  it('devrait créer une action de recouvrement valide', async () => {
    const res = await request(app)
      .post('/api/v1/recovery-actions')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        invoice: invoiceId,
        type: 'appel',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        notes: 'Premier appel de relance',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.action.type).toBe('appel');
    expect(res.body.data.action.status).toBe('planifie');
    expect(res.body.data.action.agent).toBeDefined();
    expect(res.body.data.action.client).toBeDefined();
  });

  it('devrait créer une action de type email', async () => {
    const res = await request(app)
      .post('/api/v1/recovery-actions')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        invoice: invoiceId,
        type: 'email',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.action.type).toBe('email');
  });

  it('devrait créer une mise en demeure', async () => {
    const res = await request(app)
      .post('/api/v1/recovery-actions')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        invoice: invoiceId,
        type: 'mise_en_demeure',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        notes: 'Mise en demeure formelle',
        nextActionDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.action.type).toBe('mise_en_demeure');
  });

  it('devrait rejeter un type d\'action invalide', async () => {
    const res = await request(app)
      .post('/api/v1/recovery-actions')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        invoice: invoiceId,
        type: 'telepathe', // invalide
        scheduledDate: new Date().toISOString(),
      });

    expect(res.status).toBe(422);
  });

  it('devrait rejeter si la facture est déjà payée', async () => {
    const res = await request(app)
      .post('/api/v1/recovery-actions')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        invoice: paidInvoiceId,
        type: 'appel',
        scheduledDate: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('devrait rejeter si la facture n\'existe pas', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/v1/recovery-actions')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        invoice: fakeId,
        type: 'appel',
        scheduledDate: new Date().toISOString(),
      });

    expect(res.status).toBe(404);
  });

  it('devrait rejeter sans authentification', async () => {
    const res = await request(app)
      .post('/api/v1/recovery-actions')
      .send({ invoice: invoiceId, type: 'appel', scheduledDate: new Date().toISOString() });

    expect(res.status).toBe(401);
  });

  it('devrait assigner automatiquement l\'agent connecté', async () => {
    const res = await request(app)
      .post('/api/v1/recovery-actions')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        invoice: invoiceId,
        type: 'visite',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.action.agent._id).toBe(agentId.toString());
  });
});

// ─── GET /recovery-actions ───────────────────────────────────────────────────

describe('🔁 Recovery - GET /api/v1/recovery-actions', () => {
  beforeEach(async () => {
    await RecoveryAction.create([
      {
        invoice: invoiceId, client: clientId, agent: agentId,
        type: 'appel', status: 'planifie',
        scheduledDate: new Date(Date.now() + 86400000),
      },
      {
        invoice: invoiceId, client: clientId, agent: agent2Id,
        type: 'email', status: 'effectue',
        scheduledDate: new Date(Date.now() - 86400000),
        completedDate: new Date(),
      },
    ]);
  });

  it('un manager voit toutes les actions', async () => {
    const res = await request(app)
      .get('/api/v1/recovery-actions')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.actions.length).toBe(2);
  });

  it('un agent ne voit que ses propres actions', async () => {
    const res = await request(app)
      .get('/api/v1/recovery-actions')
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.actions.length).toBe(1);
    expect(res.body.data.actions[0].agent._id).toBe(agentId.toString());
  });

  it('devrait filtrer par statut', async () => {
    const res = await request(app)
      .get('/api/v1/recovery-actions?status=effectue')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.actions.length).toBe(1);
    expect(res.body.data.actions[0].status).toBe('effectue');
  });

  it('devrait filtrer par type', async () => {
    const res = await request(app)
      .get('/api/v1/recovery-actions?type=appel')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    res.body.data.actions.forEach((a) => expect(a.type).toBe('appel'));
  });

  it('devrait filtrer par facture', async () => {
    const res = await request(app)
      .get(`/api/v1/recovery-actions?invoice=${invoiceId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.actions.length).toBe(2);
  });

  it('devrait inclure pagination', async () => {
    const res = await request(app)
      .get('/api/v1/recovery-actions?page=1&limit=1')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.actions.length).toBe(1);
    expect(res.body.data.pagination.total).toBe(2);
  });
});

// ─── GET /recovery-actions/:id ───────────────────────────────────────────────

describe('🔁 Recovery - GET /api/v1/recovery-actions/:id', () => {
  let actionId;

  beforeEach(async () => {
    const action = await RecoveryAction.create({
      invoice: invoiceId, client: clientId, agent: agentId,
      type: 'courrier', status: 'planifie',
      scheduledDate: new Date(Date.now() + 86400000),
    });
    actionId = action._id;
  });

  it('devrait retourner le détail d\'une action', async () => {
    const res = await request(app)
      .get(`/api/v1/recovery-actions/${actionId}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.action._id).toBe(actionId.toString());
    expect(res.body.data.action.invoice).toBeDefined();
    expect(res.body.data.action.client).toBeDefined();
  });

  it('devrait retourner 404 pour un ID inexistant', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/recovery-actions/${fakeId}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── PUT /recovery-actions/:id ───────────────────────────────────────────────

describe('🔁 Recovery - PUT /api/v1/recovery-actions/:id', () => {
  let actionId;

  beforeEach(async () => {
    const action = await RecoveryAction.create({
      invoice: invoiceId, client: clientId, agent: agentId,
      type: 'appel', status: 'planifie',
      scheduledDate: new Date(Date.now() + 86400000),
    });
    actionId = action._id;
  });

  it('devrait mettre à jour le statut d\'une action', async () => {
    const res = await request(app)
      .put(`/api/v1/recovery-actions/${actionId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'en_cours' });

    expect(res.status).toBe(200);
    expect(res.body.data.action.status).toBe('en_cours');
  });

  it('devrait ajouter une date de complétion quand status = effectue', async () => {
    const res = await request(app)
      .put(`/api/v1/recovery-actions/${actionId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        status: 'effectue',
        result: 'Le client a promis de payer sous 48h',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.action.status).toBe('effectue');
    expect(res.body.data.action.completedDate).toBeDefined();
    expect(res.body.data.action.result).toBe('Le client a promis de payer sous 48h');
  });

  it('un agent ne peut pas modifier l\'action d\'un autre agent', async () => {
    const res = await request(app)
      .put(`/api/v1/recovery-actions/${actionId}`)
      .set('Authorization', `Bearer ${agent2Token}`)
      .send({ status: 'annule' });

    expect(res.status).toBe(403);
  });

  it('un manager peut modifier n\'importe quelle action', async () => {
    const res = await request(app)
      .put(`/api/v1/recovery-actions/${actionId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'echoue', notes: 'Client injoignable' });

    expect(res.status).toBe(200);
    expect(res.body.data.action.status).toBe('echoue');
  });

  it('devrait rejeter un statut invalide', async () => {
    const res = await request(app)
      .put(`/api/v1/recovery-actions/${actionId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'statut_fantaisiste' });

    expect(res.status).toBe(422);
  });
});

// ─── DELETE /recovery-actions/:id ────────────────────────────────────────────

describe('🔁 Recovery - DELETE /api/v1/recovery-actions/:id', () => {
  let actionId;

  beforeEach(async () => {
    const action = await RecoveryAction.create({
      invoice: invoiceId, client: clientId, agent: agentId,
      type: 'relance', status: 'planifie',
      scheduledDate: new Date(Date.now() + 86400000),
    });
    actionId = action._id;
  });

  it('un manager peut supprimer une action', async () => {
    const res = await request(app)
      .delete(`/api/v1/recovery-actions/${actionId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await RecoveryAction.findById(actionId);
    expect(deleted).toBeNull();
  });

  it('un agent ne peut pas supprimer une action', async () => {
    const res = await request(app)
      .delete(`/api/v1/recovery-actions/${actionId}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(403);
  });

  it('devrait retourner 404 pour un ID inexistant', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/v1/recovery-actions/${fakeId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(404);
  });
});
