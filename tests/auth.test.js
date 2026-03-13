require('dotenv').config({ path: '.env.test' });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe(' Auth - POST /api/v1/auth/register', () => {
  it('devrait créer un compte avec des données valides', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Ahmed Test',
      email: 'ahmed@test.com',
      password: 'password123',
      role: 'agent',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.email).toBe('ahmed@test.com');
  });

  it('devrait rejeter un email invalide', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test',
      email: 'emailinvalide',
      password: 'password123',
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('devrait rejeter un mot de passe trop court', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test',
      email: 'test@test.com',
      password: '123',
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('devrait rejeter un email déjà utilisé', async () => {
    await User.create({
      name: 'Existant',
      email: 'duplicate@test.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Nouveau',
      email: 'duplicate@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe(' Auth - POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Test User',
      email: 'login@test.com',
      password: 'password123',
    });
  });

  it('devrait connecter un utilisateur avec des identifiants valides', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('devrait rejeter un mauvais mot de passe', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@test.com',
      password: 'mauvaismdp',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('devrait rejeter un email inexistant', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'inexistant@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
  });
});

describe(' Auth - GET /api/v1/auth/me', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Me User',
      email: 'me@test.com',
      password: 'password123',
    });
    token = res.body.data.token;
  });

  it('devrait retourner le profil avec un token valide', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@test.com');
  });

  it('devrait rejeter sans token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('devrait rejeter avec un token invalide', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer tokeninvalide');
    expect(res.status).toBe(401);
  });
});
