# Contributing to The Courier of Hearts

Thank you for wanting to help make this project more beautiful. This is a passion project built with love, and every contribution should reflect that spirit.

---

## Design Philosophy

Before contributing, understand the core principle:

> **Every design decision should optimize for emotional impact rather than feature count.**

- When choosing between more features or more beauty — **choose beauty.**
- When choosing between more settings or a smoother experience — **choose the smoother experience.**
- The recipient should finish reading and think: *"Nobody has ever sent me something this beautiful."*

---

## Coding Standards

### TypeScript

- Strict mode enabled
- Use explicit types for function parameters and return values
- Prefer interfaces over type aliases for object shapes
- Use `type` imports where possible

### React

- Functional components only
- Custom hooks for shared logic
- Components should be focused and composable
- Keep components under 200 lines when possible
- Use semantic HTML elements

### Styling

- Tailwind CSS utility classes
- Custom CSS only for animations and complex effects
- Follow the established color palette and typography system
- Test on mobile and desktop

### Architecture

- All data access through `services/api.ts`
- Never access localStorage from components
- Keep business logic out of components
- Components should be pure presentation when possible

---

## Pull Request Workflow

1. **Fork** the repository
2. **Create a feature branch** from `main`
3. **Make your changes** with clear, focused commits
4. **Test** on mobile and desktop browsers
5. **Run the build** to confirm everything compiles: `npm run build`
6. **Submit a PR** with a clear description

### PR Description Template

```
## What

Brief description of the change.

## Why

Why this change makes the experience better.

## How

Technical approach taken.

## Screenshots

Before/after screenshots or screen recordings.
```

---

## Issue Templates

### Bug Report

```
**Describe the bug**
A clear description of what the bug is.

**To reproduce**
Steps to reproduce the behavior.

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Device**
- OS: [e.g., iOS]
- Browser: [e.g., Safari]
- Screen size: [e.g., mobile]
```

### Feature Request

```
**Is this about beauty or features?**
Explain how this enhances the emotional experience.

**Describe the feature**
A clear description of what you'd like.

**Why it matters**
How it serves the core goal: making the recipient feel special.

**Visual reference**
Mockups, references, or inspiration.
```

---

## Getting Started

```bash
npm install
npm run dev
```

The development server will start at `http://localhost:5173`.

---

## Areas for Contribution

- **Animation Polish** — Smoother transitions, more delightful micro-interactions
- **Accessibility** — Screen reader improvements, keyboard navigation
- **Internationalization** — Love letters in every language
- **Sound Design** — Subtle ambient audio (fireplace, page turning)
- **New Seal Designs** — Hand-illustrated SVG wax seal patterns
- **Performance** — Faster load times, optimized animations
- **Backend Implementation** — REST API, database, authentication

---

*Thank you for caring about craft.*
