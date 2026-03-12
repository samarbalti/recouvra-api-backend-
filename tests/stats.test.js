/**
 * TESTS UNITAIRES — Statistiques
 * Couvre : GET /stats/dashboard, GET /stats/invoices
 */

require('dotenv').config({ path: '.env.test' });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Client = require('../src/models/Client');
const Invoice = require('../src/models/Invoice');
const Payment = require('../src/models/Payment');
const RecoveryAction = require('../src/models/RecoveryAction');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;
let adminToken, managerId;
let agentToken;
let clientId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Créer manager/admin
  const mRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin Stats', email: 'admin@stats.com', password: 'password123', role: 'admin',
  });
  adminToken = mRes.body.data.token;
  managerId = mRes.body.data.user._id;

  // Créer agent
  const aRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Agent Stats', email: 'agent@stats.com', password: 'password123', role: 'agent',
  });
  agentToken = aRes.body.data.token;

  // Créer client
  const client = await Client.create({ name: 'Client Stats', email: 'stats@client.com' });
  clientId = client._id;

  // Créer des factures variées pour les stats
  const invoice1 = await Invoice.create({
    invoiceNumber: 'STAT-001', client: clientId, amount: 3000,
    amountPaid: 3000, dueDate: new Date('2025-12-31'), createdBy: managerId,
  }); // paye

  const invoice2 = await Invoice.create({
    invoiceNumber: 'STAT-002', client: clientId, amount: 2000,
    dueDate: new Date('2020-01-01'), createdBy: managerId,
  }); // en_retard

  const invoice3 = await Invoice.create({
    invoiceNumber: 'STAT-003', client: clientId, amount: 1500,
    amountPaid: 500, dueDate: new Date('2025-12-31'), createdBy: managerId,
  }); // partiel

  // Créer des paiements
  await Payment.create({
    invoice: invoice1._id, client: clientId, amount: 3000,
    paymentMethod: 'virement', recordedBy: managerId,
    paymentDate: new Date(),
  });

  await Payment.create({
    invoice: invoice3._id, client: clientId, amount: 500,
    paymentMethod: 'cheque', recordedBy: managerId,
    paymentDate: new Date(),
  });

  // Créer une action de recouvrement
  await RecoveryAction.create({
    invoice: invoice2._id, client: clientId, agent: managerId,
    type: 'appel', status: 'planifie',
    scheduledDate: new Date(Date.now() + 86400000),
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ─── GET /stats/dashboard ────────────────────────────────────────────────────

describe('📊 Stats - GET /api/v1/stats/dashboard', () => {
  it('devrait retourner le tableau de bord (admin)', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('devrait contenir une section overview', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const { overview } = res.body.data;
    expect(overview).toBeDefined();
    expect(overview.totalInvoices).toBeGreaterThanOrEqual(3);
    expect(overview.totalAmount).toBeGreaterThan(0);
    expect(overview.totalCollected).toBeGreaterThan(0);
    expect(overview.totalPending).toBeGreaterThanOrEqual(0);
    expect(typeof overview.collectionRate).toBe('number');
  });

  it('devrait contenir les stats par statut', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const { invoicesByStatus } = res.body.data;
    expect(Array.isArray(invoicesByStatus)).toBe(true);
    expect(invoicesByStatus.length).toBeGreaterThan(0);

    invoicesByStatus.forEach((stat) => {
      expect(stat._id).toBeDefined();  // statut
      expect(stat.count).toBeGreaterThan(0);
      expect(stat.totalAmount).toBeGreaterThan(0);
    });
  });

  it('devrait contenir le nombre de clients actifs', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data.overview.activeClients).toBeGreaterThanOrEqual(1);
  });

  it('devrait contenir les actions en attente', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data.overview.pendingActions).toBeGreaterThanOrEqual(1);
  });

  it('devrait contenir les paiements du mois courant', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const { currentMonth } = res.body.data;
    expect(currentMonth).toBeDefined();
    expect(typeof currentMonth.totalCollected).toBe('number');
    expect(typeof currentMonth.paymentsCount).toBe('number');
  });

  it('devrait contenir les top débiteurs', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const { topDebtors } = res.body.data;
    expect(Array.isArray(topDebtors)).toBe(true);
  });

  it('devrait contenir la tendance mensuelle', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const { monthlyTrend } = res.body.data;
    expect(Array.isArray(monthlyTrend)).toBe(true);
  });

  it('devrait refuser l\'accès à un agent', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard')
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('devrait refuser sans authentification', async () => {
    const res = await request(app).get('/api/v1/stats/dashboard');
    expect(res.status).toBe(401);
  });

  it('le taux de recouvrement doit être entre 0 et 100', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const { collectionRate } = res.body.data.overview;
    expect(collectionRate).toBeGreaterThanOrEqual(0);
    expect(collectionRate).toBeLessThanOrEqual(100);
  });
});

// ─── GET /stats/invoices ─────────────────────────────────────────────────────

describe('📊 Stats - GET /api/v1/stats/invoices', () => {
  it('devrait retourner les stats de factures', async () => {
    const res = await request(app)
      .get('/api/v1/stats/invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.stats)).toBe(true);
  });

  it('devrait filtrer par date de début', async () => {
    const res = await request(app)
      .get('/api/v1/stats/invoices?startDate=2020-01-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.stats)).toBe(true);
  });

  it('devrait filtrer par plage de dates', async () => {
    const res = await request(app)
      .get('/api/v1/stats/invoices?startDate=2020-01-01&endDate=2030-12-31')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.stats.length).toBeGreaterThan(0);
  });

  it('devrait retourner des statistiques vides pour une période sans données', async () => {
    const res = await request(app)
      .get('/api/v1/stats/invoices?startDate=2000-01-01&endDate=2000-12-31')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toEqual([]);
  });

  it('devrait refuser l\'accès à un agent', async () => {
    const res = await request(app)
      .get('/api/v1/stats/invoices')
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(403);
  });

  it('chaque stat devrait avoir count, totalAmount, avgAmount', async () => {
    const res = await request(app)
      .get('/api/v1/stats/invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.stats.forEach((stat) => {
      expect(stat.count).toBeGreaterThan(0);
      expect(stat.totalAmount).toBeGreaterThan(0);
      expect(stat.avgAmount).toBeGreaterThan(0);
    });
  });
});
