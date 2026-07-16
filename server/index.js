import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE || join(__dirname, 'data', 'letters.db');
const LEGACY_DATA_FILE = process.env.LEGACY_DATA_FILE || join(__dirname, 'data', 'letters.json');
const CACHE_DIR = process.env.CACHE_DIR || join(__dirname, 'cache');
const PORT = Number(process.env.PORT || 3847);
const HOST = process.env.HOST || '127.0.0.1';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-before-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '365d';
const LETTER_MASTER_KEY = process.env.LETTER_MASTER_KEY || 'dev-master-key-change-me-before-production';
const ADMIN_MASTER_KEY = process.env.ADMIN_MASTER_KEY || '';
const ADMIN_API_ENABLED = String(process.env.ADMIN_API_ENABLED || 'false').toLowerCase() === 'true';
const MYSQL_MIRROR_URL = process.env.MYSQL_MIRROR_URL || '';
const MYSQL_MIRROR_ENABLED = Boolean(MYSQL_MIRROR_URL);
const CORS_ORIGIN = parseCorsOrigin(process.env.CORS_ORIGIN);
const API_PREFIX = '/api/v1';
const VERSION = '2.0.0';
const MAX_FLOWERS = Number(process.env.MAX_FLOWERS || 50);
const BODY_LIMIT = Number(process.env.BODY_LIMIT_BYTES || 128 * 1024);
const DAILY_CACHE_TTL_MS = Number(process.env.DAILY_CACHE_TTL_MS || 24 * 60 * 60 * 1000);

const SEAL_TYPES = new Set(['rose', 'heart', 'crown', 'raven', 'initials', 'monogram']);
const SEAL_COLORS = new Set(['burgundy', 'crimson', 'emerald', 'gold', 'black']);
const CRESTS = new Set(['none', 'royal', 'floral', 'shield', 'wreath', 'wings']);
const BORDER_STYLES = new Set(['none', 'vine', 'filigree', 'royal']);
const BODY_FONTS = new Set(['eb-garamond', 'cormorant', 'crimson', 'medieval', 'uncial', 'almendra', 'great-vibes', 'satisfy', 'dancing', 'marck', 'parisienne', 'noto-serif-bengali', 'hind-siliguri', 'anek-bangla']);
const SIGNATURE_FONTS = new Set([...BODY_FONTS]);
const MASTER_KEY = createHash('sha256').update(LETTER_MASTER_KEY).digest();
const rateLimitStore = new Map();
let mysqlMirrorPool = null;

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

