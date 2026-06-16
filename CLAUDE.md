# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (host `0.0.0.0`, port `5173`, exposed on LAN)
- `npm run build` — type-check (`tsc -b`) then build to `dist/`
- `npm run lint` — run ESLint over the repo
- `npm run preview` — serve the production build locally

There is no test suite or test runner configured.

## Architecture

Single-page React 19 portfolio built with Vite, TypeScript, and Tailwind CSS v3. No backend — all dynamic data comes from the public GitHub REST API at runtime.

**Routing vs. single-page sections is the key thing to understand.** `App.tsx` declares React Router routes (`/`, `/about`, `/projects`, `/connect`), but the actual UX is a single scrolling page: `pages/Home.tsx` stacks `Hero`, `About`, `Skills`, `Projects`, and `Connect` together. Navigation works by scrolling to section IDs, not by switching routes:
- `Navbar` uses an `IntersectionObserver` (threshold ~0.6) to highlight the active section and triggers smooth scroll.
- `Home.tsx` reads `location.state.targetId` (or the URL hash) on mount and calls `scrollIntoView` to jump to a section.

When editing navigation, treat the standalone `/about`, `/projects`, `/connect` routes as secondary — the primary path renders everything inside `Home`.

**Project data lives in `src/data/projects.ts`** as the `PROJECTS: Project[]` array (the README's claim that projects live in `Projects.tsx` is outdated). The `Project` type and the allowed `ProjectCategory` / `ProjectStatus` string-literal unions are defined in `src/types/project.ts` — add new categories/statuses there first, since they are `as const` tuples that drive both typing and filter UI. Project images are static assets under `public/images/projects/` referenced by absolute path (e.g. `/images/projects/expense.png`).

**GitHub integration** is duplicated in both `About.tsx` (compact snapshot) and `Connect.tsx` (detailed insights). Each component hardcodes `GITHUB_USERNAME = 'SupaOhm'` and fetches `https://api.github.com/users/<user>` plus the repos endpoint client-side. There is no auth token, so these calls are subject to GitHub's unauthenticated rate limit (60 req/hr/IP) — expect failures during heavy local reloading and handle them gracefully.

**Projects.tsx** holds the most complex UI: a 3D perspective carousel (center card scaled/full brightness, neighbors rotated and dimmed for depth) plus a grid view toggle and category filtering with count badges. Animations are CSS/Tailwind-driven; global keyframes live in `src/index.css`.

## Conventions

- Components are function components with default exports, colocated in `src/components/`.
- Styling is Tailwind utility classes inline; the dark theme uses `gray-900`/`gray-950` backgrounds with `blue-*`/`purple-*` accents. `tailwind.config.js` has no custom theme extensions.
- Type-only imports use `import type { ... }`.
