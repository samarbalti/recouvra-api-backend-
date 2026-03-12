/**
 * TESTS UNITAIRES — Modèles Mongoose
 * Couvre la logique métier des modèles :
 * User, Client, Invoice, Payment, RecoveryAction
 */

require('dotenv').config({ path: '.env.test' });

const User = require('../src/models/User');
const Client = require('../src/models/Client');
const Invoice = require('../src/models/Invoice');
const Payment = require('../src/models/Payment');
const RecoveryAction = require('../src/models/RecoveryAction');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;
let userId;
let clientId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const user = await User.create({ name: 'Test User', email: 'model@test.com', password: '123456' });
  userId = user._id;

  const client = await Client.create({ name: 'Client Model', email: 'clientmodel@test.com' });
  clientId = client._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Invoice.deleteMany({});
  await Payment.deleteMany({});
  await RecoveryAction.deleteMany({});
});

// ════════════════════════════════════════════════════════════════════════════
// MODÈLE USER
// ════════════════════════════════════════════════════════════════════════════

describe('📦 Modèle User — Sécurité', () => {
  afterEach(async () => {
    await User.deleteMany({ email: { $ne: 'model@test.com' } });
  });

  it('devrait hasher le mot de passe avant sauvegarde', async () => {
    const user = await User.create({ name: 'Hash Test', email: 'hash@test.com', password: 'plainpassword' });
    const found = await User.findById(user._id).select('+password');
    expect(found.password).not.toBe('plainpassword');
    expect(found.password).toMatch(/^\$2[ab]\$/);
  });

  it('ne devrait pas re-hasher si le mdp n\'est pas modifié', async () => {
    const user = await User.create({ name: 'No Rehash', email: 'norehash@test.com', password: 'original' });
    const original = await User.findById(user._id).select('+password');
    const hashBefore = original.password;
    original.name = 'Nom Modifié';
    await original.save();
    const after = await User.findById(user._id).select('+password');
    expect(after.password).toBe(hashBefore);
  });

  it('comparePassword devrait retourner true pour le bon mot de passe', async () => {
    const user = await User.create({ name: 'Compare', email: 'cmp@test.com', password: 'correct123' });
    const found = await User.findById(user._id).select('+password');
    expect(await found.comparePassword('correct123')).toBe(true);
  });

  it('comparePassword devrait retourner false pour un mauvais mot de passe', async () => {
    const user = await User.create({ name: 'Wrong', email: 'wrong@test.com', password: 'correct123' });
    const found = await User.findById(user._id).select('+password');
    expect(await found.comparePassword('mauvais')).toBe(false);
  });

  it('ne devrait pas exposer le mot de passe dans toJSON()', async () => {
    const user = await User.create({ name: 'Safe', email: 'safe@test.com', password: 'secret' });
    expect(user.toJSON().password).toBeUndefined();
  });

  it('le mot de passe ne doit pas apparaître dans findOne() normal', async () => {
    await User.create({ name: 'Hidden', email: 'hidden@test.com', password: 'mysecret' });
    const found = await User.findOne({ email: 'hidden@test.com' });
    expect(found.password).toBeUndefined();
  });
});

