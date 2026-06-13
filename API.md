# The Courier of Hearts — API Specification

**Version**: 1.0.0  
**Base URL**: `https://api.courierofhearts.com/api/v1`

---

## Authentication

Public letters require no authentication. Letter management (update, delete, list own) uses Bearer tokens.

```
Authorization: Bearer <jwt_token>
```

Tokens are issued on letter creation and stored client-side. No user accounts required — each letter generates its own management token.

---

## Endpoints

### Health

#### `GET /health`

```json
// Response 200
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-01-15T12:00:00.000Z"
}
```

---

### Letters

#### `POST /letters`

Create a new letter.

**Request**
```json
{
  "salutation": "My dearest",
  "recipient": "Eleanor",
  "content": "Every moment apart feels like a century...",
  "closing": "Forever yours,",
  "signature": "William",
  "sealType": "rose",
  "sealColor": "burgundy",
  "crest": "floral",
  "customInitials": "W·E",
  "bodyFont": "eb-garamond",
  "signatureFont": "great-vibes",
  "flowers": [
    {
      "id": "f1a2b3",
      "flowerId": "rose",
      "x": 85,
      "y": 12,
      "size": 44,
      "rotation": -15
    }
  ],
  "isPrivate": false,
  "password": null,
  "expiresAt": null
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "clx1abc2d3e4f5",
    "slug": "aB3kL9mNpQ",
    "salutation": "My dearest",
    "recipient": "Eleanor",
    "content": "Every moment apart feels like a century...",
    "closing": "Forever yours,",
    "signature": "William",
    "sealType": "rose",
    "sealColor": "burgundy",
    "crest": "floral",
    "customInitials": "W·E",
    "bodyFont": "eb-garamond",
    "signatureFont": "great-vibes",
    "flowers": [...],
    "isPrivate": false,
    "expiresAt": null,
    "createdAt": "2026-01-15T12:00:00.000Z",
    "updatedAt": "2026-01-15T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Validation**
| Field | Required | Constraints |
|-------|----------|-------------|
| recipient | yes | 1-255 chars |
| content | yes | 1-10000 chars |
| signature | no | max 255 chars, defaults to "With love" |
| salutation | no | max 100 chars, defaults to "My dearest" |
| closing | no | max 100 chars, defaults to "Forever yours," |
| sealType | yes | enum: rose, heart, crown, raven, initials, monogram |
| sealColor | yes | enum: burgundy, crimson, emerald, gold, black |
| crest | no | enum: none, royal, floral, shield, wreath, wings |
| customInitials | no | max 3 chars |
| bodyFont | no | enum: eb-garamond, cormorant, crimson, medieval, uncial, almendra, marck, parisienne |
| signatureFont | no | enum: great-vibes, satisfy, dancing, marck, parisienne |
| flowers | no | array, max 20 items |
| isPrivate | no | boolean, defaults to false |
| password | conditional | required if isPrivate is true, 1-100 chars |
| expiresAt | no | ISO 8601 datetime, must be in the future |

---

#### `GET /letters/:slug`

Retrieve a letter by its slug. Returns the letter without the password hash.

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "clx1abc2d3e4f5",
    "slug": "aB3kL9mNpQ",
    "salutation": "My dearest",
    "recipient": "Eleanor",
    "content": "Every moment apart feels like a century...",
    "closing": "Forever yours,",
    "signature": "William",
    "sealType": "rose",
    "sealColor": "burgundy",
    "crest": "floral",
    "customInitials": "W·E",
    "bodyFont": "eb-garamond",
    "signatureFont": "great-vibes",
    "flowers": [...],
    "isPrivate": true,
    "requiresPassword": true,
    "expiresAt": null,
    "createdAt": "2026-01-15T12:00:00.000Z"
  }
}
```

**Note**: If `isPrivate` is true, the `content`, `signature`, `closing`, `salutation`, and `flowers` fields are omitted until unlocked via `/letters/:slug/unlock`.

**Response 404**
```json
{
  "success": false,
  "error": "Letter not found"
}
```

**Response 410**
```json
{
  "success": false,
  "error": "This letter has faded with time"
}
```

---

#### `PUT /letters/:slug`

Update a letter. Requires the management token from creation.

**Headers**: `Authorization: Bearer <token>`

**Request**: Same as POST, all fields optional.

**Response 200**: Updated letter object.

**Response 401**: `{ "success": false, "error": "Unauthorized" }`

---

#### `DELETE /letters/:slug`

Delete a letter permanently.

**Headers**: `Authorization: Bearer <token>`

**Response 200**
```json
{
  "success": true,
  "data": { "slug": "aB3kL9mNpQ", "deleted": true }
}
```

---

#### `POST /letters/:slug/unlock`

Unlock a password-protected letter.

**Request**
```json
{
  "password": "our-secret-phrase"
}
```

