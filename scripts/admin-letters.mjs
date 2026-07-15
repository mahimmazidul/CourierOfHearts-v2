#!/usr/bin/env node
import Database from 'better-sqlite3';
import { createDecipheriv, createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvFile(path, override = true) {
  if (!existsSync(path)) return;
  const envText = readFileSync(path, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (override || !(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(join(root, '.env'), false);
loadEnvFile(join(root, '.deploy.env'), true);
loadEnvFile('/etc/courier-of-hearts/.env', true);

const DB_FILE = process.env.DB_FILE || join(root, 'server', 'data', 'letters.db');
const LETTER_MASTER_KEY = process.env.LETTER_MASTER_KEY;

if (!LETTER_MASTER_KEY) {
  console.error('Missing LETTER_MASTER_KEY in environment.');
  process.exit(1);
}

if (!existsSync(DB_FILE)) {
  console.log('[]');
  process.exit(0);
}

const db = new Database(DB_FILE, { readonly: true });
const MASTER_KEY = createHash('sha256').update(LETTER_MASTER_KEY).digest();
const full = process.argv.includes('--full');
const slugArgIndex = process.argv.indexOf('--slug');
const slug = slugArgIndex >= 0 ? process.argv[slugArgIndex + 1] : undefined;

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

const rows = slug
  ? db.prepare('SELECT * FROM letters WHERE slug = ? ORDER BY created_at DESC').all(slug)
  : db.prepare('SELECT * FROM letters ORDER BY created_at DESC').all();

const output = rows.map((row) => {
  const payload = decryptPayload(row.payload_encrypted);
  return full
    ? {
        id: row.id,
        slug: row.slug,
        isPrivate: Boolean(row.is_private),
        views: row.views,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...payload,
      }
    : {
        id: row.id,
        slug: row.slug,
        recipient: payload.recipient,
        salutation: payload.salutation,
        isPrivate: Boolean(row.is_private),
        borderStyle: payload.borderStyle || 'none',
        createdAt: row.created_at,
      };
});

console.log(JSON.stringify(output, null, 2));
