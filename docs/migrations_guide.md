# Database Migrations

**IUB International Business Alumni Information Management System**
**Applies to:** a database created from `database/schema.sql`
**Tested against:** PostgreSQL 16 (target environment is 18; no syntax used here differs between the two)

Closes the four open items from `docs/data_cleaning_changelog.md` and adds the supporting tables the API spec and security document require but `schema.sql` never defined.

---

## How to run

```bash
# 1. Constraint corrections to the four core tables
psql -U postgres -d iub_alumni -f database/migrations/001_core_constraints.sql

# 2. users / roles / alumni_submissions / audit_logs
psql -U postgres -d iub_alumni -f database/migrations/002_supporting_tables.sql

# 3. Least-privilege application role  — EDIT THE PASSWORD FIRST
psql -U postgres -d iub_alumni -f database/migrations/003_app_role.sql

# 4. Load the data as the app role, not as postgres
python database/load_data.py
```

All three are **idempotent** — re-running them produces no errors and no duplicate objects. Verified by running each twice on the same database.

---

## 001 — Core constraint corrections

| # | Change | Why |
|---|---|---|
| 1 | `personal_email` accepts any valid address; new `institutional_email` column carries the `@iub.edu.bd` rule | ⚠️ **Needs a departmental decision** — see below |
| 2 | `CHECK (minor IS NULL OR minor <> major)` | Prevents the double-counting that inflated the IB Minors KPI |
| 3 | `UNIQUE(student_id)` on `academic_records` and `employment` | A second row would silently double every dashboard aggregate that joins them |
| 4 | `CHECK` on `degree`; plausible-range check on both year columns | `degree` was an open VARCHAR — a typo like `BBa` would appear as a phantom category in Degree Distribution |
| 5 | `CHECK` tying `employment_status` to the employer fields | True in all 500 rows but never enforced; stops an `Employed` row with no company, and a `Seeking Employment` row that still carries employer data |
| 6 | `CHECK` on internship fields | `internship_completed = 'No'` can no longer carry internship details |
| 7 | `ON UPDATE CASCADE ON DELETE CASCADE` on the three FKs | Deleting an alumnus previously failed on its child rows |
| 8 | `record_status` column (`active` / `deactivated` / `merged`) | `DELETE /api/alumni/{id}` specifies a soft delete; nothing supported it |
| 9 | Indexes on the directory search/filter and dashboard group-by columns | At 500 rows a sequential scan is fine; these keep the queries flat as the table grows toward real enrolment numbers |

**Case-insensitive email uniqueness** was added as a functional unique index on `LOWER(personal_email)`. Without it, `alumni083@iub.edu.bd` and `Alumni083@iub.edu.bd` are two different alumni — which is exactly the inconsistency that appeared in the source spreadsheet.

**The BBA internship rule is deliberately not a CHECK.** It spans `alumni` and `academic_records`, and PostgreSQL cannot express a cross-table check without a trigger. It is enforced in `load_data.py` and must be enforced in the API layer.

### ⚠️ The one item still needing your decision

Section 1 changes what `personal_email` is allowed to contain. As `schema.sql` stands, `chk_email` pins it to `@iub.edu.bd` — so an alumnus can never save a real post-graduation address, which is the entire point of the self-service update flow. The migration relaxes `personal_email` to a generic email pattern and moves the institutional-domain rule to a new `institutional_email` column.

If the department wants `personal_email` to stay institution-only, **skip section 1 of 001** and the other eight changes still apply cleanly.

---

## 002 — Supporting tables

Adds the four tables named in PRD §19:

**`roles`** — a lookup table rather than a bare `CHECK`, so adding a fourth role later (say, a department head with partial write access) is a data change instead of a migration. Seeded with `alumni`, `faculty`, `admin`.

**`users`** — login, role, password hash, status. The notable constraint:

```sql
CHECK ((role_code =  'alumni' AND student_id IS NOT NULL) OR
       (role_code <> 'alumni' AND student_id IS NULL))
```

This makes "alumni can only see their own record" enforceable at the database level rather than resting on API logic alone: an alumni account *must* be bound to exactly one alumni record, and a faculty or admin account *cannot* be bound to one. A partial unique index on `student_id` enforces one account per alumnus, which is what profile claiming (PRD §7.1) requires.

