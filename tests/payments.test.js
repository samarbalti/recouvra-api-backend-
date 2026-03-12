/**
 * TESTS UNITAIRES — Paiements Manuels
 * Couvre : GET /payments, GET /payments/:id, POST /payments
 */

require('dotenv').config({ path: '.env.test' });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Client = require('../src/models/Client');
const Invoice = require('../src/models/Invoice');
const Payment = require('../src/models/Payment');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;
let token;
let userId;
let clientId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const res = await request(app).post('/api/v1/auth/register').send({
    name: 'Manager Pay', email: 'manager@pay.com', password: 'password123', role: 'manager',
  });
  token = res.body.data.token;
  userId = res.body.data.user._id;

  const client = await Client.create({ name: 'Client Paiement', email: 'pay@test.com' });
  clientId = client._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Invoice.deleteMany({});
  await Payment.deleteMany({});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const createInvoice = async (overrides = {}) => {
  return await Invoice.create({
    invoiceNumber: `FAC-${Date.now()}`,
    client: clientId,
    amount: 1000,
    dueDate: new Date('2025-12-31'),
    createdBy: userId,
    ...overrides,
  });
};

// ─── POST /payments ───────────────────────────────────────────────────────────

describe('💰 Payments - POST /api/v1/payments', () => {
  it('devrait enregistrer un paiement partiel (virement)', async () => {
    const invoice = await createInvoice();

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoice: invoice._id,
        amount: 300,
        paymentMethod: 'virement',
        reference: 'VIR-2024-001',
        notes: 'Premier virement partiel',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment.amount).toBe(300);
    expect(res.body.data.payment.paymentMethod).toBe('virement');

    // La facture doit être mise à jour
    const updated = await Invoice.findById(invoice._id);
    expect(updated.amountPaid).toBe(300);
    expect(updated.status).toBe('partiel');
  });

  it('devrait passer la facture à "paye" si montant total réglé', async () => {
    const invoice = await createInvoice({ amount: 500 });

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoice: invoice._id,
        amount: 500,
        paymentMethod: 'cheque',
      });

    expect(res.status).toBe(201);
    const updated = await Invoice.findById(invoice._id);
    expect(updated.status).toBe('paye');
    expect(updated.amountPaid).toBe(500);
  });

  it('devrait accepter toutes les méthodes de paiement valides', async () => {
    const methods = ['virement', 'cheque', 'especes', 'carte', 'autre'];

    for (const method of methods) {
      const invoice = await createInvoice();
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ invoice: invoice._id, amount: 100, paymentMethod: method });

      expect(res.status).toBe(201);
    }
  });

  it('devrait rejeter une méthode de paiement invalide', async () => {
    const invoice = await createInvoice();

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoice: invoice._id,
        amount: 100,
        paymentMethod: 'bitcoin', // invalide
      });

    expect(res.status).toBe(422);
  });

  it('devrait rejeter un montant supérieur au restant dû', async () => {
    const invoice = await createInvoice({ amount: 1000 });

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoice: invoice._id, amount: 9999, paymentMethod: 'virement' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('restant dû');
  });

  it('devrait rejeter un montant négatif', async () => {
    const invoice = await createInvoice();

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoice: invoice._id, amount: -100, paymentMethod: 'virement' });

    expect(res.status).toBe(422);
  });

  it('devrait rejeter le paiement d\'une facture déjà payée', async () => {
    const invoice = await createInvoice({ amount: 500, amountPaid: 500 });

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoice: invoice._id, amount: 100, paymentMethod: 'especes' });

    expect(res.status).toBe(400);
  });

  it('devrait rejeter le paiement d\'une facture annulée', async () => {
    const invoice = await createInvoice({ status: 'annule' });

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoice: invoice._id, amount: 100, paymentMethod: 'especes' });

    expect(res.status).toBe(400);
  });

  it('devrait rejeter si la facture n\'existe pas', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoice: fakeId, amount: 100, paymentMethod: 'virement' });

    expect(res.status).toBe(404);
  });

  it('devrait accepter une date de paiement personnalisée', async () => {
    const invoice = await createInvoice();
    const customDate = '2024-06-15';

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoice: invoice._id,
        amount: 200,
        paymentMethod: 'carte',
        paymentDate: customDate,
      });

    expect(res.status).toBe(201);
    const paymentDate = new Date(res.body.data.payment.paymentDate);
    expect(paymentDate.getFullYear()).toBe(2024);
    expect(paymentDate.getMonth()).toBe(5); // juin = index 5
  });

  it('devrait assigner automatiquement le client de la facture', async () => {
    const invoice = await createInvoice();

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoice: invoice._id, amount: 100, paymentMethod: 'virement' });

    expect(res.status).toBe(201);
    expect(res.body.data.payment.client._id).toBe(clientId.toString());
  });

  it('devrait refuser sans authentification', async () => {
    const invoice = await createInvoice();
    const res = await request(app)
      .post('/api/v1/payments')
      .send({ invoice: invoice._id, amount: 100, paymentMethod: 'virement' });

    expect(res.status).toBe(401);
  });
});

// ─── GET /payments ────────────────────────────────────────────────────────────

describe('💰 Payments - GET /api/v1/payments', () => {
  let invoiceId;

  beforeEach(async () => {
    const invoice = await createInvoice({ amount: 2000 });
    invoiceId = invoice._id;

    await Payment.create([
      {
        invoice: invoiceId, client: clientId, amount: 500,
        paymentMethod: 'virement', recordedBy: userId, paymentDate: new Date('2024-03-01'),
      },
      {
        invoice: invoiceId, client: clientId, amount: 700,
        paymentMethod: 'cheque', recordedBy: userId, paymentDate: new Date('2024-04-01'),
      },
    ]);

    await Invoice.findByIdAndUpdate(invoiceId, { amountPaid: 1200 });
  });

  it('devrait lister tous les paiements', async () => {
    const res = await request(app)
      .get('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payments.length).toBe(2);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('devrait filtrer par facture', async () => {
    const res = await request(app)
      .get(`/api/v1/payments?invoice=${invoiceId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.payments.length).toBe(2);
  });

  it('devrait filtrer par client', async () => {
    const res = await request(app)
      .get(`/api/v1/payments?client=${clientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.payments.length).toBe(2);
  });

  it('devrait paginer les résultats', async () => {
    const res = await request(app)
      .get('/api/v1/payments?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.payments.length).toBe(1);
    expect(res.body.data.pagination.total).toBe(2);
  });

  it('les paiements doivent être populés (invoice, client, recordedBy)', async () => {
    const res = await request(app)
      .get('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`);

    const payment = res.body.data.payments[0];
    expect(payment.invoice.invoiceNumber).toBeDefined();
    expect(payment.client.name).toBeDefined();
    expect(payment.recordedBy.name).toBeDefined();
  });
});

// ─── GET /payments/:id ────────────────────────────────────────────────────────

describe('💰 Payments - GET /api/v1/payments/:id', () => {
  let paymentId;

  beforeEach(async () => {
    const invoice = await createInvoice();
    const payment = await Payment.create({
      invoice: invoice._id, client: clientId, amount: 250,
      paymentMethod: 'especes', recordedBy: userId,
    });
    paymentId = payment._id;
  });

  it('devrait retourner un paiement par son ID', async () => {
    const res = await request(app)
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.payment._id).toBe(paymentId.toString());
    expect(res.body.data.payment.amount).toBe(250);
  });

  it('devrait retourner 404 pour un ID inexistant', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/payments/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('devrait retourner 400 pour un ID invalide', async () => {
    const res = await request(app)
      .get('/api/v1/payments/id-invalide')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});
