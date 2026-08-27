# Deployment

**IUB International Business Alumni Information Management System**

Covers a first deployment on the departmental Windows machine described in `docs/environment.md`, and the hardening steps that separate "runs on my laptop" from "holds real alumni data."

---

## 1. Before real data goes in

Two things must be settled first. Neither is a code problem.

**The `personal_email` constraint.** `schema.sql` pins `personal_email` to `@iub.edu.bd`. Migration 001 §1 relaxes it and moves the institutional rule to a new `institutional_email` column. Until this is decided, **no alumnus can save a post-graduation address**, which is the point of the self-service flow. Apply §1, or skip it deliberately and accept that limitation.

**Contact visibility.** `docs/security.md` §4 requires the most restrictive reading until the department approves a policy, so `can_see_contact_details` in `backend/app/core/security.py` currently hides `personal_email` and `phone` from faculty. If the department decides faculty should see them, that is a one-line change in that one function — the frontend already adapts via the `contact_details_visible` flag.

---

## 2. Install

```bash
# Backend
pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..
```

## 3. Database

```bash
# As a superuser, create the database and apply the schema
psql -U postgres -c "CREATE DATABASE iub_alumni;"
psql -U postgres -d iub_alumni -f database/schema.sql
psql -U postgres -d iub_alumni -f database/migrations/001_core_constraints.sql
psql -U postgres -d iub_alumni -f database/migrations/002_supporting_tables.sql

# Edit the password in 003 first, then:
psql -U postgres -d iub_alumni -f database/migrations/003_app_role.sql
```

Migration 003 creates `iub_app`, the least-privilege role the application connects as. **Never point the application at the `postgres` superuser** (`docs/security.md` §3).

## 4. Configure

Create `backend/.env` from `.env.example`:

```ini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iub_alumni
DB_USER=iub_app                 # not postgres
DB_PASSWORD=<what you set in migration 003>

JWT_SECRET=<see below>
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Serving the built frontend from FastAPI — see §6
SERVE_FRONTEND_DIR=../frontend/dist
HTTPS_ENABLED=false             # true only once TLS actually works
BEHIND_PROXY=false              # true only behind a real reverse proxy

BACKUP_DIR=D:/alumni-backups    # separate storage from the database
BACKUP_KEEP=14
```

Generate the signing key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

`.env` is already in `.gitignore`. It must never be committed (`docs/security.md` §8).

## 5. Load data and create accounts

```bash
python database/load_data.py     # 500 records, re-validated before writing
python database/seed_users.py    # one admin, one faculty, three alumni
```

Set `SEED_ADMIN_PASSWORD` and the others in `.env` first — the script warns loudly if you leave the development default.

For real use, create the first admin with a real password, sign in, and add the rest through **Accounts**. Alumni don't get seeded accounts: they register to claim their own record, and an admin approves them.

## 6. Run

**One origin (recommended).** With `SERVE_FRONTEND_DIR` set, FastAPI serves the built React app and the API together:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Everything is at `http://<host>:8000`. There is no cross-origin request to permit, so **CORS is switched off entirely** — a smaller surface than allowing an origin you no longer need. Client-side routes like `/directory` resolve on refresh; unknown `/api/...` paths still return JSON rather than HTML.

**Two origins (development).** Leave `SERVE_FRONTEND_DIR` unset and run `npm run dev` alongside. CORS turns itself back on, scoped to `FRONTEND_ORIGIN`.

To run as a Windows service, wrap the uvicorn command with NSSM or Task Scheduler set to run at startup.

---

## 7. What hardening is already on

Active as soon as the app starts — no configuration needed:

| Protection | Behaviour |
|---|---|
| Security headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and a strict CSP with `frame-ancestors 'none'` |
| No caching of records | `Cache-Control: no-store`, so alumni data doesn't sit in a shared proxy cache |
| Failed-login throttle | 10 failures per Student-ID-and-address in 5 minutes, then 429 with `Retry-After`. **Only failures count**, so normal use never trips it, and it's scoped per address so nobody can lock an alumnus out of their own account |
| Generic database errors | Constraint text, table names, and stack traces never reach the client |
| Startup database check | The app refuses to start if PostgreSQL is unreachable, rather than failing on the first request |
| Health endpoint | `/api/health` does a real query and returns 503 if the database is down |

