/**
 * Integration tests for SecureVault API
 * Prerequisites: docker compose up -d (PostgreSQL must be running)
 * Run: npm test
 */
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';

jest.setTimeout(30000);

const BASE = '/api/v1';

async function reg(email: string, username: string, pw = 'Password123!') {
  return request(app).post(`${BASE}/auth/register`).send({ email, username, password: pw });
}

async function login(email: string, pw = 'Password123!') {
  const r = await request(app).post(`${BASE}/auth/login`).send({ email, password: pw });
  return r.body.accessToken as string;
}

async function regAndLogin(email: string, username: string, pw = 'Password123!') {
  await reg(email, username, pw);
  return login(email, pw);
}

// ── Wipe DB once before all tests ─────────────────────────────────────────────
beforeAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH — Register
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /auth/register', () => {
  test('201 — creates user, no password in response', async () => {
    const res = await reg('alice@test.com', 'alice');
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'alice@test.com', username: 'alice' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('409 — duplicate email', async () => {
    await reg('dup@test.com', 'dupuser1');
    const res = await reg('dup@test.com', 'dupuser2');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email/i);
  });

  test('409 — duplicate username', async () => {
    await reg('a1@test.com', 'dupname');
    const res = await reg('a2@test.com', 'dupname');
    expect(res.status).toBe(409);
  });

  test('400 — weak password', async () => {
    const res = await reg('weak@test.com', 'weakpw', 'short');
    expect(res.status).toBe(400);
  });

  test('400 — username with spaces / special chars', async () => {
    const res = await reg('bad@test.com', 'user name!');
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH — Login
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /auth/login', () => {
  const EMAIL = 'bob@test.com';

  beforeAll(() => reg(EMAIL, 'bob'));

  test('200 — valid credentials return accessToken', async () => {
    const res = await request(app).post(`${BASE}/auth/login`).send({ email: EMAIL, password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: EMAIL });
  });

  test('401 — wrong password', async () => {
    const res = await request(app).post(`${BASE}/auth/login`).send({ email: EMAIL, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('401 — non-existent email', async () => {
    const res = await request(app).post(`${BASE}/auth/login`).send({ email: 'nobody@test.com', password: 'Password123!' });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH — Me
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /auth/me', () => {
  let token: string;

  beforeAll(async () => { token = await regAndLogin('carol@test.com', 'carol'); });

  test('200 — returns user profile', async () => {
    const res = await request(app).get(`${BASE}/auth/me`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('carol@test.com');
  });

  test('401 — no token', async () => {
    expect((await request(app).get(`${BASE}/auth/me`)).status).toBe(401);
  });

  test('401 — tampered token', async () => {
    const res = await request(app)
      .get(`${BASE}/auth/me`)
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.fake.payload');
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILES — List
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /files', () => {
  let token: string;

  beforeAll(async () => { token = await regAndLogin('dave@test.com', 'dave'); });

  test('200 — empty list with quota info for new user', async () => {
    const res = await request(app).get(`${BASE}/files`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.files).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.quota).toHaveProperty('usedBytes');
    expect(res.body.quota).toHaveProperty('limitBytes');
  });

  test('401 — no auth', async () => {
    expect((await request(app).get(`${BASE}/files`)).status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILES — Upload init validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /files/upload/init — validation', () => {
  let token: string;

  beforeAll(async () => { token = await regAndLogin('eve@test.com', 'eve'); });

  test('400 — blocked extension (.exe)', async () => {
    const res = await request(app)
      .post(`${BASE}/files/upload/init`)
      .set('Authorization', `Bearer ${token}`)
      .send({ originalName: 'malware.exe', mimeType: 'application/octet-stream', sizeBytes: 1024 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('400 — file exceeds 200 MB', async () => {
    const res = await request(app)
      .post(`${BASE}/files/upload/init`)
      .set('Authorization', `Bearer ${token}`)
      .send({ originalName: 'huge.pdf', mimeType: 'application/pdf', sizeBytes: 210 * 1024 * 1024 });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringMatching(/limit/i) })
    ]));
  });

  test('400 — double-extension filename (.jpg.php)', async () => {
    const res = await request(app)
      .post(`${BASE}/files/upload/init`)
      .set('Authorization', `Bearer ${token}`)
      .send({ originalName: 'virus.jpg.php', mimeType: 'image/jpeg', sizeBytes: 1024 });
    expect(res.status).toBe(400);
  });

  test('401 — no auth', async () => {
    const res = await request(app)
      .post(`${BASE}/files/upload/init`)
      .send({ originalName: 'test.pdf', mimeType: 'application/pdf', sizeBytes: 1024 });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILES — Authorization (owner vs non-owner)
// ═══════════════════════════════════════════════════════════════════════════════

describe('File authorization — owner vs non-owner', () => {
  let ownerToken: string;
  let otherToken: string;
  let fileId: string;
  let shareToken: string;

  beforeAll(async () => {
    // Register both users and get tokens
    ownerToken = await regAndLogin('owner@test.com', 'fileowner');
    otherToken = await regAndLogin('other@test.com', 'otheruser');

    // Get the owner user's DB id
    const ownerUser = await prisma.user.findUnique({ where: { email: 'owner@test.com' } });
    if (!ownerUser) throw new Error('Owner user not found — DB cleanup may have run out of order');

    // Directly insert a private file (bypass S3 since it's just a DB record for auth testing)
    const file = await prisma.file.create({
      data: {
        ownerId: ownerUser.id,
        originalName: 'secret.pdf',
        storageKey: `uploads/${ownerUser.id}/test-key-${Date.now()}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: BigInt(1024),
        visibility: 'PRIVATE',
      },
    });
    fileId = file.id;
    shareToken = file.shareToken;
  });

  test('403 — non-owner GET private file', async () => {
    const res = await request(app)
      .get(`${BASE}/files/${fileId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('403 — non-owner DELETE file', async () => {
    const res = await request(app)
      .delete(`${BASE}/files/${fileId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test('403 — non-owner PATCH visibility', async () => {
    const res = await request(app)
      .patch(`${BASE}/files/${fileId}/visibility`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ visibility: 'PUBLIC' });
    expect(res.status).toBe(403);
  });

  test('200 — owner can GET their own file', async () => {
    const res = await request(app)
      .get(`${BASE}/files/${fileId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });

  test('404 — private file not accessible via share token (public share endpoint)', async () => {
    const res = await request(app).get(`${BASE}/files/share/${shareToken}`);
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILES — Share token edge cases
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /files/share/:shareToken', () => {
  test('404 — non-existent share token', async () => {
    const res = await request(app).get(`${BASE}/files/share/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/health', () => {
  test('returns status, services.database, services.storage', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBeLessThan(600);
    expect(res.body).toHaveProperty('status');
    expect(res.body.services).toHaveProperty('database');
    expect(res.body.services).toHaveProperty('storage');
  });
});
