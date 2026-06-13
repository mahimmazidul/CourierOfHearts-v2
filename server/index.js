import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.DATA_FILE || join(__dirname, 'data', 'letters.json');
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-before-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '365d';
const CORS_ORIGIN = parseCorsOrigin(process.env.CORS_ORIGIN);
const API_PREFIX = '/api/v1';
const VERSION = '1.0.0';

const SEAL_TYPES = new Set(['rose', 'heart', 'crown', 'raven', 'initials', 'monogram']);
const SEAL_COLORS = new Set(['burgundy', 'crimson', 'emerald', 'gold', 'black']);
const CRESTS = new Set(['none', 'royal', 'floral', 'shield', 'wreath', 'wings']);
const BODY_FONTS = new Set(['eb-garamond', 'cormorant', 'crimson', 'medieval', 'uncial', 'almendra', 'marck', 'parisienne']);
const SIGNATURE_FONTS = new Set(['great-vibes', 'satisfy', 'dancing', 'marck', 'parisienne']);

function parseCorsOrigin(value) {
  if (!value || value === 'true') return true;
  if (value === 'false') return false;
  if (value.includes(',')) return value.split(',').map((origin) => origin.trim()).filter(Boolean);
  return value;
}

const seals = [
  { id: 'rose', name: 'Rose', description: 'Classic layered rose petals' },
  { id: 'heart', name: 'Heart', description: 'Heart crest' },
  { id: 'crown', name: 'Crown', description: 'Royal crown' },
  { id: 'raven', name: 'Raven', description: 'Messenger raven' },
  { id: 'initials', name: 'Initials', description: 'Intertwined initials' },
  { id: 'monogram', name: 'Monogram', description: 'Single letter monogram' },
];

const crests = [
  { id: 'none', name: 'None' },
  { id: 'royal', name: 'Royal Star' },
  { id: 'floral', name: 'Floral Mandala' },
  { id: 'shield', name: 'Shield' },
  { id: 'wreath', name: 'Laurel Wreath' },
  { id: 'wings', name: 'Wings & Heart' },
];

async function ensureDataFile() {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  try {
    await readFile(DATA_FILE, 'utf8');
  } catch {
    await writeFile(DATA_FILE, JSON.stringify({ letters: [] }, null, 2));
  }
}

async function readDb() {
  await ensureDataFile();
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { letters: Array.isArray(parsed.letters) ? parsed.letters : [] };
  } catch {
    return { letters: [] };
  }
}

async function writeDb(db) {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, DATA_FILE);
}

function errorReply(reply, statusCode, error, code) {
  return reply.code(statusCode).send({ success: false, error, code });
}

function isExpired(letter) {
  return Boolean(letter.expiresAt && new Date(letter.expiresAt).getTime() <= Date.now());
}

function publicLetter(letter, { unlocked = false } = {}) {
  const base = {
    id: letter.id,
    slug: letter.slug,
    recipient: letter.recipient,
    sealType: letter.sealType,
    sealColor: letter.sealColor,
    crest: letter.crest,
    customInitials: letter.customInitials,
    bodyFont: letter.bodyFont,
    signatureFont: letter.signatureFont,
    isPrivate: letter.isPrivate,
    requiresPassword: letter.isPrivate && !unlocked,
    expiresAt: letter.expiresAt || undefined,
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
    views: letter.views || 0,
  };

  if (!letter.isPrivate || unlocked) {
    return {
      ...base,
      salutation: letter.salutation,
      content: letter.content,
      closing: letter.closing,
      signature: letter.signature,
      flowers: letter.flowers || [],
      requiresPassword: false,
    };
  }

  return base;
}

function validateFlower(flower, index, errors) {
  if (!flower || typeof flower !== 'object') {
    errors.push(`flowers[${index}] must be an object`);
    return;
  }
  for (const field of ['id', 'flowerId']) {
    if (typeof flower[field] !== 'string' || flower[field].length > 100) errors.push(`flowers[${index}].${field} must be a string`);
  }
  for (const field of ['x', 'y', 'size', 'rotation']) {
    if (typeof flower[field] !== 'number' || !Number.isFinite(flower[field])) errors.push(`flowers[${index}].${field} must be a finite number`);
  }
}

