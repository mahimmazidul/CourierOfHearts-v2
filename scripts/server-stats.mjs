#!/usr/bin/env node
import Database from 'better-sqlite3';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const localEnvPath = join(root, '.env');
if (existsSync(localEnvPath)) {
  const envText = readFileSync(localEnvPath, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

const DB_FILE = process.env.DB_FILE || join(root, 'server', 'data', 'letters.db');
const LEGACY_DATA_FILE = process.env.LEGACY_DATA_FILE || join(root, 'server', 'data', 'letters.json');
const CACHE_DIR = process.env.CACHE_DIR || join(root, 'server', 'cache');
const APP_NAME = process.env.APP_NAME || 'courier-of-hearts';
const MYSQL_MIRROR_URL = process.env.MYSQL_MIRROR_URL || '';
const jsonMode = process.argv.includes('--json');

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const rows = existsSync(DB_FILE)
  ? new Database(DB_FILE, { readonly: true }).prepare('SELECT * FROM letters ORDER BY created_at DESC').all()
  : [];
const total = rows.length;
const privateCount = rows.filter((row) => Boolean(row.is_private)).length;
const publicCount = total - privateCount;
const totalViews = rows.reduce((sum, row) => sum + Number(row.views || 0), 0);
const now = Date.now();
const todayCutoff = now - 24 * 60 * 60 * 1000;
const weekCutoff = now - 7 * 24 * 60 * 60 * 1000;

let dbSize = 0;
try { dbSize = statSync(DB_FILE).size; } catch {}
const cacheFiles = existsSync(CACHE_DIR) ? readdirSync(CACHE_DIR) : [];
let cacheSize = 0;
for (const file of cacheFiles) {
  try { cacheSize += statSync(join(CACHE_DIR, file)).size; } catch {}
}

let serviceStatus = 'unknown';
try {
  const result = spawnSync('systemctl', ['is-active', `${APP_NAME}-api.service`], { encoding: 'utf8' });
  if (result.status === 0) serviceStatus = result.stdout.trim() || 'active';
  else if (result.stdout.trim() || result.stderr.trim()) serviceStatus = (result.stdout.trim() || result.stderr.trim());
} catch {}

const stats = {
  app: {
    dbFile: DB_FILE,
    cacheDir: CACHE_DIR,
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    host: os.hostname(),
    cpus: os.cpus().length,
    uptimeSeconds: process.uptime(),
    serviceStatus,
  },
  letters: {
    total,
    private: privateCount,
    public: publicCount,
    totalViews,
    createdToday: rows.filter((row) => new Date(row.created_at).getTime() >= todayCutoff).length,
    createdLast7Days: rows.filter((row) => new Date(row.created_at).getTime() >= weekCutoff).length,
    averageContentLength: 0,
  },
  storage: {
    dbSizeBytes: dbSize,
    cacheFiles: cacheFiles.length,
    cacheSizeBytes: cacheSize,
    legacyJsonExists: existsSync(LEGACY_DATA_FILE),
    mysqlMirrorEnabled: Boolean(MYSQL_MIRROR_URL),
  },
  system: {
    totalMemoryBytes: os.totalmem(),
    freeMemoryBytes: os.freemem(),
    loadAverage: os.loadavg(),
  },
};

if (jsonMode) {
  console.log(JSON.stringify(stats, null, 2));
  process.exit(0);
}

console.log('Courier of Hearts — Server Stats');
console.log('='.repeat(36));
console.log(`Letters      : ${stats.letters.total} total (${stats.letters.private} private, ${stats.letters.public} public)`);
console.log(`Views        : ${stats.letters.totalViews}`);
console.log(`Recent       : ${stats.letters.createdToday} today · ${stats.letters.createdLast7Days} in last 7 days`);
console.log(`Database     : ${DB_FILE}`);
console.log(`DB Size      : ${formatBytes(stats.storage.dbSizeBytes)}`);
console.log(`Legacy JSON  : ${stats.storage.legacyJsonExists ? LEGACY_DATA_FILE : 'not found'}`);
console.log(`MySQL Mirror : ${stats.storage.mysqlMirrorEnabled ? 'enabled' : 'disabled'}`);
console.log(`Cache        : ${cacheFiles.length} files · ${formatBytes(cacheSize)}`);
console.log(`Host         : ${stats.app.host}`);
console.log(`Service      : ${stats.app.serviceStatus}`);
console.log(`Node         : ${stats.app.node}`);
console.log(`Platform     : ${stats.app.platform}`);
console.log(`CPU / Load   : ${stats.app.cpus} cores · ${stats.system.loadAverage.map((v) => v.toFixed(2)).join(' / ')}`);
console.log(`Memory Free  : ${formatBytes(stats.system.freeMemoryBytes)} / ${formatBytes(stats.system.totalMemoryBytes)}`);
console.log(`Process Uptime: ${Math.floor(stats.app.uptimeSeconds)}s`);
