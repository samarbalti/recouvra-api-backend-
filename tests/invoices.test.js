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
    name: 'Manager Test',
    email: 'manager@test.com',
    password: 'password123',
    role: 'manager',
  });
  token = res.body.data.token;
  userId = res.body.data.user._id;

  const client = await Client.create({ name: 'Client Facture', email: 'facture@test.com' });
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

describe('🧾 Invoices - POST /api/v1/invoices', () => {
  it('devrait créer une facture valide', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoiceNumber: 'FAC-2024-001',
        client: clientId,
        amount: 1500,
        dueDate: '2024-12-31',
        description: 'Facture de test',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invoice.invoiceNumber).toBe('FAC-2024-001');
    expect(res.body.data.invoice.amount).toBe(1500);
    expect(res.body.data.invoice.status).toBeDefined();
  });

  it('devrait rejeter une facture sans client', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoiceNumber: 'FAC-2024-002',
        amount: 500,
        dueDate: '2024-12-31',
      });

    expect(res.status).toBe(422);
  });

  it('devrait rejeter un montant négatif', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoiceNumber: 'FAC-2024-003',
        client: clientId,
        amount: -100,
        dueDate: '2024-12-31',
      });

    expect(res.status).toBe(422);
  });
});

describe('🧾 Invoices - GET /api/v1/invoices', () => {
  beforeEach(async () => {
    await Invoice.create([
      { invoiceNumber: 'F001', client: clientId, amount: 1000, dueDate: new Date('2024-12-31'), createdBy: userId },
      { invoiceNumber: 'F002', client: clientId, amount: 2000, dueDate: new Date('2024-06-30'), createdBy: userId },
    ]);
  });

  it('devrait lister toutes les factures', async () => {
    const res = await request(app)
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.invoices.length).toBe(2);
  });

  it('devrait filtrer par statut', async () => {
    const res = await request(app)
      .get('/api/v1/invoices?status=en_attente')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

describe(' Payments - POST /api/v1/payments', () => {
  let invoiceId;

  beforeEach(async () => {
    const invoice = await Invoice.create({
      invoiceNumber: 'FAC-PAY-001',
      client: clientId,
      amount: 1000,
      dueDate: new Date('2025-12-31'),
      createdBy: userId,
    });
    invoiceId = invoice._id;
  });

  it('devrait enregistrer un paiement partiel', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoice: invoiceId,
        amount: 400,
        paymentMethod: 'virement',
        reference: 'VIR-001',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.payment.amount).toBe(400);

    // Vérifier que la facture a été mise à jour
    const updatedInvoice = await Invoice.findById(invoiceId);
    expect(updatedInvoice.amountPaid).toBe(400);
    expect(updatedInvoice.status).toBe('partiel');
  });

  it('devrait marquer la facture comme payée si montant total', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoice: invoiceId,
        amount: 1000,
        paymentMethod: 'cheque',
      });

    expect(res.status).toBe(201);

    const updatedInvoice = await Invoice.findById(invoiceId);
    expect(updatedInvoice.status).toBe('paye');
  });

  it('devrait rejeter un paiement dépassant le montant dû', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoice: invoiceId,
        amount: 9999,
        paymentMethod: 'especes',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