function validatePayload(payload, { partial = false } = {}) {
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);
  const required = (key) => !partial || has(key);

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Request body must be a JSON object'];
  }

  if (!partial || has('recipient')) {
    if (typeof payload.recipient !== 'string' || payload.recipient.trim().length < 1 || payload.recipient.trim().length > 255) errors.push('recipient must be 1-255 characters');
  }
  if (!partial || has('content')) {
    if (typeof payload.content !== 'string' || payload.content.trim().length < 1 || payload.content.length > 10000) errors.push('content must be 1-10000 characters');
  }
  if (required('sealType') && (!SEAL_TYPES.has(payload.sealType))) errors.push(`sealType must be one of: ${[...SEAL_TYPES].join(', ')}`);
  if (required('sealColor') && (!SEAL_COLORS.has(payload.sealColor))) errors.push(`sealColor must be one of: ${[...SEAL_COLORS].join(', ')}`);

  if (has('salutation') && (typeof payload.salutation !== 'string' || payload.salutation.length > 100)) errors.push('salutation must be at most 100 characters');
  if (has('closing') && (typeof payload.closing !== 'string' || payload.closing.length > 100)) errors.push('closing must be at most 100 characters');
  if (has('signature') && (typeof payload.signature !== 'string' || payload.signature.length > 255)) errors.push('signature must be at most 255 characters');
  if (has('crest') && !CRESTS.has(payload.crest)) errors.push(`crest must be one of: ${[...CRESTS].join(', ')}`);
  if (has('customInitials') && (typeof payload.customInitials !== 'string' || payload.customInitials.length > 3)) errors.push('customInitials must be at most 3 characters');
  if (has('bodyFont') && !BODY_FONTS.has(payload.bodyFont)) errors.push(`bodyFont must be one of: ${[...BODY_FONTS].join(', ')}`);
  if (has('signatureFont') && !SIGNATURE_FONTS.has(payload.signatureFont)) errors.push(`signatureFont must be one of: ${[...SIGNATURE_FONTS].join(', ')}`);
  if (has('isPrivate') && typeof payload.isPrivate !== 'boolean') errors.push('isPrivate must be a boolean');
  if (has('password') && payload.password !== undefined && payload.password !== null && (typeof payload.password !== 'string' || payload.password.length > 100)) errors.push('password must be 1-100 characters');

  if (payload.isPrivate === true && (!has('password') || typeof payload.password !== 'string' || payload.password.length < 1)) errors.push('password is required when isPrivate is true');

  if (has('expiresAt') && payload.expiresAt !== undefined && payload.expiresAt !== null) {
    const ts = Date.parse(payload.expiresAt);
    if (!Number.isFinite(ts) || ts <= Date.now()) errors.push('expiresAt must be a future ISO 8601 datetime');
  }

  if (has('flowers')) {
    if (!Array.isArray(payload.flowers)) errors.push('flowers must be an array');
    else if (payload.flowers.length > 20) errors.push('flowers must contain at most 20 items');
    else payload.flowers.forEach((flower, index) => validateFlower(flower, index, errors));
  }

  return errors;
}

function tokenFor(slug) {
  return jwt.sign({ slug }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function getBearerToken(request) {
  const header = request.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1];
}

function verifyManagementToken(request, slug) {
  const token = getBearerToken(request);
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded && decoded.slug === slug;
  } catch {
    return false;
  }
}

async function findLetter(slug) {
  const db = await readDb();
  const index = db.letters.findIndex((letter) => letter.slug === slug);
  return { db, index, letter: index >= 0 ? db.letters[index] : null };
}

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

fastify.addHook('onSend', async (_request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
});

function healthHandler(_request, reply) {
  reply.send({ status: 'ok', version: VERSION, timestamp: new Date().toISOString() });
}

fastify.get('/health', healthHandler);
fastify.get(`${API_PREFIX}/health`, healthHandler);

fastify.get(`${API_PREFIX}/seals`, async (_request, reply) => reply.send({ success: true, data: seals }));
fastify.get(`${API_PREFIX}/crests`, async (_request, reply) => reply.send({ success: true, data: crests }));

fastify.post(`${API_PREFIX}/letters`, async (request, reply) => {
  const payload = request.body || {};
  const errors = validatePayload(payload);
  if (errors.length) return errorReply(reply, 400, errors.join('; '), 'VALIDATION_ERROR');

  const db = await readDb();
  let slug = nanoid(10);
  while (db.letters.some((letter) => letter.slug === slug)) slug = nanoid(10);

  const now = new Date().toISOString();
  const token = tokenFor(slug);
  const letter = {
    id: nanoid(),
    slug,
    salutation: payload.salutation || 'My dearest',
    recipient: payload.recipient.trim(),
    content: payload.content.trim(),
    closing: payload.closing || 'Forever yours,',
    signature: payload.signature || 'With love',
    sealType: payload.sealType,
    sealColor: payload.sealColor,
    crest: payload.crest || 'none',
    customInitials: payload.customInitials || '',
    bodyFont: payload.bodyFont || 'eb-garamond',
    signatureFont: payload.signatureFont || 'great-vibes',
    flowers: payload.flowers || [],
    isPrivate: Boolean(payload.isPrivate),
    passwordHash: payload.isPrivate ? await bcrypt.hash(payload.password, 12) : null,
    views: 0,
    expiresAt: payload.expiresAt || null,
    createdAt: now,
    updatedAt: now,
  };

  db.letters.push(letter);
  await writeDb(db);
  reply.code(201).send({ success: true, data: publicLetter(letter, { unlocked: true }), token });
});

