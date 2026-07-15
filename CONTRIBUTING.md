# Contributing to The Courier of Hearts

Thank you for wanting to help make this project more beautiful.

This is not a feature-race project. It should feel intimate, deliberate, and worth keeping.

---

## Design Philosophy

Before contributing, remember the core principle:

> **Every design decision should optimize for emotional impact rather than feature count.**

- When choosing between more features or more beauty — **choose beauty**.
- When choosing between more settings or a smoother experience — **choose the smoother experience**.
- When polishing, prefer subtlety over loudness.

---

## Project Shape

The app now includes:
- a React frontend
- a Fastify backend
- SQLite persistence
- self-hosted fonts
- optional admin/steward tools
- local browser fallback for frontend-only environments

Contributions should respect that split.

---

## Coding Standards

### TypeScript / React
- functional components only
- explicit types where helpful
- keep components focused
- prefer shared helpers/hooks over repeated logic

### Styling
- Tailwind utilities first
- custom CSS for texture, print, and animation details
- avoid heavy UI shifts that break the tone

### Data / Storage
- frontend data access goes through `src/services/`
- server behavior lives in `server/index.js`
- avoid direct component-level persistence hacks
- if you touch fallback/local storage behavior, test both:
  - backend available
  - backend unavailable

---

## Local Development

```bash
npm install
npm run dev
npm run server
```

Useful extras:

```bash
npm run build
npm run server:stats
npm run letters:admin -- --full
node scripts/take-screenshots.mjs
```

---

## Deployment

Production deploy helper:

```bash
bash deploy.sh
```

If you change deployment behavior, update:
- `deploy.sh`
- `.env.example`
- `README.md`
- `API.md`

---

## Screenshots / Docs

If UI changes are visible, refresh the docs screenshots and update markdown references where needed.

Current screenshot script:

```bash
node scripts/take-screenshots.mjs
```

---

## Pull Requests

Please include:

```md
## What changed

## Why it improves the experience

## Notes for testing

## Screenshots (desktop/mobile if relevant)
```

---

## Areas of Good Contribution

- typography polish
- accessibility improvements
- print layout improvements
- performance / stability work
- Bangla and multilingual support
- subtle new ornaments, seals, and border ideas
- steward/admin operational improvements
- deployment hardening

---

## Be Careful With

- invasive tracking ideas
- flashy dashboard-style UI changes
- adding complexity that weakens the emotional tone
- breaking offline/local fallback behavior
- breaking print output

---

*Thank you for caring about craft.*
