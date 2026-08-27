# Frontend

React + TypeScript client for the IUB Alumni Information Management System.

**Built:** design tokens, the typed API client, session handling, sign-in, the role-aware shell, the Alumni Directory, alumni profiles, and the full verification workflow — the alumni update form, submission tracking, and the admin Verification Centre. The two dashboards are the remaining slice; their tabs route to a named placeholder, so nothing is a dead end.

---

## Setup

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

`vite.config.ts` proxies `/api` to `http://localhost:8000`, so run the backend first. For a different host, set `VITE_API_URL` (see `.env.example`).

```bash
npm run typecheck    # tsc --noEmit
npm run build        # tsc -b && vite build
node verify-api-contract.mjs        # 31 checks — auth, directory, profiles
node verify-workflow-contract.mjs   # 34 checks — the submission lifecycle
```

---

## Structure

```
frontend/src/
├── main.tsx                  Entry
├── App.tsx                   Routes and role guards
├── styles/global.css         Design tokens + all styling
├── lib/
│   ├── types.ts              Types mirroring the API models
│   └── api.ts                The only place that talks to the backend
├── auth/AuthProvider.tsx     Session state, RequireAuth guard
├── components/
│   ├── AppShell.tsx          Top bar + role-aware nav
│   ├── Comparison.tsx        Field definitions + Current → Proposed diff
│   └── ui.tsx                StatusPill, Avatar, Seal, Pagination, states
└── pages/
    ├── SignInPage.tsx
    ├── DirectoryPage.tsx
    ├── ProfilePage.tsx       Serves both /me and /alumni/:studentId
    ├── UpdateInfoPage.tsx    Alumni submission forms
    ├── MySubmissionsPage.tsx Tracking + resubmission
    └── VerificationPage.tsx  Admin review queue and panel
```

---

## Design

Follows `docs/ui_ux_recommendation.md`, with one reconciliation: the palette uses the values **measured from the seal** in `docs/brand_guidelines.md` — navy `#2E3192`, purple `#812990`, orange `#F7941D` — not the approximations the UI/UX doc used before the logo was analysed. The brand document supersedes those.

**Colour is load-bearing, once.** One hue per state, defined in `StatusPill` and used identically everywhere a state appears, so green means the same thing in the directory as in the review queue. The IUB orange is reserved for "pending" rather than introducing a sixth hue — darkened to `#B26A00` for AA contrast on its tint.

**Navy is for action, purple is for focus.** Keyboard focus rings are purple so they never read as a navy hover state — the two are always distinguishable.

**One typeface.** Inter, with weight doing the differentiating. Numeric columns use `tabular-nums` so CGPA, years, and counts align down a column — the thing that makes a dense table readable.

**Labelled tabs, not an icon rail.** Faculty use this a few times a term; unlabelled icons would cost them more than the horizontal space saves.

**States are designed, not left blank.** Skeleton rows match the real 48px row height so nothing shifts on load; empty states say what to do next; a missing optional value renders an em dash rather than nothing.

Responsive per the UI/UX doc: the filter rail collapses below 1080px, and the top bar sheds its secondary labels below 720px. `prefers-reduced-motion` is respected.

---

## How this handles the security rules

**The role decides what's *shown*, never what's *allowed*.** Tabs a role can't use aren't rendered, and `RequireAuth` redirects rather than showing a dead end — but the API re-checks the role on every request. Hiding a tab is a courtesy, not a lock.

**Contact visibility is explained, not silently blank.** The API sends `contact_details_visible`; when it's false the profile says *"Contact details are restricted to administrators"* rather than rendering empty fields that look like missing data. When the department settles the visibility policy, the backend flips one function and this page follows with no change.

**A 401 clears the session and returns to sign-in**, so an expired token can't leave a half-loaded page behind.

**The token lives in `sessionStorage`**, so a refresh doesn't sign the user out but closing the tab does. On load the client asks `/api/auth/me` who the token belongs to rather than trusting anything cached.

**No database access anywhere.** `lib/api.ts` is the single door to the backend.

---

## Verification

`npm run typecheck` and `npm run build` both pass clean under `strict` with `noUnusedLocals`.

`verify-api-contract.mjs` runs **31 checks** against a live backend, exercising the exact request shapes these pages build — this catches contract drift that a typecheck can't:

- Sign-in returns a token at `data.access_token`; a failed sign-in returns a displayable `error.message` that doesn't reveal which field was wrong.
- `/api/auth/me` restores a session; a bad token 401s so the client can clear it.
- The directory query the page constructs returns `meta` matching the pagination control (500 records / 25 per page / 20 pages), and every column the table renders is present on each row.
- **Contact fields are absent from directory rows** — checked on the wire, not assumed.
- Filter combinations, debounced name search, a no-match search (for the empty state), and sortable headers all produce valid queries.
- An alumnus gets 403 on the directory, confirming the hidden tab matches reality.
- `contact_details_visible` is false for faculty *and* the values really are null; true for admin with the email populated; true for an alumnus on their own record.
- `employment_history` is always an array, and profiles with none exist — so the empty branch is reachable.
- `internship_completed` arrives as a boolean, not `'Yes'`/`'No'`.
- Validation and auth errors both use the `{error: {code, message}}` envelope the client parses.

`verify-workflow-contract.mjs` runs **34 more**, walking a submission through its whole life the way the three workflow pages drive it:

- The profile provides prefill for contact, employment, and academic forms, with `internship_completed` arriving as a boolean for the Yes/No select.
- A contact change sends **one field, not the whole form**, and comes back `Pending` with `current_values` populated for the diff.
- An invalid CGPA and a blank employer each name the offending field, so the input can be highlighted with the message beneath it.
- An `employment_history` submission has `current_values: null`, confirming the single-column append view is the right one.
- The Pending tab returns rows plus meta; an empty tab returns `[]` for the empty state; faculty get 403, matching the hidden nav tab.
- An empty comment is refused on send-back; a real one is stored and reaches the alumnus.
- Editing a returned submission puts it back to `Pending` **and clears the old note**, so it doesn't look unresolved.
- Approving writes the value to the record; re-approving returns a displayable 409.
- A rejected submission carries its reason to the alumnus and can't be edited — matching the card that shows no button.

---

## The verification workflow

The screen with no precedent in the reference images, and the one the PRD treats as the core lifecycle demonstration.

**One comparison component, three places.** `Comparison.tsx` renders the Current → Proposed diff for an alumnus confirming what they're about to send, an alumnus reading what came back, and an admin deciding. Everyone acts on the identical view — that's the point, not a saving.

**Reviewing is a panel, not a navigation.** An admin working through a batch never loses their place in the queue. Escape closes it; the scrim is clickable.

**Actions sit below the comparison.** Nobody decides before scrolling past what they're deciding on. Colour carries intent ahead of the label: navy approve, orange send back, red reject — the same hues those states use everywhere else in the app.

**Rejecting requires a reason before the request is made.** The button doesn't fire on an empty note, because a rejection with nothing to act on is worse than none.

**Only what changed is sent.** The update form prefills from the record and diffs against it, so a submission carries one field rather than a whole form — which is what makes the admin's diff short enough to read.

**An append renders as one column.** `employment_history` replaces nothing, so a two-column diff would imply it overwrites something. It says "a new entry" instead.

**A returned submission leads with the admin's comment**, in an attention-tinted card, with the edit form right there. The alumnus never has to hunt for what to fix.

---

## Next slice

**Dashboards** — the KPI strip and Recharts visuals against `/api/dashboard/overview` and `/career`, plus the data-quality worklist. The aggregate shapes are already verified in `backend/tests/test_dashboard.py`.
