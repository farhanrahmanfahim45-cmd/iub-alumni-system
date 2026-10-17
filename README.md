# IUB Alumni Information Management System

A departmental information system for the Department of International Business, Independent University, Bangladesh. Centralises alumni academic, contact, and career records; lets alumni maintain their own information through a verification workflow; and gives faculty live academic and career analytics.

Built as a prototype on ~500 synthetic records, structured to become the department's long-term system.

---

## What it does

The full information lifecycle, not just a website:

```
Collect → Validate → Verify → Store → Manage → Analyze → Update → Audit
```

**Alumni** see their own profile, submit updates, and track what happened to them.
**Faculty** search the directory, read profiles, and use both dashboards. Read-only, everywhere.
**Administrators** verify submissions, correct records, manage accounts, and read the audit trail.

The rule the whole system rests on: **alumni-submitted changes are proposals, not writes.** Nothing reaches the official tables until an admin approves it, and that approval and its audit entry commit in one transaction.

---

## Stack

React + TypeScript · FastAPI + Python · PostgreSQL 18 · Recharts

The frontend never touches PostgreSQL. Every read and write goes through the API.

---

## Layout

```
backend/                FastAPI application (29 endpoints)
  app/core/             config, db pool, security, submissions, audit, hardening
  app/routers/          auth, alumni, submissions, admin, dashboard, users
  tests/                188 end-to-end checks
frontend/               React + TypeScript (9 screens)
  src/pages/            sign-in, directory, profile, update, submissions,
                        verification, 2 dashboards, data quality, accounts
  verify-*.mjs          142 API contract checks
database/
  schema.sql            the four core tables
  migrations/           constraint fixes, supporting tables, app role
  clean_dataset.py      the cleaning that produced the final dataset
  load_data.py          idempotent loader with pre-write validation
  seed_users.py         demo accounts
  backup.py             pg_dump with verification and retention
data/
  validated_data_final.xlsx
docs/                   PRD, API spec, security, data workflow, database
                        dictionary, UI/UX, brand, deployment, changelogs
```

## Getting started

Full instructions in **`docs/deployment.md`**. The short version:

```bash
pip install -r backend/requirements.txt
cd frontend && npm install && npm run build && cd ..

psql -U postgres -c "CREATE DATABASE iub_alumni;"
psql -U postgres -d iub_alumni -f database/schema.sql
psql -U postgres -d iub_alumni -f database/migrations/001_core_constraints.sql
psql -U postgres -d iub_alumni -f database/migrations/002_supporting_tables.sql
psql -U postgres -d iub_alumni -f database/migrations/003_app_role.sql   # edit the password first

# create backend/.env from .env.example, then:
python database/load_data.py
python database/seed_users.py

cd backend && uvicorn app.main:app --port 8000
```

---

## Testing

330 automated checks, all passing against a live PostgreSQL instance and the loaded 500-record dataset.

| Suite | Checks | Covers |
|---|---|---|
| `backend/tests/test_api.py` | 44 | Authentication, RBAC, directory, profiles |
| `backend/tests/test_workflow.py` | 69 | Submissions, admin writes, auditing, atomicity |
| `backend/tests/test_dashboard.py` | 75 | Analytics against independent SQL, users, registration |
| `frontend/verify-api-contract.mjs` | 31 | The shapes the sign-in, directory and profile pages consume |
| `frontend/verify-workflow-contract.mjs` | 34 | The submission lifecycle as the three workflow pages drive it |
| `frontend/verify-dashboard-contract.mjs` | 77 | Every chart key and KPI field the analytics pages read |

The security boundaries are tested as hard as the happy paths: an alumnus reading another's record, faculty attempting a write, a pending submission checked against the database directly to confirm it hasn't landed, an over-length value rolled back cleanly at approval.

---

## Documentation

| Document | What it settles |
|---|---|
| `docs/api_spec.md` | Endpoints, request and response shapes, role matrix |
| `docs/security.md` | Authentication, roles, data protection — treated as hard requirements |
| `docs/data_workflow.md` | Where data comes from and what may write to official tables |
| `docs/database_dictionary.md` | Every field, its expected values, and the relationships |
| `docs/migrations_guide.md` | What each migration changes and why |
| `docs/data_load_issues.md` | Problems found in the source dataset |
| `docs/data_cleaning_changelog.md` | Every change made to that data, and how to reverse it |
| `docs/ui_ux_recommendation.md` | Layout, components, interaction patterns |
| `docs/brand_guidelines.md` | Colours measured from the seal, and what IUB still needs to supply |
| `docs/deployment.md` | Install, hardening, TLS, backups, go-live checks |

---

## Two open decisions

Both need the department, not more code.

**1. The `personal_email` constraint.** `schema.sql` pins it to `@iub.edu.bd`, so an alumnus can never save a post-graduation address — which is the entire point of the self-service flow. Migration 001 §1 relaxes it and moves the institutional rule to its own column. Apply it, or accept the limitation deliberately.

**2. Contact visibility.** Personal email and phone are currently admin-only, the most restrictive reading of `docs/security.md` §4, because the department hasn't set a policy. If faculty should see them, it's one line in `can_see_contact_details` — the frontend already adapts.

`docs/brand_guidelines.md` also lists what IUB's communications office still needs to provide: official typefaces, a vector seal, and logo usage rules. The interface uses reasonable placeholders and marks them as such.

---

## Notes on the dataset

The prototype data is synthetic and disposable. It arrived labelled `VALID` on every row, but checking it against the schema found 13 records that would have failed the foreign keys outright and five that would have been rejected by a CHECK constraint. `docs/data_load_issues.md` records what was wrong; `docs/data_cleaning_changelog.md` records every fix and how to reverse it.

One correction is worth knowing about: clearing 56 rows where `minor` duplicated `major` moved the IB Minors figure from 147 to **106**. Those records were counting the same alumnus twice. 106 is correct, but it is a visible change to a headline number, and it's a one-line revert if the department reads those rows differently.