function parseCorsOrigin(value) {
  if (!value || value === 'true') return true;
  if (value === 'false') return false;
  if (value.includes(',')) return value.split(',').map((origin) => origin.trim()).filter(Boolean);
  return value;
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

ensureDir(dirname(DB_FILE));
ensureDir(CACHE_DIR);

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS letters (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    payload_encrypted TEXT NOT NULL,
    seal_type TEXT NOT NULL,
    seal_color TEXT NOT NULL,
    crest TEXT NOT NULL DEFAULT 'none',
    body_font TEXT NOT NULL DEFAULT 'eb-garamond',
    signature_font TEXT NOT NULL DEFAULT 'great-vibes',
    is_private INTEGER NOT NULL DEFAULT 0,
    password_hash TEXT,
    views INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS letter_events (
    id TEXT PRIMARY KEY,
    letter_slug TEXT NOT NULL,
    event_type TEXT NOT NULL,
    request_ip_hash TEXT NOT NULL,
    user_agent TEXT,
    accept_language TEXT,
    do_not_track TEXT,
    referer TEXT,
    client_context_json TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_letters_slug ON letters(slug);
  CREATE INDEX IF NOT EXISTS idx_letters_created_at ON letters(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_letters_expires ON letters(expires_at);
  CREATE INDEX IF NOT EXISTS idx_letter_events_slug ON letter_events(letter_slug, created_at DESC);
`);

async function initMySqlMirror() {
  if (!MYSQL_MIRROR_ENABLED) return;
  mysqlMirrorPool = mysql.createPool(MYSQL_MIRROR_URL);
  await mysqlMirrorPool.query(`
    CREATE TABLE IF NOT EXISTS letters (
      id VARCHAR(64) PRIMARY KEY,
      slug VARCHAR(32) NOT NULL UNIQUE,
      payload_encrypted LONGTEXT NOT NULL,
      seal_type VARCHAR(20) NOT NULL,
      seal_color VARCHAR(20) NOT NULL,
      crest VARCHAR(20) NOT NULL,
      body_font VARCHAR(40) NOT NULL,
      signature_font VARCHAR(40) NOT NULL,
      is_private TINYINT(1) NOT NULL,
      password_hash TEXT NULL,
      views INT NOT NULL DEFAULT 0,
      expires_at TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await mysqlMirrorPool.query(`
    CREATE TABLE IF NOT EXISTS letter_events (
      id VARCHAR(64) PRIMARY KEY,
      letter_slug VARCHAR(32) NOT NULL,
      event_type VARCHAR(20) NOT NULL,
      request_ip_hash VARCHAR(64) NOT NULL,
      user_agent TEXT NULL,
      accept_language TEXT NULL,
      do_not_track TEXT NULL,
      referer TEXT NULL,
      client_context_json LONGTEXT NULL,
      created_at TEXT NOT NULL,
      INDEX idx_letter_events_slug (letter_slug, created_at)
    )
  `);
}

async function mirrorLetterRow(row) {
  if (!mysqlMirrorPool || !row) return;
  try {
    await mysqlMirrorPool.execute(`
      INSERT INTO letters (
        id, slug, payload_encrypted, seal_type, seal_color, crest, body_font, signature_font, is_private, password_hash, views, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        payload_encrypted = VALUES(payload_encrypted),
        seal_type = VALUES(seal_type),
        seal_color = VALUES(seal_color),
        crest = VALUES(crest),
        body_font = VALUES(body_font),
        signature_font = VALUES(signature_font),
        is_private = VALUES(is_private),
        password_hash = VALUES(password_hash),
        views = VALUES(views),
        expires_at = VALUES(expires_at),
        created_at = VALUES(created_at),
        updated_at = VALUES(updated_at)
    `, [
      row.id, row.slug, row.payload_encrypted, row.seal_type, row.seal_color, row.crest,
      row.body_font, row.signature_font, row.is_private, row.password_hash, row.views,
      row.expires_at, row.created_at, row.updated_at,
    ]);
  } catch (error) {
    console.error('MySQL mirror letter sync failed:', error?.message || error);
  }
}

async function mirrorLetterDelete(slug) {
  if (!mysqlMirrorPool) return;
  try {
    await mysqlMirrorPool.execute('DELETE FROM letter_events WHERE letter_slug = ?', [slug]);
    await mysqlMirrorPool.execute('DELETE FROM letters WHERE slug = ?', [slug]);
  } catch (error) {
    console.error('MySQL mirror delete failed:', error?.message || error);
  }
}

async function mirrorLetterEventRow(eventRow) {
  if (!mysqlMirrorPool || !eventRow) return;
  try {
    await mysqlMirrorPool.execute(`
      INSERT INTO letter_events (
        id, letter_slug, event_type, request_ip_hash, user_agent, accept_language, do_not_track, referer, client_context_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        event_type = VALUES(event_type),
        request_ip_hash = VALUES(request_ip_hash),
        user_agent = VALUES(user_agent),
        accept_language = VALUES(accept_language),
        do_not_track = VALUES(do_not_track),
        referer = VALUES(referer),
        client_context_json = VALUES(client_context_json),
        created_at = VALUES(created_at)
    `, [
      eventRow.id, eventRow.letter_slug, eventRow.event_type, eventRow.request_ip_hash,
      eventRow.user_agent, eventRow.accept_language, eventRow.do_not_track,
      eventRow.referer, eventRow.client_context_json, eventRow.created_at,
    ]);
  } catch (error) {
    console.error('MySQL mirror event sync failed:', error?.message || error);
  }
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

function constantTimeEqualText(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function getAdminKey(request) {
  const header = request.headers['x-admin-key'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  return getBearerToken(request) || '';
}

function verifyAdminRequest(request) {
  if (!ADMIN_API_ENABLED || !ADMIN_MASTER_KEY) return false;
  return constantTimeEqualText(getAdminKey(request), ADMIN_MASTER_KEY);
}

function encryptPayload(payload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${data.toString('base64url')}`;
}

function decryptPayload(payloadEncrypted) {
  const [ivValue, tagValue, dataValue] = String(payloadEncrypted).split('.');
  const decipher = createDecipheriv('aes-256-gcm', MASTER_KEY, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(decrypted);
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

function verifyPassword(password, encoded) {
  if (!encoded || !encoded.startsWith('scrypt$')) return false;
  const [, saltValue, hashValue] = encoded.split('$');
  const salt = Buffer.from(saltValue, 'base64url');
  const expected = Buffer.from(hashValue, 'base64url');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function isExpired(letter) {
  return Boolean(letter.expires_at && new Date(letter.expires_at).getTime() <= Date.now());
}

function letterRowToPublic(row, { unlocked = false } = {}) {
  const payload = decryptPayload(row.payload_encrypted);
  const base = {
    id: row.id,
    slug: row.slug,
    recipient: payload.recipient,
    sealType: row.seal_type,
    sealColor: row.seal_color,
    crest: row.crest,
    borderStyle: payload.borderStyle || 'none',
    customInitials: payload.customInitials || '',
    letterDate: payload.letterDate || undefined,
    bodyFont: row.body_font,
    salutationFont: payload.salutationFont || row.body_font,
    recipientFont: payload.recipientFont || row.body_font,
    closingFont: payload.closingFont || row.body_font,
    signatureFont: row.signature_font,
    isPrivate: Boolean(row.is_private),
    requiresPassword: Boolean(row.is_private) && !unlocked,
    expiresAt: row.expires_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    views: row.views || 0,
  };

  if (!row.is_private || unlocked) {
    return {
      ...base,
      salutation: payload.salutation,
      content: payload.content,
      closing: payload.closing,
      signature: payload.signature,
      flowers: payload.flowers || [],
      requiresPassword: false,
    };
  }

  return base;
}

function safeText(value, max = 255) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function safeNumber(value, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(value, max));
}

function normalizeClientContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value;
  return {
    browserId: safeText(input.browserId, 100),
    sessionRef: safeText(input.sessionRef, 100),
    timezone: safeText(input.timezone, 120),
    language: safeText(input.language, 40),
    languages: Array.isArray(input.languages) ? input.languages.filter((v) => typeof v === 'string').slice(0, 5).map((v) => v.slice(0, 40)) : undefined,
    platform: safeText(input.platform, 80),
    userAgent: safeText(input.userAgent, 400),
    screenWidth: safeNumber(input.screenWidth, 10000),
    screenHeight: safeNumber(input.screenHeight, 10000),
    viewportWidth: safeNumber(input.viewportWidth, 10000),
    viewportHeight: safeNumber(input.viewportHeight, 10000),
    pixelRatio: safeNumber(input.pixelRatio, 20),
    colorScheme: ['light', 'dark', 'no-preference'].includes(input.colorScheme) ? input.colorScheme : undefined,
    reducedMotion: typeof input.reducedMotion === 'boolean' ? input.reducedMotion : undefined,
    touchPoints: safeNumber(input.touchPoints, 20),
    hardwareConcurrency: safeNumber(input.hardwareConcurrency, 256),
    deviceMemory: safeNumber(input.deviceMemory, 2048),
    cookieEnabled: typeof input.cookieEnabled === 'boolean' ? input.cookieEnabled : undefined,
    localStorageAvailable: typeof input.localStorageAvailable === 'boolean' ? input.localStorageAvailable : undefined,
  };
}

function hashIpAddress(ip) {
  return createHash('sha256').update(`${LETTER_MASTER_KEY}:${String(ip || '')}`).digest('hex').slice(0, 24);
}

function buildEventContext(request, clientContext) {
  return {
    id: nanoid(),
    requestIpHash: hashIpAddress(request.ip || request.headers['x-forwarded-for'] || ''),
    userAgent: safeText(request.headers['user-agent'], 400),
    acceptLanguage: safeText(request.headers['accept-language'], 160),
    doNotTrack: safeText(request.headers.dnt, 20),
    referer: safeText(request.headers.referer || request.headers.referrer, 300),
    clientContext: normalizeClientContext(clientContext),
    createdAt: new Date().toISOString(),
  };
}

async function writeLetterEvent(letterSlug, eventType, request, clientContext) {
  const event = buildEventContext(request, clientContext);
  const eventRow = {
    id: event.id,
    letter_slug: letterSlug,
    event_type: eventType,
    request_ip_hash: event.requestIpHash,
    user_agent: event.userAgent || null,
    accept_language: event.acceptLanguage || null,
    do_not_track: event.doNotTrack || null,
    referer: event.referer || null,
    client_context_json: event.clientContext ? JSON.stringify(event.clientContext) : null,
    created_at: event.createdAt,
  };
  db.prepare(`
    INSERT INTO letter_events (
      id, letter_slug, event_type, request_ip_hash, user_agent, accept_language, do_not_track, referer, client_context_json, created_at
    ) VALUES (
      @id, @letter_slug, @event_type, @request_ip_hash, @user_agent, @accept_language, @do_not_track, @referer, @client_context_json, @created_at
    )
  `).run(eventRow);
  await mirrorLetterEventRow(eventRow);
}

function getLetterEvents(slug) {
  return db.prepare('SELECT * FROM letter_events WHERE letter_slug = ? ORDER BY created_at DESC').all(slug).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    createdAt: row.created_at,
    ipHash: row.request_ip_hash,
    userAgent: row.user_agent || undefined,
    acceptLanguage: row.accept_language || undefined,
    doNotTrack: row.do_not_track || undefined,
    referer: row.referer || undefined,
    clientContext: row.client_context_json ? JSON.parse(row.client_context_json) : undefined,
  }));
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function letterRowToAdmin(row) {
  const payload = decryptPayload(row.payload_encrypted);
  return {
    id: row.id,
    slug: row.slug,
    salutation: payload.salutation,
    recipient: payload.recipient,
    content: payload.content,
    closing: payload.closing,
    signature: payload.signature,
    sealType: row.seal_type,
    sealColor: row.seal_color,
    crest: row.crest,
    borderStyle: payload.borderStyle || 'none',
    customInitials: payload.customInitials || '',
    letterDate: payload.letterDate || undefined,
    bodyFont: row.body_font,
    salutationFont: payload.salutationFont || row.body_font,
    recipientFont: payload.recipientFont || row.body_font,
    closingFont: payload.closingFont || row.body_font,
    signatureFont: row.signature_font,
    flowers: payload.flowers || [],
    isPrivate: Boolean(row.is_private),
    expiresAt: row.expires_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    views: row.views || 0,
  };
}

function getStorageStats() {
  let dbSizeBytes = 0;
  try { dbSizeBytes = statSync(DB_FILE).size; } catch {}
  const cacheFiles = existsSync(CACHE_DIR) ? readdirSync(CACHE_DIR) : [];
  let cacheSizeBytes = 0;
  for (const file of cacheFiles) {
    try { cacheSizeBytes += statSync(join(CACHE_DIR, file)).size; } catch {}
  }
  return {
    dbFile: DB_FILE,
    dbSizeBytes,
    cacheDir: CACHE_DIR,
    cacheFiles: cacheFiles.length,
    cacheSizeBytes,
    mysqlMirrorEnabled: MYSQL_MIRROR_ENABLED,
  };
}

function getAdminStats() {
  const rows = db.prepare('SELECT * FROM letters ORDER BY created_at DESC').all();
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const sevenDaysForward = now + (7 * 24 * 60 * 60 * 1000);
  const letters = rows.map((row) => {
    const payload = decryptPayload(row.payload_encrypted);
    return {
      row,
      payload,
      contentLength: stripHtml(payload.content || '').length,
      flowerCount: Array.isArray(payload.flowers) ? payload.flowers.length : 0,
    };
  });
  const total = letters.length;
  const totalViews = letters.reduce((sum, item) => sum + Number(item.row.views || 0), 0);
  const recentLetters = letters.slice(0, 5).map(({ row, payload }) => ({
    id: row.id,
    slug: row.slug,
    recipient: payload.recipient,
    isPrivate: Boolean(row.is_private),
    createdAt: row.created_at,
    views: row.views || 0,
  }));
  const topViewedLetters = [...letters]
    .sort((a, b) => Number(b.row.views || 0) - Number(a.row.views || 0))
    .slice(0, 5)
    .map(({ row, payload }) => ({
      id: row.id,
      slug: row.slug,
      recipient: payload.recipient,
      views: row.views || 0,
    }));

  return {
    app: {
      version: VERSION,
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      nodeVersion: process.version,
      pid: process.pid,
      host: HOST,
      port: PORT,
      adminEnabled: ADMIN_API_ENABLED,
    },
    letters: {
      total,
      public: letters.filter((item) => !item.row.is_private).length,
      private: letters.filter((item) => Boolean(item.row.is_private)).length,
      createdToday: letters.filter((item) => new Date(item.row.created_at).getTime() >= oneDayAgo).length,
      createdLast7Days: letters.filter((item) => new Date(item.row.created_at).getTime() >= sevenDaysAgo).length,
      expiringSoon: letters.filter((item) => item.row.expires_at && new Date(item.row.expires_at).getTime() <= sevenDaysForward && !isExpired(item.row)).length,
      totalViews,
      averageFlowers: total ? Number((letters.reduce((sum, item) => sum + item.flowerCount, 0) / total).toFixed(2)) : 0,
      averageContentLength: total ? Number((letters.reduce((sum, item) => sum + item.contentLength, 0) / total).toFixed(2)) : 0,
    },
    storage: getStorageStats(),
    system: {
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      totalMemBytes: os.totalmem(),
      freeMemBytes: os.freemem(),
    },
    recentLetters,
    topViewedLetters,
  };
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
    if (typeof payload.content !== 'string' || payload.content.trim().length < 1 || payload.content.length > 20000) errors.push('content must be 1-20000 characters');
  }
  if (required('sealType') && (!SEAL_TYPES.has(payload.sealType))) errors.push(`sealType must be one of: ${[...SEAL_TYPES].join(', ')}`);
  if (required('sealColor') && (!SEAL_COLORS.has(payload.sealColor))) errors.push(`sealColor must be one of: ${[...SEAL_COLORS].join(', ')}`);

  if (has('salutation') && (typeof payload.salutation !== 'string' || payload.salutation.length > 100)) errors.push('salutation must be at most 100 characters');
  if (has('closing') && (typeof payload.closing !== 'string' || payload.closing.length > 100)) errors.push('closing must be at most 100 characters');
  if (has('signature') && (typeof payload.signature !== 'string' || payload.signature.length > 255)) errors.push('signature must be at most 255 characters');
  if (has('crest') && !CRESTS.has(payload.crest)) errors.push(`crest must be one of: ${[...CRESTS].join(', ')}`);
  if (has('borderStyle') && !BORDER_STYLES.has(payload.borderStyle)) errors.push(`borderStyle must be one of: ${[...BORDER_STYLES].join(', ')}`);
  if (has('customInitials') && (typeof payload.customInitials !== 'string' || payload.customInitials.length > 3)) errors.push('customInitials must be at most 3 characters');
  if (has('letterDate') && payload.letterDate !== undefined && payload.letterDate !== null && (typeof payload.letterDate !== 'string' || payload.letterDate.length > 120)) errors.push('letterDate must be at most 120 characters');
  if (has('bodyFont') && !BODY_FONTS.has(payload.bodyFont)) errors.push(`bodyFont must be one of: ${[...BODY_FONTS].join(', ')}`);
  if (has('salutationFont') && !BODY_FONTS.has(payload.salutationFont)) errors.push(`salutationFont must be one of: ${[...BODY_FONTS].join(', ')}`);
  if (has('recipientFont') && !BODY_FONTS.has(payload.recipientFont)) errors.push(`recipientFont must be one of: ${[...BODY_FONTS].join(', ')}`);
  if (has('closingFont') && !BODY_FONTS.has(payload.closingFont)) errors.push(`closingFont must be one of: ${[...BODY_FONTS].join(', ')}`);
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
    else if (payload.flowers.length > MAX_FLOWERS) errors.push(`flowers must contain at most ${MAX_FLOWERS} items`);
    else payload.flowers.forEach((flower, index) => validateFlower(flower, index, errors));
  }

  return errors;
}

function normalizeStoredPayload(payload, existing = {}) {
  const pickText = (value, fallback = '') => value === undefined ? String(fallback) : String(value);
  return {
    salutation: pickText(payload.salutation, existing.salutation ?? 'My dearest').trim(),
    recipient: pickText(payload.recipient, existing.recipient ?? '').trim(),
    content: pickText(payload.content, existing.content ?? '').trim(),
    closing: pickText(payload.closing, existing.closing ?? 'Forever yours,').trim(),
    signature: pickText(payload.signature, existing.signature ?? 'With love').trim(),
    borderStyle: pickText(payload.borderStyle, existing.borderStyle ?? 'none').trim() || 'none',
    customInitials: pickText(payload.customInitials, existing.customInitials ?? '').trim().slice(0, 3),
    letterDate: pickText(payload.letterDate, existing.letterDate ?? '').trim(),
    salutationFont: pickText(payload.salutationFont, existing.salutationFont ?? existing.bodyFont ?? 'eb-garamond').trim() || 'eb-garamond',
    recipientFont: pickText(payload.recipientFont, existing.recipientFont ?? existing.bodyFont ?? 'eb-garamond').trim() || 'eb-garamond',
    closingFont: pickText(payload.closingFont, existing.closingFont ?? existing.bodyFont ?? 'eb-garamond').trim() || 'eb-garamond',
    flowers: Array.isArray(payload.flowers) ? payload.flowers : (existing.flowers || []),
  };
}

function errorReply(reply, statusCode, error, code) {
  return reply.code(statusCode).send({ success: false, error, code });
}

function getRateLimitRule(method, pathname) {
  if (method === 'POST' && pathname === `${API_PREFIX}/letters`) return { limit: 10, windowMs: 60 * 60 * 1000 };
  if (method === 'POST' && /\/letters\/[^/]+\/unlock$/.test(pathname)) return { limit: 5, windowMs: 60 * 1000 };
  if (method === 'GET' && /\/letters\/[^/]+$/.test(pathname)) return { limit: 60, windowMs: 60 * 1000 };
  if (pathname.startsWith(API_PREFIX)) return { limit: 30, windowMs: 60 * 1000 };
  return null;
}

function consumeRateLimit(request, reply) {
  const pathname = String(request.raw.url || '').split('?')[0];
  const rule = getRateLimitRule(request.method, pathname);
  if (!rule) return true;

  const now = Date.now();
  const key = `${request.ip}:${request.method}:${pathname.replace(/\/[A-Za-z0-9_-]{6,}/g, '/:id')}`;
  const bucket = rateLimitStore.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowMs });
    reply.header('X-RateLimit-Limit', String(rule.limit));
    reply.header('X-RateLimit-Remaining', String(rule.limit - 1));
    reply.header('X-RateLimit-Reset', String(Math.ceil((now + rule.windowMs) / 1000)));
    return true;
  }

  if (bucket.count >= rule.limit) {
    reply.header('X-RateLimit-Limit', String(rule.limit));
    reply.header('X-RateLimit-Remaining', '0');
    reply.header('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    errorReply(reply, 429, 'Too many requests. Please try again later.', 'RATE_LIMITED');
    return false;
  }

  bucket.count += 1;
  rateLimitStore.set(key, bucket);
  reply.header('X-RateLimit-Limit', String(rule.limit));
  reply.header('X-RateLimit-Remaining', String(Math.max(0, rule.limit - bucket.count)));
  reply.header('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
  return true;
}

function pruneRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) rateLimitStore.delete(key);
  }
}

function writeDailyCache() {
  const rows = db.prepare('SELECT * FROM letters ORDER BY created_at DESC').all();
  const stamp = new Date().toISOString().slice(0, 10);
  writeFileSync(join(CACHE_DIR, `letters-cache-${stamp}.json`), JSON.stringify({ createdAt: new Date().toISOString(), letters: rows }, null, 2));

  const files = readdirSync(CACHE_DIR);
  const cutoff = Date.now() - DAILY_CACHE_TTL_MS;
  for (const file of files) {
    const fullPath = join(CACHE_DIR, file);
    try {
      const created = new Date(file.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '').getTime();
      if (Number.isFinite(created) && created < cutoff) rmSync(fullPath, { force: true });
    } catch {
    }
  }
}

function createRowFromLegacyLetter(letter) {
  const now = new Date().toISOString();
  return {
    id: letter.id || nanoid(),
    slug: letter.slug,
    payload_encrypted: encryptPayload({
      salutation: letter.salutation ?? 'My dearest',
      recipient: letter.recipient || '',
      content: letter.content || '',
      closing: letter.closing ?? 'Forever yours,',
      signature: letter.signature || 'With love',
      borderStyle: letter.borderStyle || 'none',
      customInitials: letter.customInitials || '',
      letterDate: letter.letterDate || '',
      salutationFont: letter.salutationFont || letter.bodyFont || 'eb-garamond',
      recipientFont: letter.recipientFont || letter.bodyFont || 'eb-garamond',
      closingFont: letter.closingFont || letter.bodyFont || 'eb-garamond',
      flowers: Array.isArray(letter.flowers) ? letter.flowers : [],
    }),
    seal_type: letter.sealType,
    seal_color: letter.sealColor,
    crest: letter.crest || 'none',
    body_font: letter.bodyFont || 'eb-garamond',
    signature_font: letter.signatureFont || 'great-vibes',
    is_private: letter.isPrivate ? 1 : 0,
    password_hash: letter.passwordHash || null,
    views: Number(letter.views || 0),
    expires_at: letter.expiresAt || null,
    created_at: letter.createdAt || now,
    updated_at: letter.updatedAt || now,
  };
}

async function syncLegacyJsonToPrimary() {
  if (!existsSync(LEGACY_DATA_FILE)) {
    console.log(`[legacy-json] no file found at ${LEGACY_DATA_FILE}`);
    return;
  }

  try {
    const parsed = JSON.parse(readFileSync(LEGACY_DATA_FILE, 'utf8'));
    const letters = Array.isArray(parsed.letters) ? parsed.letters.filter((letter) => letter?.slug) : [];
    let imported = 0;
    const insert = db.prepare(`
      INSERT OR IGNORE INTO letters (
        id, slug, payload_encrypted, seal_type, seal_color, crest, body_font, signature_font, is_private, password_hash, views, expires_at, created_at, updated_at
      ) VALUES (
        @id, @slug, @payload_encrypted, @seal_type, @seal_color, @crest, @body_font, @signature_font, @is_private, @password_hash, @views, @expires_at, @created_at, @updated_at
      )
    `);
    const run = db.transaction((items) => {
      for (const letter of items) {
        if (findLetter(letter.slug)) continue;
        insert.run(createRowFromLegacyLetter(letter));
        imported += 1;
      }
    });
    run(letters);

    if (mysqlMirrorPool && imported > 0) {
      const rows = db.prepare('SELECT * FROM letters WHERE slug IN (' + letters.map(() => '?').join(',') + ')').all(...letters.map((letter) => letter.slug));
      for (const row of rows) await mirrorLetterRow(row);
    }

    console.log(`[legacy-json] found ${letters.length} letters in ${LEGACY_DATA_FILE}; imported ${imported} into sqlite${mysqlMirrorPool ? ' and mysql mirror' : ''}`);
    writeDailyCache();
  } catch (error) {
    console.error('[legacy-json] sync failed:', error);
  }
}

await initMySqlMirror().catch((error) => {
  console.error('MySQL mirror init failed:', error?.message || error);
  mysqlMirrorPool = null;
});
await syncLegacyJsonToPrimary();
writeDailyCache();
setInterval(pruneRateLimitStore, 5 * 60 * 1000).unref();

function findLetter(slug) {
  const row = db.prepare('SELECT * FROM letters WHERE slug = ?').get(slug);
  return row || null;
}

function lettersBySlugs(slugs) {
  if (!slugs.length) return [];
  const placeholders = slugs.map(() => '?').join(',');
  return db.prepare(`SELECT * FROM letters WHERE slug IN (${placeholders}) ORDER BY created_at DESC`).all(...slugs);
}

const fastify = Fastify({ logger: true, bodyLimit: BODY_LIMIT, trustProxy: true });

await fastify.register(cors, {
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

fastify.addHook('onRequest', async (request, reply) => {
  if (!consumeRateLimit(request, reply)) return reply;
});

fastify.addHook('onSend', async (request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'no-referrer');
  reply.header('Cross-Origin-Resource-Policy', 'same-origin');
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  reply.header('X-Robots-Tag', 'noindex, nofollow');
  if (String(request.raw.url || '').startsWith(API_PREFIX)) reply.header('Cache-Control', 'no-store');
  if ((request.headers['x-forwarded-proto'] || '').toString().includes('https')) reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

function healthHandler(_request, reply) {
  reply.send({ status: 'ok', version: VERSION, timestamp: new Date().toISOString() });
}

fastify.get('/health', healthHandler);
fastify.get(`${API_PREFIX}/health`, healthHandler);

// Client error reporting endpoint
fastify.post(`${API_PREFIX}/client-errors`, async (request, reply) => {
  const { errors } = request.body || {};
  if (!Array.isArray(errors) || errors.length === 0) {
    return reply.code(400).send({ success: false, error: 'Invalid payload: errors array required' });
  }
  
  // Log errors to server console for debugging
  for (const err of errors) {
    fastify.log.warn({ 
      message: err.message,
      stack: err.stack,
      source: err.source,
      lineno: err.lineno,
      colno: err.colno,
      url: err.url,
      userAgent: err.userAgent,
      componentStack: err.componentStack,
      timestamp: err.timestamp
    }, 'Client error reported');
  }
  
  reply.send({ success: true, received: errors.length });
});

fastify.get(`${API_PREFIX}/seals`, async (_request, reply) => reply.send({ success: true, data: seals }));
fastify.get(`${API_PREFIX}/crests`, async (_request, reply) => reply.send({ success: true, data: crests }));

fastify.get(`${API_PREFIX}/admin/stats`, async (request, reply) => {
  if (!ADMIN_API_ENABLED) return errorReply(reply, 404, 'Admin API is disabled', 'ADMIN_DISABLED');
  if (!verifyAdminRequest(request)) return errorReply(reply, 401, 'Unauthorized', 'UNAUTHORIZED');
  reply.send({ success: true, data: getAdminStats() });
});

fastify.get(`${API_PREFIX}/admin/letters`, async (request, reply) => {
  if (!ADMIN_API_ENABLED) return errorReply(reply, 404, 'Admin API is disabled', 'ADMIN_DISABLED');
  if (!verifyAdminRequest(request)) return errorReply(reply, 401, 'Unauthorized', 'UNAUTHORIZED');
  const letters = db.prepare('SELECT * FROM letters ORDER BY created_at DESC').all().map(letterRowToAdmin);
  reply.send({ success: true, data: letters });
});

fastify.get(`${API_PREFIX}/admin/letters/:slug`, async (request, reply) => {
  if (!ADMIN_API_ENABLED) return errorReply(reply, 404, 'Admin API is disabled', 'ADMIN_DISABLED');
  if (!verifyAdminRequest(request)) return errorReply(reply, 401, 'Unauthorized', 'UNAUTHORIZED');
  const letter = findLetter(request.params.slug);
  if (!letter) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  reply.send({ success: true, data: { letter: letterRowToAdmin(letter), events: getLetterEvents(request.params.slug) } });
});

fastify.post(`${API_PREFIX}/letters`, async (request, reply) => {
  const payload = request.body || {};
  const errors = validatePayload(payload);
  if (errors.length) return errorReply(reply, 400, errors.join('; '), 'VALIDATION_ERROR');

  let slug = nanoid(10);
  while (findLetter(slug)) slug = nanoid(10);

  const now = new Date().toISOString();
  const token = tokenFor(slug);
  const storedPayload = normalizeStoredPayload(payload);
  const row = {
    id: nanoid(),
    slug,
    payload_encrypted: encryptPayload(storedPayload),
    seal_type: payload.sealType,
    seal_color: payload.sealColor,
    crest: payload.crest || 'none',
    body_font: payload.bodyFont || 'eb-garamond',
    signature_font: payload.signatureFont || 'great-vibes',
    is_private: payload.isPrivate ? 1 : 0,
    password_hash: payload.isPrivate ? hashPassword(payload.password) : null,
    views: 0,
    expires_at: payload.expiresAt || null,
    created_at: now,
    updated_at: now,
  };

  db.prepare(`
    INSERT INTO letters (
      id, slug, payload_encrypted, seal_type, seal_color, crest, body_font, signature_font, is_private, password_hash, views, expires_at, created_at, updated_at
    ) VALUES (
      @id, @slug, @payload_encrypted, @seal_type, @seal_color, @crest, @body_font, @signature_font, @is_private, @password_hash, @views, @expires_at, @created_at, @updated_at
    )
  `).run(row);
  await mirrorLetterRow(row);
  await writeLetterEvent(slug, 'create', request, payload.clientContext);

  writeDailyCache();
  reply.code(201).send({ success: true, data: letterRowToPublic(row, { unlocked: true }), token });
});

fastify.get(`${API_PREFIX}/letters`, async (request, reply) => {
  const slugs = String(request.query?.slugs || '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (slugs.length === 0) return reply.send({ success: true, data: [] });

  const letters = lettersBySlugs(slugs)
    .filter((letter) => !isExpired(letter))
    .map((letter) => letterRowToPublic(letter));

  reply.send({ success: true, data: letters });
});

fastify.get(`${API_PREFIX}/letters/:slug`, async (request, reply) => {
  const letter = findLetter(request.params.slug);
  if (!letter) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  if (isExpired(letter)) return errorReply(reply, 410, 'This letter has faded with time', 'LETTER_EXPIRED');
  reply.send({ success: true, data: letterRowToPublic(letter) });
});

fastify.post(`${API_PREFIX}/letters/:slug/unlock`, async (request, reply) => {
  const letter = findLetter(request.params.slug);
  if (!letter) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  if (isExpired(letter)) return errorReply(reply, 410, 'This letter has faded with time', 'LETTER_EXPIRED');
  if (!letter.is_private) return reply.send({ success: true, data: letterRowToPublic(letter, { unlocked: true }) });

  const password = request.body?.password;
  if (typeof password !== 'string' || password.length < 1) return errorReply(reply, 400, 'password is required', 'VALIDATION_ERROR');
  if (!verifyPassword(password, letter.password_hash || '')) return errorReply(reply, 403, 'Incorrect passphrase', 'WRONG_PASSWORD');
  await writeLetterEvent(request.params.slug, 'unlock', request, request.body?.clientContext);
  reply.send({ success: true, data: letterRowToPublic(letter, { unlocked: true }) });
});

fastify.post(`${API_PREFIX}/letters/:slug/view`, async (request, reply) => {
  const letter = findLetter(request.params.slug);
  if (!letter) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  if (isExpired(letter)) return errorReply(reply, 410, 'This letter has faded with time', 'LETTER_EXPIRED');
  db.prepare('UPDATE letters SET views = views + 1 WHERE slug = ?').run(request.params.slug);
  const updated = findLetter(request.params.slug);
  await mirrorLetterRow(updated);
  await writeLetterEvent(request.params.slug, 'view', request, request.body?.clientContext);
  reply.send({ success: true, views: updated?.views || 0 });
});

fastify.put(`${API_PREFIX}/letters/:slug`, async (request, reply) => {
  const slug = request.params.slug;
  if (!verifyManagementToken(request, slug)) return errorReply(reply, 401, 'Unauthorized', 'UNAUTHORIZED');

  const letter = findLetter(slug);
  if (!letter) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  if (isExpired(letter)) return errorReply(reply, 410, 'This letter has faded with time', 'LETTER_EXPIRED');

  const payload = request.body || {};
  const errors = validatePayload(payload, { partial: true });
  if (errors.length) return errorReply(reply, 400, errors.join('; '), 'VALIDATION_ERROR');

  const existingPayload = decryptPayload(letter.payload_encrypted);
  const nextPayload = normalizeStoredPayload(payload, existingPayload);
  const next = {
    ...letter,
    payload_encrypted: encryptPayload(nextPayload),
    seal_type: payload.sealType || letter.seal_type,
    seal_color: payload.sealColor || letter.seal_color,
    crest: payload.crest || letter.crest,
    body_font: payload.bodyFont || letter.body_font,
    signature_font: payload.signatureFont || letter.signature_font,
    is_private: payload.isPrivate === undefined ? letter.is_private : (payload.isPrivate ? 1 : 0),
    password_hash: payload.isPrivate === false ? null : (payload.password ? hashPassword(payload.password) : letter.password_hash),
    expires_at: payload.expiresAt === undefined ? letter.expires_at : (payload.expiresAt || null),
    updated_at: new Date().toISOString(),
  };

  db.prepare(`
    UPDATE letters SET
      payload_encrypted = @payload_encrypted,
      seal_type = @seal_type,
      seal_color = @seal_color,
      crest = @crest,
      body_font = @body_font,
      signature_font = @signature_font,
      is_private = @is_private,
      password_hash = @password_hash,
      expires_at = @expires_at,
      updated_at = @updated_at
    WHERE slug = @slug
  `).run(next);

  const updated = findLetter(slug);
  await mirrorLetterRow(updated);
  writeDailyCache();
  reply.send({ success: true, data: letterRowToPublic(updated, { unlocked: true }) });
});

fastify.delete(`${API_PREFIX}/letters/:slug`, async (request, reply) => {
  const slug = request.params.slug;
  if (!verifyManagementToken(request, slug)) return errorReply(reply, 401, 'Unauthorized', 'UNAUTHORIZED');
  const info = db.prepare('DELETE FROM letters WHERE slug = ?').run(slug);
  if (!info.changes) return errorReply(reply, 404, 'Letter not found', 'LETTER_NOT_FOUND');
  await mirrorLetterDelete(slug);
  writeDailyCache();
  reply.send({ success: true, data: { slug, deleted: true } });
});

fastify.setErrorHandler((err, _request, reply) => {
  fastify.log.error(err);
  errorReply(reply, 500, 'Internal server error', 'SERVER_ERROR');
});

await fastify.listen({ port: PORT, host: HOST });