fastify.get(`${API_PREFIX}/letters`, async (request, reply) => {
  const slugs = String(request.query?.slugs || '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);

  if (slugs.length === 0) return reply.send({ success: true, data: [] });

  const db = await readDb();
  const set = new Set(slugs);
  const letters = db.letters
    .filter((letter) => !isExpired(letter))
    .filter((letter) => set.has(letter.slug))
    .map((letter) => publicLetter(letter));
  reply.send({ success: true, data: letters });
});

fastify.get(`${API_PREFIX}/letters/:slug`, async (request, reply) => {
  const { letter } = await findLetter(request.params.slug);
  if (!letter) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  if (isExpired(letter)) return errorReply(reply, 410, 'This letter has faded with time', 'LETTER_EXPIRED');
  reply.send({ success: true, data: publicLetter(letter) });
});

fastify.post(`${API_PREFIX}/letters/:slug/unlock`, async (request, reply) => {
  const { letter } = await findLetter(request.params.slug);
  if (!letter) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  if (isExpired(letter)) return errorReply(reply, 410, 'This letter has faded with time', 'LETTER_EXPIRED');
  if (!letter.isPrivate) return reply.send({ success: true, data: publicLetter(letter, { unlocked: true }) });

  const password = request.body?.password;
  if (typeof password !== 'string' || password.length < 1) return errorReply(reply, 400, 'password is required', 'VALIDATION_ERROR');
  const ok = await bcrypt.compare(password, letter.passwordHash || '');
  if (!ok) return errorReply(reply, 403, 'Incorrect passphrase', 'WRONG_PASSWORD');
  reply.send({ success: true, data: publicLetter(letter, { unlocked: true }) });
});

fastify.post(`${API_PREFIX}/letters/:slug/view`, async (request, reply) => {
  const { db, index, letter } = await findLetter(request.params.slug);
  if (!letter) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  if (isExpired(letter)) return errorReply(reply, 410, 'This letter has faded with time', 'LETTER_EXPIRED');
  db.letters[index] = { ...letter, views: (letter.views || 0) + 1 };
  await writeDb(db);
  reply.send({ success: true, views: db.letters[index].views });
});

fastify.put(`${API_PREFIX}/letters/:slug`, async (request, reply) => {
  const slug = request.params.slug;
  if (!verifyManagementToken(request, slug)) return errorReply(reply, 401, 'Unauthorized', 'UNAUTHORIZED');

  const { db, index, letter } = await findLetter(slug);
  if (!letter) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  if (isExpired(letter)) return errorReply(reply, 410, 'This letter has faded with time', 'LETTER_EXPIRED');

  const payload = request.body || {};
  const errors = validatePayload(payload, { partial: true });
  if (errors.length) return errorReply(reply, 400, errors.join('; '), 'VALIDATION_ERROR');

  const next = {
    ...letter,
    ...Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)),
    updatedAt: new Date().toISOString(),
  };

  if (payload.recipient) next.recipient = payload.recipient.trim();
  if (payload.content) next.content = payload.content.trim();
  if (payload.isPrivate === true && payload.password) next.passwordHash = await bcrypt.hash(payload.password, 12);
  if (payload.isPrivate === false) next.passwordHash = null;
  delete next.password;

  db.letters[index] = next;
  await writeDb(db);
  reply.send({ success: true, data: publicLetter(next, { unlocked: true }) });
});

fastify.delete(`${API_PREFIX}/letters/:slug`, async (request, reply) => {
  const slug = request.params.slug;
  if (!verifyManagementToken(request, slug)) return errorReply(reply, 401, 'Unauthorized', 'UNAUTHORIZED');

  const { db, index } = await findLetter(slug);
  if (index === -1) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  db.letters.splice(index, 1);
  await writeDb(db);
  reply.send({ success: true, data: { slug, deleted: true } });
});

fastify.setErrorHandler((err, _request, reply) => {
  fastify.log.error(err);
  errorReply(reply, 500, 'Internal server error', 'SERVER_ERROR');
});

await ensureDataFile();
fastify.listen({ port: PORT, host: HOST });
