# Farhan Rahman Fahim — Portfolio

Production-ready personal portfolio built in React + TypeScript, per the project PRD.

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (theme tokens in `src/index.css`)
- Framer Motion (animations)
- React Router (client-side routing, `/` and `/work/:slug`)
- lucide-react (icons)

## Getting Started
```bash
npm install
npm run dev       # local dev server
npm run build     # production build -> dist/
npm run preview   # preview the production build
```

## Editing Content (no component changes needed)
All editable content lives in `src/data/`:

| File | Controls |
|---|---|
| `site.ts` | Name, tagline, contact links, resume path, nav labels, approach steps |
| `skills.ts` | "What I Work With" capability groups |
| `projects.ts` | All 5 projects — metrics, gallery images, case-study sections, links |
| `experience.ts` | Experience timeline entries |
| `achievements.ts` | Recognition cards + proof images |
| `creative.ts` | Creative Work grid (currently placeholders — see below) |

### Adding a new project
1. Add optimized images (WebP recommended) to `public/projects/<slug>/`
2. Add a new object to the `projects` array in `src/data/projects.ts`
3. Any `links.*` field left unset is automatically hidden in the UI — no need to touch components.

### Live-project cards (Habito, IUB Alumni Database)
Projects with `links.live` set get a split card: clicking the preview image opens the live
site in a new tab, clicking the text opens the details page. A project can also carry a
`disclaimer` banner and a `demoAccess` block (demo logins) — both render on its details page.
Replace the generated preview images in `public/projects/habito/` and
`public/projects/iub-alumni/` with real screenshots (keep the same file names, or update
`coverImage` / `gallery` in `projects.ts`).

### Creative Work section
No exported creative/design assets (e.g. Canva graphics, event posters) were available
at build time, so `src/data/creative.ts` currently contains 3 placeholder entries
marked `[ADD CREATIVE WORK TITLE]` / `[ADD DESCRIPTION]` with `image: ""`. Replace
`image` with a real path under `public/creative/` and update the copy to activate them.

### Known content notes
- BAYLA Future Leaders: source materials showed two distinct results — a Champion
  title at the Intra-IUB round, and a Finalist result at the national Summit. Both
  are listed separately in `achievements.ts` rather than merged into one claim.
- No SQL/Python/report files were available for the Grameenphone project specifically
  (only the 3 Power BI dashboard exports) — this is noted transparently in that
  project's case study rather than fabricated.
- The GitHub link used for the Bike project is Farhan's general GitHub profile
  (the only GitHub URL present in the source material), not a project-specific repo.
  Update `links.github` in `projects.ts` once a dedicated repo exists.

## Deployment
`npm run build` outputs a static site in `dist/` — deployable to Vercel, Netlify,
GitHub Pages, or any static host. Client-side routing requires a rewrite rule to
`index.html` for all paths (already the default on Vercel/Netlify; for GitHub Pages
add a `404.html` copy of `index.html`).

---

<details>
<summary>Original Vite template notes</summary>

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

</details>
