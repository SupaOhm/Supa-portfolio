# Supa's Portfolio

A modern, interactive developer portfolio built with **React 19**, **TypeScript**, and **Tailwind CSS**. It presents projects, skills, and live GitHub activity as a single scrolling page with smooth section navigation, a 3D project carousel, and a dark, animated UI.

🔗 **Live:** https://supakornohm.vercel.app

---

## ✨ Features

- **Single-page, section-based navigation** — Home, About, Skills, Projects, and Connect live on one page; the navbar tracks the section in view with an `IntersectionObserver` and scrolls smoothly to it.
- **3D project carousel** — Perspective-transformed cards where the center card is full-size and bright while neighbors rotate and dim for depth, with looping next/previous controls and dot navigation.
- **Grid ↔ carousel toggle** — Switch between an immersive carousel and a scannable grid.
- **Category filtering** — Filter projects across Web, Mobile, Backend, Database, Tools, Embedded, Security, Cloud, AI, Design, and Data, each with a live count badge.
- **Live GitHub data** — Profile and repo stats (avatar, total stars, top language, most-starred repo, and more) fetched at runtime from the public GitHub API.
- **Animated hero** — A typing animation cycling through roles, with a cursor-following gradient that eases toward the pointer.
- **Reveal-on-scroll** — Sections fade and animate in as they enter the viewport.
- **Fully responsive dark theme** — Blue/purple accents on gray-950, tuned for mobile, tablet, and desktop.

---

## 🛠️ Tech Stack

| Tool | Version | Role |
| --- | --- | --- |
| React | 19.2 | UI framework |
| TypeScript | 5.9 | Type safety |
| React Router | 7.x | Routing + scroll-target state |
| Tailwind CSS | 3.4 | Styling & animation utilities |
| Vite | 7.x | Dev server & build |
| ESLint | 9.x | Linting (typescript-eslint, react-hooks) |

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:5173, also exposed on your LAN)
npm run dev

# Type-check and build for production → dist/
npm run build

# Preview the production build locally
npm run preview

# Lint
npm run lint
```

> Requires Node ^20.19 or >=22.12 (Vite 7). Run `npm test` for the unit test suite and `npm run typecheck` for a standalone type check.
>
> Two additional scripts (`npm run images`, `npm run og`) re-encode source assets in `assets-src/` into files under `public/`. Both are macOS-and-local only, never run in CI, and require Node 22.18+/23.6+ — see `CLAUDE.md` for details.

---

## 📂 Project Structure

```
src/
├── components/
│   ├── Navbar.tsx        # Section tracking (IntersectionObserver) + smooth scroll nav
│   ├── Hero.tsx          # Typing animation + cursor-following gradient
│   ├── About.tsx         # Bio + compact live GitHub snapshot
│   ├── Skills.tsx        # Skills grouped by category
│   ├── Projects.tsx      # 3D carousel, grid view, and category filtering
│   ├── ProjectCard.tsx   # Individual project card
│   ├── Connect.tsx       # Contact links + detailed live GitHub insights
│   └── Footer.tsx        # Footer links and credits
├── data/
│   └── projects.ts       # PROJECTS array — the source of project content
├── pages/
│   ├── Home.tsx               # Composes all sections; handles scroll-to-section on load
│   ├── RedirectToSection.tsx  # /about, /projects, /connect: redirects to / with a section target
│   └── NotFound.tsx           # Catch-all route for any other URL
├── types/
│   └── project.ts        # Project type + category/status string-literal unions
├── App.tsx               # Router + layout shell
├── main.tsx              # React entry (StrictMode + BrowserRouter)
└── index.css             # Global styles, keyframes, and animations
```

`vercel.json`, at the repo root, is the production deploy config: it rewrites every unmatched path to `index.html` so client-side routes like `/about` resolve instead of 404ing, while still letting Vercel serve static files (like `public/images/...`) directly.

Project images are static assets in `public/images/projects/`, referenced by absolute path (e.g. `/images/projects/expense.webp`). Originals live in `assets-src/projects/` (outside `public/`, never deployed) and are re-encoded to the `.webp` files under `public/images/projects/` by `npm run images`. The same pattern produces the Open Graph card: `assets-src/og/og.html` is rendered by `npm run og` into `public/og.png`.

---

## 🧭 How Navigation Works

`App.tsx` declares routes for `/`, `/about`, `/projects`, `/connect`, and a catch-all `*`, but the real experience is a **single scrolling page**: `pages/Home.tsx` (mounted at `/`) stacks `Hero`, `About`, `Skills`, `Projects`, and `Connect`.

- `/about`, `/projects`, and `/connect` don't render their own page content — each renders `RedirectToSection`, which immediately redirects to `/` carrying a target section ID, so a direct link to `/projects` lands you on the single page, scrolled to Projects.
- Any other URL renders `NotFound`. This only works in production because `vercel.json` rewrites every unmatched path to `index.html` — without it, Vercel's static host would 404 before React Router ever sees the URL.
- The **navbar** observes each section (threshold ~0.6) to highlight the active one and triggers `scrollIntoView` for smooth jumps.
- When you arrive at `/` from elsewhere, `Home.tsx` reads `location.state.targetId` (or the URL hash) and scrolls to that section on mount.

When extending navigation, treat `/about`, `/projects`, `/connect` as redirect-only entry points, not as pages — the primary path renders everything inside `Home`.

---

## 🔧 Customization

### Add or edit projects
Projects live in **`src/data/projects.ts`** as the `PROJECTS: Project[]` array:

```ts
{
  id: '1',
  title: 'Full-Stack Expense Management',
  description: 'A full-stack expense app with a React frontend and Express/MongoDB backend…',
  tags: ['MongoDB', 'Express.js', 'React', 'Node.js'],
  imageUrl: '/images/projects/expense.webp',
  githubUrl: 'https://github.com/SupaOhm/Expense-Tracker',
  status: 'completed',          // 'completed' | 'in-progress' | 'planned'
  categories: ['Web', 'Backend', 'Database'],
}
```

The `Project` type and the allowed `categories`/`status` values are defined in **`src/types/project.ts`** as `as const` unions — add a new category or status there first and TypeScript (and the filter UI) will pick it up.

### Update the hero roles
Edit the `WORDS` array in `src/components/Hero.tsx`.

### Update skills
Edit the `SKILL_CATEGORIES` object in `src/components/Skills.tsx`.

### Point GitHub stats at a different account
`GITHUB_USERNAME` is set in both `src/components/About.tsx` and `src/components/Connect.tsx`. Requests are unauthenticated and subject to GitHub's public rate limit (60 req/hr/IP), so expect occasional throttling during heavy local reloading.

### Theme
The dark theme uses `gray-900`/`gray-950` backgrounds with `blue-*` and `purple-*` accents via Tailwind utility classes (`tailwind.config.js` has no custom theme extensions).

---

## 👤 Author

**SupaOhm** — [@SupaOhm](https://github.com/SupaOhm)

## 📄 License

Open source under the MIT License.
