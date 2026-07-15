# The Courier of Hearts — API Specification

**Version**: 2.0.0  
**Base URL**: `https://your-domain.example/api/v1`

---

## Overview

The service exposes a small REST API for creating, reading, unlocking, updating, deleting, and tracking letters.

There are **no user accounts**. Instead:
- each created letter returns a **management token**
- that token is stored client-side
- the token is required for author-side update/delete flows

Server-side, letter payloads are stored **encrypted at rest**.

---

## Authentication Models

### 1) Letter management token
Used for update/delete of a specific letter.

```http
Authorization: Bearer <jwt_token>
```

### 2) Admin key
Optional and disabled by default. Used for steward/admin endpoints.

```http
X-Admin-Key: <admin_master_key>
```

---

## Core Endpoints

### Health

#### `GET /health`

Response:
```json
{
  "status": "ok",
  "version": "2.0.0",
  "timestamp": "2026-07-09T12:00:00.000Z"
}
```

---

### Create Letter

#### `POST /letters`

Request example:
```json
{
  "salutation": "My dearest",
  "recipient": "Maria",
  "content": "I wanted this letter to feel like something you would keep...",
  "closing": "Forever yours,",
  "signature": "A.",
  "sealType": "heart",
  "sealColor": "burgundy",
  "crest": "floral",
  "borderStyle": "vine",
  "customInitials": "AM",
  "letterDate": "Thursday, July 9, 2026",
  "bodyFont": "eb-garamond",
  "signatureFont": "great-vibes",
  "flowers": [],
  "isPrivate": true,
  "password": "secret phrase",
  "clientContext": {
    "browserId": "br_example",
    "timezone": "Asia/Dhaka",
    "viewportWidth": 390
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "vbUggG4iJEsGirKYBDiUd",
    "slug": "VIfteJFJ92",
    "recipient": "Maria",
    "sealType": "heart",
    "sealColor": "burgundy",
    "crest": "floral",
    "borderStyle": "vine",
    "customInitials": "AM",
    "letterDate": "Thursday, July 9, 2026",
    "bodyFont": "eb-garamond",
    "signatureFont": "great-vibes",
    "isPrivate": true,
    "requiresPassword": false,
    "createdAt": "2026-07-09T12:00:00.000Z",
    "updatedAt": "2026-07-09T12:00:00.000Z",
    "views": 0,
    "salutation": "My dearest",
    "content": "I wanted this letter to feel like something you would keep...",
    "closing": "Forever yours,",
    "signature": "A.",
    "flowers": []
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Get Letter

#### `GET /letters/:slug`

For private letters, body content is hidden until unlocked.

---

### Unlock Letter

#### `POST /letters/:slug/unlock`

Request:
```json
{
  "password": "secret phrase",
  "clientContext": {
    "browserId": "br_example",
    "timezone": "Asia/Dhaka"
  }
}
```

---

### Record View

#### `POST /letters/:slug/view`

Request:
```json
{
  "clientContext": {
    "browserId": "br_example",
    "timezone": "Asia/Dhaka"
  }
}
```

Response:
```json
{
  "success": true,
  "views": 3
}
```

---

### Update Letter

#### `PUT /letters/:slug`

Requires author management token.

---

### Delete Letter

#### `DELETE /letters/:slug`

Requires author management token.

---

### List Own Letters

#### `GET /letters?slugs=a,b,c`

Used by the no-account **My Letters** screen.

---

## Admin / Steward Endpoints

These are only available when:

```bash
ADMIN_API_ENABLED=true
ADMIN_MASTER_KEY=...
```

### Admin Stats

#### `GET /admin/stats`

Headers:
```http
X-Admin-Key: your-admin-key
```

Returns:
- runtime info
- storage info
- totals and counts
- recent letters
- top viewed letters

### Admin Letter List

#### `GET /admin/letters`

Headers:
```http
X-Admin-Key: your-admin-key
```

Returns full decrypted letter objects for steward/admin review.

### Admin Letter Info

#### `GET /admin/letters/:slug`

Headers:
```http
X-Admin-Key: your-admin-key
```

Returns:
- full decrypted letter
- request/event trace history for
  - `create`
  - `view`
  - `unlock`

Event records may include:
- hashed IP
- user agent
- accept-language
- do-not-track
- referer
- first-party browser/session reference
- non-permissioned client environment data

---

## Validation Highlights

| Field | Constraint |
|---|---|
| `recipient` | 1–255 chars |
| `content` | 1–20000 chars |
| `customInitials` | max 3 chars |
| `letterDate` | max 120 chars |
| `flowers` | max 50 items |
| `sealType` | `rose`, `heart`, `crown`, `raven`, `initials`, `monogram` |
| `sealColor` | `burgundy`, `crimson`, `emerald`, `gold`, `black` |
| `crest` | `none`, `royal`, `floral`, `shield`, `wreath`, `wings` |
| `borderStyle` | `none`, `vine`, `filigree`, `royal` |

---

## Error Format

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "LETTER_NOT_FOUND"
}
```

Common codes:
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `WRONG_PASSWORD`
- `LETTER_NOT_FOUND`
- `LETTER_EXPIRED`
- `RATE_LIMITED`
- `ADMIN_DISABLED`
- `SERVER_ERROR`

---

## Rate Limiting

Current in-process limits:

| Endpoint | Limit |
|---|---|
| `POST /letters` | 10 per hour per IP |
| `POST /letters/:slug/unlock` | 5 per minute per IP |
| `GET /letters/:slug` | 60 per minute per IP |
| other API routes | 30 per minute per IP |

---

## Storage Model

### Server-side storage
- SQLite database as the primary store
- optional MySQL / MariaDB mirror writes when `MYSQL_MIRROR_URL` is set
- legacy `letters.json` import on boot when `LEGACY_DATA_FILE` exists
- encrypted letter payload at rest using `LETTER_MASTER_KEY`
- passphrases hashed server-side
- daily cache snapshots for operational convenience

### Frontend-side fallback
If the API is unavailable, the frontend can fall back to **local browser storage** so writing and testing still work in static-only environments such as GitHub Pages.

That fallback is intended for continuity and testing, not multi-device delivery.

---

## Production Environment Variables

Common ones:

```bash
HOST=127.0.0.1
PORT=3847
JWT_SECRET=...
LETTER_MASTER_KEY=...
ADMIN_API_ENABLED=false
ADMIN_MASTER_KEY=...
MYSQL_MIRROR_URL=
DB_FILE=server/data/letters.db
CACHE_DIR=server/cache
CORS_ORIGIN=https://your-domain.example
```

Frontend flags:

```bash
VITE_API_BASE_URL=/api/v1
VITE_ENABLE_ADMIN_PANEL=false
VITE_ADMIN_ROUTE=sudo
VITE_SINGLEFILE=false
```

---

## Deployment

Use the one-command deploy helper:

```bash
bash deploy.sh
```

It can set up:
- frontend build deployment
- backend deployment
- `systemd` service
- daily backup timer
- `nginx`
- optional UFW rules
- optional certbot TLS

---

## Current Implementation Notes

This repository currently ships with:
- encrypted SQLite persistence
- self-hosted fonts
- local draft autosave
- local fallback letter storage when backend is down
- admin/steward panel support
- screenshot generation script for docs

---

*Keep the mechanics quiet. Let the letters feel alive.*
