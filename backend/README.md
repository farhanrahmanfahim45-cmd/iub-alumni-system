# Backend — Phase 2 (partial)

FastAPI backend for the IUB Alumni Information Management System.

**Status:** the API is feature-complete against `docs/api_spec.md` — 29 endpoints covering authentication, the directory, profiles, the verification workflow, admin writes, auditing, both analytics dashboards, the data-quality panel, and user management. The React frontend is the remaining phase.

---

## Structure

```
backend/
├── app/
│   ├── main.py              FastAPI app, CORS, error handlers
│   ├── models.py            Pydantic request/response models
│   ├── core/
│   │   ├── config.py        Settings from .env — no hardcoded secrets
│   │   ├── db.py            psycopg connection pool + query helpers
│   │   ├── security.py      Password hashing, JWT, role dependencies
│   │   ├── submissions.py   Field whitelist, validation, apply-on-approve
│   │   └── audit.py         Audit writes, inside the caller's transaction
│   └── routers/
│       ├── auth.py          Login, logout, register, /me
│       ├── alumni.py        Directory + profile read endpoints
│       ├── submissions.py   Submit, review, approve/reject/correct
│       ├── admin.py         Direct edits, deactivation, audit trail
│       ├── dashboard.py     Both dashboards + data quality
│       └── users.py         Staff account management
├── tests/
│   ├── test_api.py          44 checks — auth, RBAC, directory, profiles
│   ├── test_workflow.py     69 checks — verification workflow, audit
│   └── test_dashboard.py    75 checks — analytics, users, registration
└── requirements.txt
```

---

## Setup

```bash
pip install -r backend/requirements.txt
```

Create `backend/.env` from `.env.example`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iub_alumni
DB_USER=iub_app          # the least-privilege role from migration 003
DB_PASSWORD=...
JWT_SECRET=...           # generate: python -c "import secrets; print(secrets.token_urlsafe(48))"
FRONTEND_ORIGIN=http://localhost:5173
```

`.env` is already covered by `.gitignore`. Never commit it, and don't use the `postgres` superuser here (`docs/security.md` §3).

Then load data and create accounts:

```bash
python database/load_data.py          # 500 alumni records
python database/seed_users.py         # 1 admin, 1 faculty, 3 alumni accounts
```

## Run

```bash
cd backend
uvicorn app.main:app --reload
```

Interactive docs: `http://localhost:8000/docs`

## Test

```bash
cd backend
python tests/test_api.py        # 44 checks — auth, RBAC, directory, profiles
python tests/test_workflow.py   # 69 checks — submissions, admin writes, audit
python tests/test_dashboard.py  # 75 checks — dashboards, users, registration
```

`test_workflow.py` mutates data (it approves real changes). Re-seed or reload
between full runs if you need pristine values.

---

## Endpoints

### Auth
| Method | Path | Roles |
|---|---|---|
| POST | `/api/auth/login` | public |
| POST | `/api/auth/register` | public (alumni profile claiming) |
| POST | `/api/auth/logout` | any signed-in |
| GET | `/api/auth/me` | any signed-in |

### Alumni (read)
| Method | Path | Roles |
|---|---|---|
| GET | `/api/alumni` | faculty, admin |
| GET | `/api/alumni/{student_id}` | admin, faculty (any) · alumni (own only) |
| GET | `/api/alumni/{student_id}/academic` | same |
| GET | `/api/alumni/{student_id}/employment` | same |
| GET | `/api/alumni/{student_id}/employment-history` | same |

### Submissions
| Method | Path | Roles |
|---|---|---|
| POST | `/api/submissions` | alumni (own only) |
| GET | `/api/submissions` | admin (all) · alumni (own only) |
| GET | `/api/submissions/{id}` | admin · alumni (own only) |
| PUT | `/api/submissions/{id}` | alumni (own, Correction Required only) |
| PUT | `/api/submissions/{id}/approve` | admin |
| PUT | `/api/submissions/{id}/reject` | admin |
| PUT | `/api/submissions/{id}/request-correction` | admin |

### Admin
| Method | Path | Roles |
|---|---|---|
| PUT | `/api/alumni/{student_id}` | admin |
| PUT | `/api/alumni/{student_id}/academic` | admin |
| PUT | `/api/alumni/{student_id}/employment` | admin |
| DELETE | `/api/alumni/{student_id}` | admin (soft delete) |
| PUT | `/api/alumni/{student_id}/reactivate` | admin |
| GET | `/api/audit-logs` | admin |
| GET | `/api/users` | admin |
| POST | `/api/users` | admin |
| PUT | `/api/users/{user_id}` | admin |