**Response 200**: Full letter object with all fields.

**Response 403**
```json
{
  "success": false,
  "error": "Incorrect passphrase"
}
```

---

#### `POST /letters/:slug/view`

Record that a letter was viewed. Used for analytics (optional).

**Response 200**
```json
{
  "success": true,
  "views": 3
}
```

---

### Seals

#### `GET /seals`

List available seal designs.

**Response 200**
```json
{
  "success": true,
  "data": [
    { "id": "rose", "name": "Rose", "description": "Classic layered rose petals" },
    { "id": "heart", "name": "Heart", "description": "Heart crest" },
    { "id": "crown", "name": "Crown", "description": "Royal crown" },
    { "id": "raven", "name": "Raven", "description": "Messenger raven" },
    { "id": "initials", "name": "Initials", "description": "Intertwined initials" },
    { "id": "monogram", "name": "Monogram", "description": "Single letter monogram" }
  ]
}
```

---

### Crests

#### `GET /crests`

List available crest decorations.

**Response 200**
```json
{
  "success": true,
  "data": [
    { "id": "none", "name": "None" },
    { "id": "royal", "name": "Royal Star" },
    { "id": "floral", "name": "Floral Mandala" },
    { "id": "shield", "name": "Shield" },
    { "id": "wreath", "name": "Laurel Wreath" },
    { "id": "wings", "name": "Wings & Heart" }
  ]
}
```

---

## Error Format

All errors follow the same shape:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "LETTER_NOT_FOUND"
}
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `WRONG_PASSWORD` | 403 | Incorrect letter passphrase |
| `LETTER_NOT_FOUND` | 404 | No letter with that slug |
| `LETTER_EXPIRED` | 410 | Letter has passed its expiration |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /letters` | 10 per hour per IP |
| `POST /letters/:slug/unlock` | 5 per minute per IP |
| `GET /letters/:slug` | 60 per minute per IP |
| All others | 30 per minute per IP |

Rate limit headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1705320000
```

---

## Database Schema (Production)

```sql
CREATE TABLE letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(10) UNIQUE NOT NULL,
  salutation VARCHAR(100) NOT NULL DEFAULT 'My dearest',
  recipient VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  closing VARCHAR(100) NOT NULL DEFAULT 'Forever yours,',
  signature VARCHAR(255) DEFAULT 'With love',
  seal_type VARCHAR(20) NOT NULL,
  seal_color VARCHAR(20) NOT NULL,
  crest VARCHAR(20) DEFAULT 'none',
  custom_initials VARCHAR(3) DEFAULT '',
  body_font VARCHAR(30) DEFAULT 'eb-garamond',
  signature_font VARCHAR(30) DEFAULT 'great-vibes',
  flowers JSONB DEFAULT '[]',
  is_private BOOLEAN DEFAULT false,
  password_hash VARCHAR(255),
  management_token_hash VARCHAR(255),
  views INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_letters_slug ON letters(slug);
CREATE INDEX idx_letters_created_at ON letters(created_at DESC);
CREATE INDEX idx_letters_expires ON letters(expires_at) WHERE expires_at IS NOT NULL;
```

---

## Security

- Passwords are hashed with **bcrypt** (cost factor 12) before storage
- Management tokens are **JWT** signed with HS256, contain only `{ slug, iat, exp }`
- Slugs are **nanoid** (10 chars, URL-safe alphabet) — 64^10 = ~1.15 quintillion possibilities
- Content is sanitized for XSS on output
- CORS restricted to allowed origins
- All responses include `X-Content-Type-Options: nosniff`
- HTTPS enforced in production

---

## Deployment Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vercel /   │────▶│  Fastify API │────▶│ PostgreSQL  │
│   Netlify    │     │  (Node.js)   │     │  (Neon/     │
│  (Frontend)  │     │              │     │   Supabase) │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │    Redis     │
                    │  (Upstash)   │
                    │  Rate limits │
                    │  + caching   │
                    └──────────────┘
```

---

## Current Implementation

This repository includes a development-ready Fastify backend in `server/index.js` and a REST-backed frontend service in `src/services/api.ts`.

Implemented locally:

1. `POST /letters`, `GET /letters/:slug`, `PUT /letters/:slug`, `DELETE /letters/:slug`, `POST /letters/:slug/unlock`, `POST /letters/:slug/view`
2. `GET /letters?slugs=a,b,c` to support the account-free "My Letters" screen using locally stored management tokens
3. `GET /seals`, `GET /crests`, `GET /health`
4. bcrypt passphrase hashing for private letters
5. JWT management tokens returned on creation and required for updates/deletes
6. JSON-file persistence at `server/data/letters.json` by default

Run it with:

```bash
npm run server
```

For production, replace the JSON persistence layer with PostgreSQL/Prisma and set a strong `JWT_SECRET`.