Set `HTTPS_ENABLED=true` **only after TLS works** — HSTS tells browsers to refuse the plain-HTTP site for a year, so enabling it early locks people out.

The throttle keeps its counters in process memory. That's correct for one worker; with several, each keeps its own count and the effective limit multiplies. Move it to Redis or a table before scaling out.

---

## 8. TLS

The system handles personal data and sends passwords and bearer tokens on every request. On a network anyone else can see, **it needs HTTPS.** Put IIS, nginx, or Caddy in front, terminate TLS there, proxy to `127.0.0.1:8000`, then set `HTTPS_ENABLED=true` and `BEHIND_PROXY=true`.

`BEHIND_PROXY` only when a proxy really sets `X-Forwarded-For`. Turned on without one, a client can spoof the header and slip the throttle by rotating fake addresses.

---

## 9. Backups

```bash
python database/backup.py              # write one
python database/backup.py --list       # what's kept
python database/backup.py --verify <file>
```

Point `BACKUP_DIR` at **different storage from the database machine**. A backup on the same disk is not a backup — it dies in the same disk failure (`docs/security.md` §7). The script warns if the path is inside the project folder.

Each run writes a compressed `pg_dump` and immediately reads it back, so a truncated or corrupt file is caught at backup time rather than during an incident. Old backups beyond `BACKUP_KEEP` are pruned.

Schedule it daily with Task Scheduler:

```
Program:   python
Arguments: database\backup.py
Start in:  C:\path\to\project
```

**Test a restore before you need one.** Restore into a *new* database and check it:

```bash
createdb -U postgres iub_alumni_restored
pg_restore -U postgres -d iub_alumni_restored --no-owner <file>
psql -U postgres -d iub_alumni_restored -c "SELECT COUNT(*) FROM alumni;"
```

---

## 10. Go-live checks

```bash
# The API is up and the database is reachable
curl http://localhost:8000/api/health
# → {"status":"ok","database":"ok"}

# Security headers present
curl -i http://localhost:8000/api/health | findstr /i "content-security-policy x-frame-options"

# A client route resolves on refresh (single-origin mode)
curl -o nul -w "%{http_code}" http://localhost:8000/directory
# → 200

# The app role is least-privilege: audit_logs should show INSERT, SELECT only
psql -U postgres -d iub_alumni -c "SELECT table_name, string_agg(privilege_type, ', ') FROM information_schema.table_privileges WHERE grantee='iub_app' GROUP BY 1 ORDER BY 1;"

# Data loaded cleanly
python database/load_data.py --dry-run
```

Then, by hand:

- [ ] Sign in as admin, faculty, and an alumnus; confirm each sees only their own tabs.
- [ ] Open an alumnus's profile as faculty — contact details should be hidden.
- [ ] Submit a change as an alumnus, approve it as admin, confirm the record updates.
- [ ] Check the audit log shows that approval with the before and after values.
- [ ] Run one backup and restore it into a scratch database.
- [ ] Confirm `.env` is not in `git status`.

---

## 11. Regular operation

**Daily:** the scheduled backup runs.
**Weekly:** an admin clears the **Verification** queue, and checks **Data quality** for anything flagged.
**Each term:** review **Accounts** for staff who have left; deactivate rather than delete, so their review history stays intact.

Deactivating is always the right move over deleting. An admin who has reviewed a submission cannot be deleted at all — the reviewer foreign key is `RESTRICT`, deliberately, so review history can never be orphaned.

---

## 12. Tests

Worth running after any change:

```bash
cd backend
python tests/test_api.py          # 44 — auth, RBAC, directory, profiles
python tests/test_workflow.py     # 69 — submissions, admin writes, audit
python tests/test_dashboard.py    # 75 — analytics, users, registration

cd ../frontend
npm run typecheck
node verify-api-contract.mjs        # 31 — the shapes the pages consume
node verify-workflow-contract.mjs   # 34
node verify-dashboard-contract.mjs  # 77
```

`test_workflow.py` and `test_dashboard.py` mutate data — they approve real changes and create accounts. Run them against a development database, not production.