### Dashboards
| Method | Path | Roles |
|---|---|---|
| GET | `/api/dashboard/overview` | faculty, admin |
| GET | `/api/dashboard/career` | faculty, admin |
| GET | `/api/dashboard/data-quality` | admin |

Dashboard filters: `graduation_year`, `degree`, `major`, `minor` on both; plus `employment_status`, `industry`, `country`, `top_n` on `/career`.

Directory query parameters: `name`, `student_id`, `alumni_id`, `email`, `company`, `degree`, `major`, `minor`, `graduation_year`, `employment_status`, `industry`, `country`, `include_inactive`, `page`, `page_size`, `sort_by`, `sort_order`.

Submission types: `personal`, `contact`, `academic`, `internship`, `research_interest`, `employment`, `employment_history`.

---

## Security decisions worth knowing

**Roles are re-read from the database on every request**, not trusted from the token. A token issued before an account was deactivated stops working immediately, rather than remaining valid until it expires.

**Alumni ownership is checked against the token**, never against a value in the request. `assert_can_read_alumni` compares the path's `student_id` to the token's — a request for someone else's record is a 403 regardless of what the client sends.

**Contact details default to admin-only.** `docs/security.md` §4 requires the most restrictive reading until the department approves a visibility policy, so faculty don't see `personal_email` or `phone`. That decision lives in exactly one function — `can_see_contact_details` in `core/security.py` — so changing it is a one-line edit. Responses carry a `contact_details_visible` flag so the frontend can hide the section rather than render empty fields.

**Restricted fields never appear in list responses**, for any role. The `DirectoryRow` model has no `personal_email` or `phone` field at all, so they cannot leak through the directory even by mistake. `email` remains searchable by staff — the filter works without the value being returned.

**Login is uniform on failure.** Unknown account and wrong password return the same code, and a dummy hash is verified when no user is found so both paths take similar time.

**Database errors are caught and replaced** with a generic message. Raw SQL, table names, and stack traces never reach the client.

`internship_completed` is stored as `'Yes'`/`'No'` text (schema constraint) but exposed as a JSON boolean, so the frontend doesn't have to know about the storage format.

---

## The verification workflow

**Submission fields are a whitelist, not a filter.** `core/submissions.py` maps each submission type to a fixed set of columns on one table. A field outside that set is a 400 — so a crafted body cannot reach `student_id`, `alumni_id`, or `record_status` through a "contact" submission. This is tested directly.

**Approval is one transaction.** The official-table write, the status change, and the audit entry share a single cursor block. If a database constraint rejects the value, all three roll back together: the submission stays `Pending` rather than flipping to `Approved` with nothing applied. Also tested.

**The "before" state is re-read at approval time**, not taken from the snapshot stored when the alumnus submitted. Between submission and review the record may have moved on, and the audit entry should record what was actually replaced.

**Validation runs identically on admin direct edits.** `PUT /api/alumni/{id}/academic` goes through the same `validate_changes` as a submission, so an admin can't write a CGPA of 9.9 either. Admins bypass the *review gate*, not the *rules*.

**Deletion is soft.** `DELETE /api/alumni/{id}` sets `record_status = 'deactivated'`; the row survives, drops out of the directory, and is reachable with `include_inactive=true`. A hard delete would cascade to academic, employment, and submission history, and a duplicate that was merged still needs to be explainable later. A `reactivate` endpoint reverses it.

**`employment_history` appends.** Every other submission type updates one row; a history submission inserts a new one, since an alumnus accumulates roles rather than replacing them.

---

## Dashboards

**Aggregation happens in PostgreSQL.** Endpoints return computed numbers, never rows for the frontend to count. A dashboard response is a KPI block plus a `charts` map, each entry already shaped for Recharts.

**Deactivated records are excluded everywhere.** A soft-deleted duplicate shouldn't inflate a headline figure, so every dashboard query filters on `record_status = 'active'`.

**Figures are live, not snapshots.** The tests deactivate a record, confirm the KPI drops by one, reactivate it, and confirm it returns — which is what PRD §37 asks for.

**Filters reach the charts, not just the KPIs.** Filtering by `degree=BBA` narrows every chart on the page, so the numbers stay internally consistent with each other.

**Empty results return zeroes, not errors.** A filter matching nothing gives `total_alumni: 0` and a null `average_cgpa` rather than a divide-by-zero.

