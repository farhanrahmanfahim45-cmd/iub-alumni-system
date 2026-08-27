# Data Workflow

**IUB International Business Alumni Information Management System**

This document describes how data is intended to move through the system. It exists so the database is treated as **a governed record store with a lifecycle**, not a plain CRUD table — every write has a defined origin, a validation step, and (for alumni-submitted data) a verification gate before it becomes official.

Core lifecycle (PRD Section 37):

```
Collect → Validate → Verify → Store → Manage → Analyze → Update → Audit
```

---

## 1. Initial Dataset Creation (Prototype — as actually done)

**Correction to the original PRD diagram:** the prototype's ~500-record dummy dataset was **not** produced by a Python ETL script. It was generated and validated with AI assistance (ChatGPT and Claude), not a coded pipeline. Treat the diagram below as the accurate record of what happened for this prototype; Section 2 below describes the separate, Python-based path intended for future real migrations.

```
Requirements (PRD Section 31: realistic variation,
BBA-heavy distribution, no real personal data)
        ↓
AI-assisted generation (ChatGPT / Claude)
        ↓
Manual/AI-assisted review for realism & rule
compliance (e.g., BBA ⇒ internship completed)
        ↓
Load into PostgreSQL
```

Implications for the system:

- Because there was no coded ETL step, **schema and constraint validation must happen at load time and again at the database layer** (PostgreSQL primary/foreign keys, unique constraints, check constraints per `docs/security.md` Section 5) — the data was not guaranteed to pass through a repeatable, version-controlled validation script before arriving in PostgreSQL.
- This dataset is synthetic and disposable. If it needs to be regenerated or extended, repeat the same AI-assisted approach, but validate the output against the schema constraints in `docs/api_spec.md` (CGPA range, year logic, employment-status/employer-field consistency, the BBA-internship rule) before loading it, since no script did that validation automatically.
- Do not assume the current dataset is free of duplicates or inconsistencies just because it was AI-generated — run it through the same Data Quality checks (`GET /api/dashboard/data-quality`) as any other data source.

---

## 2. Future Bulk Migration (Production — Python ETL, when real data is involved)

This is the path the PRD originally specified, and it remains the intended approach **once the system handles real alumni records** (e.g., importing an official registrar export), rather than for the synthetic prototype dataset above:

```
Excel (registrar / departmental export)
        ↓
Python ETL
        ↓
Validation (schema, duplicates, required fields,
business rules — e.g., BBA internship rule)
        ↓
PostgreSQL
```

Notes:
- The ETL script is expected to be **idempotent and re-runnable** — running it twice on the same source file should not create duplicate alumni records (match on Student ID).
- Validation failures should produce a rejection report (which rows failed, and why) rather than silently skipping or partially loading bad rows.
- This path is for **bulk/administrative** loads only — it is separate from, and does not replace, the individual alumni-submission workflow in Section 3.

---

## 3. Alumni Update (Submission → Verification Workflow)

This is the primary, everyday data-entry path once the system is live, and the one place the PRD is most explicit about: **alumni-submitted data must never overwrite official data directly.**

```
Alumni Portal
        ↓
FastAPI  (POST /api/submissions)
        ↓
Validation  (frontend: format checks — not a security boundary
             backend: business rules, allowed values, relationship checks)
        ↓
Pending Submission  (stored separately, official record untouched)
        ↓
Admin Review  (Verification Center — current vs. proposed values shown side by side)
        ↓
   ┌───────────┼─────────────────┐
   ↓           ↓                 ↓
Approve     Reject      Correction Required
   ↓                              ↓
PostgreSQL              (returned to alumni to
(official record            resubmit → back to
   updated)                  Pending Submission)
```

Notes:

- A submission's `status` moves through exactly these states: `Pending → Approved`, `Pending → Rejected`, or `Pending → Correction Required → Pending` (resubmitted) `→ Approved/Rejected`. There is no state that writes to the official `alumni` / `academic_records` / `employment` / `employment_history` tables except `Approved`.
- Every `Approved` transition must write an audit log entry (`docs/security.md` Section 6) — the official record and the audit trail update together, never one without the other.
- `Rejected` and `Correction Required` leave the official record completely unchanged; only the submission record itself changes state.

---

## 4. Admin Direct Correction

Distinct from alumni submissions: an admin may correct a record directly (e.g., fixing a data-entry error, resolving a flagged duplicate) without going through the submission queue.

```
Admin  →  FastAPI (PUT /api/alumni/{student_id}, /academic, /employment, etc.)
        ↓
Validation (same backend + PostgreSQL rules as any other write)
        ↓
PostgreSQL (official record updated immediately)
        ↓
Audit Log entry written
```

This path is **admin-only** (`docs/security.md` Section 2.3) and always produces an audit log entry, since it bypasses the verification gate that alumni submissions go through.

---

## 5. Dashboard / Analytics Read Path

Analytics never touch a separate copy of the data — they read live from PostgreSQL through the same backend, so KPI values always reflect the current state of official records (PRD Section 37 acceptance criteria: "KPI values reflect database changes").

```
PostgreSQL (source of truth)
        ↓
FastAPI  (aggregation queries — GET /api/dashboard/overview, /career, /data-quality)
        ↓
Aggregated JSON response
        ↓
React Dashboard (charts, KPI cards, filters)
```

- The frontend never queries PostgreSQL directly (`docs/security.md` Section 3).
- Filters applied in the UI are passed as query parameters and re-run against PostgreSQL on every change — dashboards are not snapshots.

---

## 6. Summary: What Is Allowed to Write to Official Tables

| Source | Writes directly to official tables? | Path |
|---|---|---|
| Prototype synthetic dataset (AI-generated) | Once, at initial load only | Manual load into PostgreSQL after manual/AI-assisted validation (Section 1) |
| Future bulk registrar import | Yes, at import time | Python ETL → Validation → PostgreSQL (Section 2) |
| Alumni self-service update | **No — never directly** | Submission → Pending → Admin Approve → PostgreSQL (Section 3) |
| Admin direct edit | Yes | FastAPI write endpoint → PostgreSQL, audited (Section 4) |
| Analytics dashboards | No (read-only) | Aggregation query only (Section 5) |

The one rule that must never be violated regardless of which path is used: **alumni-submitted changes are proposals, not writes, until an admin approves them.**