describe('📦 Modèle User — Validation', () => {
  afterEach(async () => {
    await User.deleteMany({ email: { $ne: 'model@test.com' } });
  });

  it('le rôle par défaut est "agent"', async () => {
    const user = await User.create({ name: 'Default', email: 'def@test.com', password: '123456' });
    expect(user.role).toBe('agent');
  });

  it('devrait accepter les rôles : agent, manager, admin', async () => {
    for (const role of ['agent', 'manager', 'admin']) {
      const user = await User.create({ name: role, email: `${role}@test.com`, password: '123456', role });
      expect(user.role).toBe(role);
    }
  });

  it('devrait rejeter un rôle invalide', async () => {
    await expect(
      User.create({ name: 'Bad', email: 'bad@test.com', password: '123456', role: 'superadmin' })
    ).rejects.toThrow();
  });

  it('devrait rejeter un email dupliqué', async () => {
    await User.create({ name: 'First', email: 'dup@test.com', password: '123456' });
    await expect(User.create({ name: 'Second', email: 'dup@test.com', password: '123456' })).rejects.toThrow();
  });

  it('isActive doit être true par défaut', async () => {
    const user = await User.create({ name: 'Active', email: 'active@test.com', password: '123456' });
    expect(user.isActive).toBe(true);
  });

  it('devrait avoir timestamps createdAt/updatedAt', async () => {
    const user = await User.create({ name: 'TS', email: 'ts@test.com', password: '123456' });
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MODÈLE CLIENT
// ════════════════════════════════════════════════════════════════════════════

describe('📦 Modèle Client — Validation', () => {
  afterEach(async () => {
    await Client.deleteMany({ email: { $ne: 'clientmodel@test.com' } });
  });

  it('devrait créer un client valide avec statut "actif" par défaut', async () => {
    const client = await Client.create({ name: 'Entreprise ABC', email: 'abc@entreprise.com' });
    expect(client.status).toBe('actif');
  });

  it('devrait rejeter un email invalide', async () => {
    await expect(Client.create({ name: 'Test', email: 'pasunemail' })).rejects.toThrow();
  });

  it('devrait rejeter un email dupliqué', async () => {
    await Client.create({ name: 'C1', email: 'dupclient@test.com' });
    await expect(Client.create({ name: 'C2', email: 'dupclient@test.com' })).rejects.toThrow();
  });

  it('devrait accepter les statuts : actif, inactif, bloque', async () => {
    for (const status of ['actif', 'inactif', 'bloque']) {
      const c = await Client.create({ name: `C-${status}`, email: `${status}@test.com`, status });
      expect(c.status).toBe(status);
    }
  });

  it('devrait rejeter un statut invalide', async () => {
    await expect(
      Client.create({ name: 'Bad Status', email: 'badst@test.com', status: 'suspendu' })
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MODÈLE INVOICE — STATUT AUTOMATIQUE & VIRTUALS
// ════════════════════════════════════════════════════════════════════════════

describe('📦 Modèle Invoice — Statut automatique', () => {
  it('doit être "en_attente" pour une facture non échue, non payée', async () => {
    const inv = await Invoice.create({
      invoiceNumber: 'S-001', client: clientId, amount: 1000,
      dueDate: new Date(Date.now() + 30 * 86400000), createdBy: userId,
    });
    expect(inv.status).toBe('en_attente');
  });

  it('doit être "en_retard" pour une facture échue sans paiement', async () => {
    const inv = await Invoice.create({
      invoiceNumber: 'S-002', client: clientId, amount: 1000,
      dueDate: new Date('2020-01-01'), createdBy: userId,
    });
    expect(inv.status).toBe('en_retard');
  });

  it('doit être "partiel" si amountPaid > 0 et < amount', async () => {
    const inv = await Invoice.create({
      invoiceNumber: 'S-003', client: clientId, amount: 1000, amountPaid: 400,
      dueDate: new Date(Date.now() + 30 * 86400000), createdBy: userId,
    });
    expect(inv.status).toBe('partiel');
  });

  it('doit être "paye" si amountPaid >= amount', async () => {
    const inv = await Invoice.create({
      invoiceNumber: 'S-004', client: clientId, amount: 1000, amountPaid: 1000,
      dueDate: new Date(Date.now() + 30 * 86400000), createdBy: userId,
    });
    expect(inv.status).toBe('paye');
  });

  it('doit conserver "annule" même si amountPaid = amount', async () => {
    const inv = new Invoice({
      invoiceNumber: 'S-005', client: clientId, amount: 1000, amountPaid: 1000,
      dueDate: new Date(Date.now() + 30 * 86400000), status: 'annule', createdBy: userId,
    });
    await inv.save();
    expect(inv.status).toBe('annule');
  });
});

describe('📦 Modèle Invoice — Virtuals', () => {
  it('remainingAmount = amount - amountPaid', async () => {
    const inv = await Invoice.create({
      invoiceNumber: 'V-001', client: clientId, amount: 1000, amountPaid: 300,
      dueDate: new Date(Date.now() + 30 * 86400000), createdBy: userId,
    });
    expect(inv.remainingAmount).toBe(700);
  });

  it('remainingAmount vaut 0 si totalement payé', async () => {
    const inv = await Invoice.create({
      invoiceNumber: 'V-002', client: clientId, amount: 1000, amountPaid: 1000,
      dueDate: new Date(Date.now() + 30 * 86400000), createdBy: userId,
    });
    expect(inv.remainingAmount).toBe(0);
  });

  it('paymentPercentage = 25 si 250/1000 payé', async () => {
    const inv = await Invoice.create({
      invoiceNumber: 'V-003', client: clientId, amount: 1000, amountPaid: 250,
      dueDate: new Date(Date.now() + 30 * 86400000), createdBy: userId,
    });
    expect(inv.paymentPercentage).toBe(25);
  });

  it('paymentPercentage = 0 si aucun paiement', async () => {
    const inv = await Invoice.create({
      invoiceNumber: 'V-004', client: clientId, amount: 1000,
      dueDate: new Date(Date.now() + 30 * 86400000), createdBy: userId,
    });
    expect(inv.paymentPercentage).toBe(0);
  });

  it('paymentPercentage = 100 si entièrement payé', async () => {
    const inv = await Invoice.create({
      invoiceNumber: 'V-005', client: clientId, amount: 1000, amountPaid: 1000,
      dueDate: new Date(Date.now() + 30 * 86400000), createdBy: userId,
    });
    expect(inv.paymentPercentage).toBe(100);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MODÈLE PAYMENT
// ════════════════════════════════════════════════════════════════════════════

describe('📦 Modèle Payment — Validation', () => {
  let invoiceId;

  beforeEach(async () => {
    const inv = await Invoice.create({
      invoiceNumber: `P-INV-${Date.now()}`, client: clientId, amount: 1000,
      dueDate: new Date(Date.now() + 30 * 86400000), createdBy: userId,
    });
    invoiceId = inv._id;
  });

  it('devrait créer un paiement valide', async () => {
    const pay = await Payment.create({
      invoice: invoiceId, client: clientId, amount: 500, paymentMethod: 'virement', recordedBy: userId,
    });
    expect(pay.amount).toBe(500);
    expect(pay.paymentMethod).toBe('virement');
    expect(pay.paymentDate).toBeDefined();
  });

  it('devrait rejeter un montant négatif ou nul', async () => {
    await expect(
      Payment.create({ invoice: invoiceId, client: clientId, amount: -100, paymentMethod: 'virement', recordedBy: userId })
    ).rejects.toThrow();
  });

  it('devrait rejeter une méthode invalide', async () => {
    await expect(
      Payment.create({ invoice: invoiceId, client: clientId, amount: 100, paymentMethod: 'crypto', recordedBy: userId })
    ).rejects.toThrow();
  });

  it('devrait accepter toutes les méthodes valides', async () => {
    for (const method of ['virement', 'cheque', 'especes', 'carte', 'autre']) {
      const pay = await Payment.create({
        invoice: invoiceId, client: clientId, amount: 10, paymentMethod: method, recordedBy: userId,
      });
      expect(pay.paymentMethod).toBe(method);
    }
  });

  it('la date de paiement par défaut est maintenant', async () => {
    const before = new Date();
    const pay = await Payment.create({
      invoice: invoiceId, client: clientId, amount: 50, paymentMethod: 'especes', recordedBy: userId,
    });
    const after = new Date();
    expect(pay.paymentDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(pay.paymentDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MODÈLE RECOVERY ACTION
// ════════════════════════════════════════════════════════════════════════════

describe('📦 Modèle RecoveryAction — Validation', () => {
  let invoiceId;

  beforeEach(async () => {
    const inv = await Invoice.create({
      invoiceNumber: `R-INV-${Date.now()}`, client: clientId, amount: 1000,
      dueDate: new Date('2020-01-01'), createdBy: userId,
    });
    invoiceId = inv._id;
  });

  it('devrait créer une action valide avec statut "planifie" par défaut', async () => {
    const action = await RecoveryAction.create({
      invoice: invoiceId, client: clientId, agent: userId,
      type: 'appel', scheduledDate: new Date(Date.now() + 86400000),
    });
    expect(action.type).toBe('appel');
    expect(action.status).toBe('planifie');
  });

  it('devrait accepter tous les types d\'action valides', async () => {
    for (const type of ['appel', 'email', 'courrier', 'visite', 'relance', 'mise_en_demeure']) {
      const action = await RecoveryAction.create({
        invoice: invoiceId, client: clientId, agent: userId,
        type, scheduledDate: new Date(Date.now() + 86400000),
      });
      expect(action.type).toBe(type);
    }
  });

  it('devrait accepter tous les statuts valides', async () => {
    for (const status of ['planifie', 'en_cours', 'effectue', 'echoue', 'annule']) {
      const action = await RecoveryAction.create({
        invoice: invoiceId, client: clientId, agent: userId,
        type: 'email', status, scheduledDate: new Date(Date.now() + 86400000),
      });
      expect(action.status).toBe(status);
    }
  });

  it('devrait rejeter un type invalide', async () => {
    await expect(
      RecoveryAction.create({
        invoice: invoiceId, client: clientId, agent: userId, type: 'fax', scheduledDate: new Date(),
      })
    ).rejects.toThrow();
  });

  it('devrait rejeter sans scheduledDate', async () => {
    await expect(
      RecoveryAction.create({ invoice: invoiceId, client: clientId, agent: userId, type: 'appel' })
    ).rejects.toThrow();
  });

  it('devrait avoir des timestamps', async () => {
    const action = await RecoveryAction.create({
      invoice: invoiceId, client: clientId, agent: userId, type: 'visite', scheduledDate: new Date(),
    });
    expect(action.createdAt).toBeDefined();
    expect(action.updatedAt).toBeDefined();
  });
});