The `academic_records` join can't multiply rows, because migration 001 added `UNIQUE(student_id)` — without it a duplicate academic row would silently double every count on Dashboard 1.

## User management and registration

**Registration doesn't grant access.** An alumnus claiming a record creates a `pending_verification` account that cannot sign in until an admin activates it. Registering is a request, not a key.

**Registration reveals nothing.** A valid Student ID, an unknown one, and an already-claimed one all return the same 201 and the same message. Otherwise the endpoint becomes a way to enumerate which IDs are on file — and the format is guessable.

**The last admin can't be removed.** An admin cannot deactivate or demote themselves, and the API refuses to deactivate the only remaining active admin. Both are how a system ends up locked out of its own administration.

**Alumni accounts can't be created or promoted through `/api/users`.** The database requires an alumni account to be bound to an alumni record, so the staff endpoint only handles `faculty` and `admin`.

**Password hashes never leave the login check** — the user list query doesn't select the column at all.

---

## Test coverage

188 checks across three suites, all passing against the loaded 500-record database. The security boundaries are tested as hard as the happy paths.

**`test_api.py` — 44 checks**
- Alumni sign in by Student ID, staff by email; wrong password and unknown account return the same error code.
- Every protected endpoint returns 401 without a token, and with a garbage token.
- Alumni get 403 on the directory; faculty get 200.
- An alumnus requesting another's profile, academic record, or employment gets 403 each time.
- Faculty see no `personal_email`/`phone`; admin does; directory rows carry neither for anyone.
- Filters against real counts: `degree=BBA` → 378, `major=IB` → 267, `minor=IB` → 106, `Employed` → 399, `company=Daraz` → 16.
- Pagination, the 100-row cap, 404 on unknown IDs, `[]` (not 404) for an alumnus with no history.

**`test_workflow.py` — 69 checks**
- Only alumni submit; admin and faculty are refused at `POST /api/submissions`.
- **A pending submission does not touch the record** — verified by reading the table directly, not by trusting the API response.
- Whitelist violations rejected: `student_id` smuggled into a contact submission, `cgpa` in a contact submission, CGPA > 4.00, malformed email, `Employed` with no company, invalid employment status, unknown submission type.
- Alumni see only their own submissions; faculty see none; an alumnus can't open another's.
- Approve writes through; approving twice → 409. Faculty can't approve; an alumnus can't approve their own.
- Reject leaves the record unchanged; rejecting without a reason → 400.
- Full correction round trip, and a rejected submission can't be reopened.
- Admin direct edits apply immediately, are validated, and can't rewrite `alumni_id`.
- Soft delete removes the record from the directory (499 of 500), keeps the row, and reverses.
- Every action type is audited with the acting admin; direct `UPDATE`/`DELETE` on `audit_logs` are blocked.
- **Atomicity:** an over-length value is refused at approval, the record is unchanged, and the submission is still `Pending`.

**`test_dashboard.py` — 75 checks**
- Every KPI is compared against an independently written SQL query, so a wrong `GROUP BY` or a row-multiplying join is caught rather than returning a plausible number.
- Charts are checked for internal consistency: `degree_distribution` and `major_distribution` each sum to `total_alumni`, `minor_distribution` correctly sums to less (no-minor isn't a minor) and carries no null category, and the IB slice of `major_distribution` equals the IB Majors KPI.
- Filters narrow the KPIs *and* the charts; two filters combine; a filter matching nothing returns zeroes with a null average.
- Career KPIs match SQL for all four statuses and sum to the total; `career_snapshot` percentages sum to 100; `top_employers` is sorted and respects `top_n`.
- Deactivate → KPI drops → reactivate → KPI returns, proving the dashboards read live.
- Data quality confirms the cleaned dataset holds: 0 BBA without an internship, 0 alumni missing employment.
- Alumni and faculty are refused user management; password hashes are never returned; duplicate emails, short passwords, and alumni-role creation are all rejected.
- Self-deactivation and promoting an alumni account are both refused.
- Registration creates a `pending_verification` account that can't sign in; a valid, unknown, and already-claimed Student ID are indistinguishable in the response; no account is created for an unknown ID.

---

## Next

The API is complete against the spec. What remains is the **React + TypeScript frontend** — the alumni portal, directory, profile, Verification Center, and the two dashboards, following `docs/ui_ux_recommendation.md`.

One decision is still open and shapes the UI: `can_see_contact_details` in `core/security.py` currently hides `personal_email` and `phone` from faculty, per the most-restrictive reading in `docs/security.md` §4. When the department rules on the visibility policy, that is a one-line change.