**`alumni_submissions`** — the verification gate. `current_values` and `proposed_values` are `JSONB`, so one table serves all seven submission types without a column per field, and the admin review panel can render a generic Current → Proposed diff. Four state constraints encode the workflow:

- A `Pending` submission has no reviewer; a resolved one must have both reviewer and timestamp.
- `Rejected` and `Correction Required` require a `review_note` — the API spec makes the reason mandatory on those endpoints, so the database backs it up.
- `applied_at IS NOT NULL` if and only if status is `Approved`. This is the schema-level expression of the rule that **only an approval writes to the official tables.**

**`audit_logs`** — append-only, enforced two ways. A row-level `BEFORE UPDATE OR DELETE` trigger raises an exception, and a separate statement-level `BEFORE TRUNCATE` trigger covers the gap that row triggers don't fire on `TRUNCATE` (a single `TRUNCATE audit_logs` would otherwise have erased the whole trail). `actor_email` and `actor_role` are stored denormalised so an entry stays readable after the account is deactivated.

---

## 003 — Least-privilege application role

Creates `iub_app` and grants only what FastAPI needs. Resulting privileges, verified after running:

| Table | Granted |
|---|---|
| `alumni`, `academic_records`, `employment`, `employment_history`, `users`, `alumni_submissions` | SELECT, INSERT, UPDATE, DELETE |
| `audit_logs` | **SELECT, INSERT only** |
| `roles` | **SELECT only** |

No `CREATE` on the schema, so the running application cannot add or drop tables — migrations are run deliberately, as a superuser. The audit-log restriction is belt and braces alongside the trigger: a privilege never granted cannot be exercised by an application bug either.

**Change the password in the file before running it**, and put the real value in `.env` only.

---

## What was actually tested

All of this was run against a live PostgreSQL instance, not just reviewed:

- All three migrations applied to a fresh database built from `schema.sql`, then re-applied — clean both times.
- **18 constraint-behaviour tests**, each confirming the constraint rejects the bad row and accepts the good one: gmail address now accepted; `minor == major` rejected; `BBa` degree rejected; case-variant email rejected as a duplicate; non-IUB `institutional_email` rejected; second `academic_records` row rejected; `Employed` with no company rejected; `Further Studies` carrying employer data rejected; `internship_completed='No'` with details rejected; faculty account with a `student_id` rejected; alumni account without one rejected; second account per alumnus rejected; `Pending` with a reviewer rejected; `Rejected` without a reason rejected; `Approved` without `applied_at` rejected; audit `UPDATE`, `DELETE`, and `TRUNCATE` all blocked.
- **The full 500-record dataset loaded** through `load_data.py` as `iub_app` (not as superuser) with every new constraint active: 500 / 500 / 500 / 195 rows, 0 orphans. Re-running the loader produced no duplicates.
- **Dashboard aggregates ran against the loaded data**, confirming both KPI sets return sensible values:

| Dashboard 1 | | Dashboard 2 | |
|---|---|---|---|
| Total alumni | 500 | Employed | 399 |
| IB majors | 267 | Further Studies | 46 |
| IB minors | 106 | Seeking Employment | 40 |
| Average CGPA | 3.35 | Self-Employed | 15 |
| Internship completion | 92.4% | | |

- Query plans confirmed the new indexes are used (`Index Scan using idx_alumni_graduation_year` rather than a sequential scan).

One behaviour worth knowing: a user who has reviewed a submission **cannot be deleted** — `fk_submissions_reviewer` is `ON DELETE RESTRICT`, so the review history can't be orphaned. Deactivate the account (`status = 'deactivated'`) instead. This is intentional; the admin UI should offer deactivation, not deletion, for accounts.

---

## Next

`schema.sql` plus these three migrations complete Phase 1 (Database) and the schema half of Phase 5 (Security & Governance). Phase 2 — the FastAPI backend — is now unblocked, with the caveat that the `personal_email` decision above should be settled first, since it determines what the alumni update endpoint is allowed to accept.
