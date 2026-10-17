# Continuation Notes

If you need to continue this project in a new Claude conversation (e.g. a
different account or a fresh chat), upload this zip along with the message
below — Claude will have everything it needs to pick up exactly where this
session left off.

## Message to paste into a new chat

> I'm continuing work on a React + TypeScript portfolio site built to a PRD.
> Attached is the current source code as a zip. It's a Vite + React +
> TypeScript + Tailwind CSS v4 + Framer Motion + React Router project.
> All editable content lives in `src/data/*.ts` (site.ts, projects.ts,
> experience.ts, achievements.ts, creative.ts, skills.ts), fully separated
> from UI components. Please unzip it, inspect the structure, and then
> [describe what you want changed].

## Current state (as of this export)
- Core site complete: Hero, Selected Work (3 case-study projects —
  Grameenphone flagship, Bike Sales Analysis, KFC dashboard), Capabilities,
  Approach, About, Experience, Recognition, Creative Work, Contact.
- Profile headshot added to Hero (`public/profile/farhan-headshot.webp`,
  referenced via `site.profileImage` in `src/data/site.ts`).
- Creative Work section populated with 3 real IIBF design pieces (event
  poster, executive panel graphic, campus ambassador announcement) — see
  `src/data/creative.ts`.
- BAYLA achievement proof images updated to the latest versions provided
  (Intra-IUB round + national Summit Finalist round) in
  `public/achievements/` — referenced from `src/data/achievements.ts`.
- Build verified clean: `npx tsc --noEmit` and `npm run build` both pass
  with no errors as of this export.

## To resume editing
```bash
npm install
npm run dev
```

## Where things live
| Want to change... | Edit this file |
|---|---|
| Name, tagline, contact links, resume path, profile photo | `src/data/site.ts` |
| Skills / "What I Work With" | `src/data/skills.ts` |
| Projects (metrics, gallery, case study text, links) | `src/data/projects.ts` |
| Experience timeline | `src/data/experience.ts` |
| Achievements / recognition proofs | `src/data/achievements.ts` |
| Creative work grid | `src/data/creative.ts` |
| Hero layout/visuals | `src/components/sections/Hero.tsx` |
| Any other section layout | `src/components/sections/*.tsx` |

Images go in `public/<category>/`, referenced with a leading `/` (e.g.
`/profile/farhan-headshot.webp` → `public/profile/farhan-headshot.webp`).
Convert large images to WebP (quality ~82-85) before adding, to keep the
site fast.
