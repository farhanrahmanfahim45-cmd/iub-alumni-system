# API Specification

**IUB International Business Alumni Information Management System**
**Version:** 0.1 (Prototype)
**Base URL:** `/api`
**Format:** JSON over HTTPS
**Backend:** FastAPI + PostgreSQL (frontend never connects to PostgreSQL directly)

---

## 1. Conventions

### 1.1 Authentication

All endpoints except `POST /api/auth/login` require a bearer token:

```
Authorization: Bearer <access_token>
```

Tokens are issued at login and encode `user_id`, `role`, and (for alumni) `student_id`.

### 1.2 Roles

| Role | Description |
|---|---|
| `alumni` | Self-service access to own profile and submissions |
| `faculty` | Read-only access to directory, profiles, analytics |
| `admin` | Full record management, verification, user management |

Each endpoint below lists which roles may call it.

### 1.3 Standard response envelope

Success:
```json
{
  "data": { },
  "meta": { }
}
```

List/paginated success:
```json
{
  "data": [ ],
  "meta": {
    "page": 1,
    "page_size": 25,
    "total_records": 500,
    "total_pages": 20
  }
}
```

Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "CGPA must be between 0.00 and 4.00",
    "field": "cgpa"
  }
}
```

### 1.4 Standard HTTP status codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized for this action/record |
| 404 | Record not found |
| 409 | Conflict (e.g., duplicate Student ID) |
| 422 | Semantically invalid (e.g., business rule violation) |
| 500 | Server error |

### 1.5 Pagination & filtering (list endpoints)

Query parameters shared by list endpoints:

- `page` (default 1), `page_size` (default 25, max 100)
- `sort_by`, `sort_order` (`asc` | `desc`)
- Endpoint-specific filters, listed per endpoint below

---

## 2. Authentication

### `POST /api/auth/login`
Authenticate a user (alumni, faculty, or admin) and issue a token.

- **Auth:** none
- **Request body:**
```json
{ "identifier": "2310843", "password": "string" }
```
`identifier` is a Student ID for alumni, or a username/email for faculty/admin.
- **Response 200:**
```json
{
  "data": {
    "access_token": "jwt...",
    "role": "alumni",
    "student_id": "2310843",
    "alumni_id": "AL-00001",
    "expires_in": 3600
  }
}
```
- **Errors:** 401 invalid credentials, 403 account not yet verified

### `POST /api/auth/register`
Alumni self-registration / profile claiming (see Section 7 of PRD).

- **Auth:** none
- **Request body:**
```json
{ "student_id": "2310843", "email": "alumni@example.com", "password": "string" }
```
- **Behavior:**
  - If `student_id` exists in `alumni` table and is unclaimed → creates a `users` record linked to it, status `pending_verification` or `active` depending on configured policy.
  - If `student_id` does not exist → creates a `pending` alumni submission for admin review (Section 10).
- **Response 201:**
```json
{ "data": { "status": "claimed", "student_id": "2310843" } }
```
or
```json
{ "data": { "status": "pending_admin_review", "submission_id": 42 } }
```
- **Errors:** 409 Student ID already claimed, 400 invalid Student ID format

### `POST /api/auth/logout`
Invalidate the current session/token.

- **Auth:** any authenticated role
- **Response 200:** `{ "data": { "status": "logged_out" } }`

### `GET /api/auth/me`
Return the profile of the currently authenticated user (role, linked IDs).

- **Auth:** any authenticated role
- **Response 200:**
```json
{ "data": { "user_id": 12, "role": "alumni", "student_id": "2310843" } }
```

---

## 3. Alumni

### `GET /api/alumni`
Alumni Directory search/filter/list (PRD Section 11).

- **Auth:** `faculty`, `admin`
- **Query parameters:**
  - Search: `name`, `student_id`, `alumni_id`, `email`, `company`
  - Filters: `degree`, `major`, `minor`, `graduation_year`, `employment_status`, `industry`, `country`
  - Pagination/sort per Section 1.5
- **Response 200:**
```json
{
  "data": [
    {
      "student_id": "2310843",
      "alumni_id": "AL-00001",
      "name": "Ahmed Rahman",
      "degree": "BBA",
      "major": "International Business",
      "graduation_year": 2027,
      "company": "Company A"
    }
  ],
  "meta": { "page": 1, "page_size": 25, "total_records": 500, "total_pages": 20 }
}
```
- Sensitive fields (personal email, phone) are **excluded** from directory list results per Section 25; they only appear in the full profile call below, subject to permission.

### `GET /api/alumni/{student_id}`
Full alumni profile (PRD Section 8).

- **Auth:** `admin`, `faculty` (any record); `alumni` (own record only — `student_id` must match token)
- **Response 200:**
```json
{
  "data": {
    "student_id": "2310843",
    "alumni_id": "AL-00001",
    "name": "Ahmed Rahman",
    "personal_email": "ahmed@example.com",
    "phone": "+8801XXXXXXXXX",
    "linkedin": "https://linkedin.com/in/...",
    "location": "Dhaka, Bangladesh",
    "academic": { "$ref": "GET /api/alumni/{student_id}/academic" },
    "current_employment": { "$ref": "GET /api/alumni/{student_id}/employment" },
    "employment_history": [ { "$ref": "employment_history item" } ]
  }
}
```
- Personal email/phone are omitted or masked when the caller lacks permission (Section 25).
- **Errors:** 403 alumni requesting another student's record, 404 not found

### `POST /api/alumni`
Create a new alumni record directly (admin data entry / correction path — bypasses the submission workflow).

- **Auth:** `admin`
- **Request body:** full alumni object (personal + academic + contact fields)
- **Response 201:** created alumni record
- **Errors:** 409 duplicate Student ID

### `PUT /api/alumni/{student_id}`
Directly update an official alumni record (admin only — the equivalent alumni-initiated path goes through `POST /api/submissions`, not this endpoint).

- **Auth:** `admin`
- **Request body:** partial or full alumni fields to update
- **Response 200:** updated alumni record
- **Side effect:** writes an audit log entry (Section 27)
- **Errors:** 404 not found, 400 validation error

### `DELETE /api/alumni/{student_id}`
Soft-delete/deactivate an alumni record (administrative correction of duplicates, Section 29).

- **Auth:** `admin`
- **Response 200:** `{ "data": { "student_id": "2310843", "status": "deactivated" } }`

---

## 4. Academic

### `GET /api/alumni/{student_id}/academic`
Academic record (PRD Section 13): CGPA, honors, internship, research interest, degree/major/minor, admission/graduation year.

- **Auth:** `admin`, `faculty`; `alumni` (own record)
- **Response 200:**
```json
{
  "data": {
    "student_id": "2310843",
    "degree": "BBA",
    "major": "International Business",
    "minor": null,
    "admission_year": 2023,
    "graduation_year": 2027,
    "cgpa": 3.62,
    "academic_honors": "Dean's List",
    "internship_completed": true,
    "internship_organization": "Company X",
    "internship_position": "Intern",
    "internship_industry": "FMCG",
    "research_interest": "Trade Policy"
  }
}
```

### `PUT /api/alumni/{student_id}/academic`
Direct admin update of academic record.

- **Auth:** `admin`
- **Request body:** partial academic fields
- **Business rule:** if `degree == "BBA"`, `internship_completed` must be provided/true per Section 13; the internship requirement is **not** enforced for other degrees.
- **Response 200:** updated academic record
- **Errors:** 422 if BBA internship rule is violated, 400 invalid CGPA (must be 0.00–4.00)

---

## 5. Employment

### `GET /api/alumni/{student_id}/employment`
Current employment status and details (PRD Section 14).

- **Auth:** `admin`, `faculty`; `alumni` (own record)
- **Response 200:**
```json
{
  "data": {
    "student_id": "2310843",
    "employment_status": "Employed",
    "company": "Company A",
    "job_title": "Manager",
    "industry": "FMCG",
    "job_function": "Marketing",
    "country": "Bangladesh",
    "city": "Dhaka",
    "start_year": 2027
  }
}
```
`employment_status` is one of: `Employed`, `Seeking Employment`, `Further Studies`, `Self-Employed`. Employer fields are required only when `employment_status = Employed` or `Self-Employed`.

### `PUT /api/alumni/{student_id}/employment`
Direct admin update of current employment.

- **Auth:** `admin`
- **Request body:** partial employment fields
- **Response 200:** updated employment record

### `GET /api/alumni/{student_id}/employment-history`
Chronological list of previous employment records (PRD Section 8; zero, one, or many per alumnus).

- **Auth:** `admin`, `faculty`; `alumni` (own record)
- **Response 200:**
```json
{
  "data": [
    { "id": 101, "period_start": 2025, "period_end": 2027, "organization": "Company B", "position": "Executive", "industry": "Retail" }
  ]
}
```

### `POST /api/alumni/{student_id}/employment-history`
Add a new historical employment entry (admin direct write).

- **Auth:** `admin`
- **Request body:**
```json
{ "period_start": 2025, "period_end": 2027, "organization": "Company B", "position": "Executive", "industry": "Retail" }
```
- **Response 201:** created entry with `id`

### `PUT /api/alumni/{student_id}/employment-history/{id}`
Edit a specific historical employment entry.

- **Auth:** `admin`
- **Response 200:** updated entry

### `DELETE /api/alumni/{student_id}/employment-history/{id}`
Remove an incorrect historical employment entry.

- **Auth:** `admin`
- **Response 200:** `{ "data": { "id": 101, "status": "deleted" } }`

---

## 6. Submissions (Verification Workflow)

Implements PRD Section 10: `Submit → Validate → Review → Approve/Reject/Correction → Store`.

### `POST /api/submissions`
Alumni submits new or updated information (personal, contact, academic, internship, research interest, employment, or employment history). This is the **only** way alumni can propose a change to official data.

- **Auth:** `alumni` (own `student_id` only)
- **Request body:**
```json
{
  "student_id": "2310843",
  "submission_type": "employment",
  "proposed_changes": {
    "company": "XYZ Ltd.",
    "job_title": "Senior Manager"
  }
}
```
`submission_type` ∈ `personal`, `contact`, `academic`, `internship`, `research_interest`, `employment`, `employment_history`.
- **Response 201:**
```json
{ "data": { "submission_id": 501, "status": "Pending" } }
```
- **Errors:** 400 frontend/backend validation failure (blocks submission before it is even stored as Pending)

### `GET /api/submissions`
List submissions.

- **Auth:** `admin` (all submissions); `alumni` (own submissions only, for tracking status per Section 9)
- **Query parameters:** `status` (`Pending` | `Approved` | `Rejected` | `Correction Required`), `student_id`, `submission_type`, pagination
- **Response 200:**
```json
{
  "data": [
    {
      "submission_id": 501,
      "student_id": "2310843",
      "submission_type": "employment",
      "status": "Pending",
      "submitted_at": "2026-08-20T10:00:00Z",
      "current_values": { "company": "ABC Ltd." },
      "proposed_values": { "company": "XYZ Ltd." }
    }
  ],
  "meta": { "page": 1, "page_size": 25, "total_records": 12, "total_pages": 1 }
}
```
`current_values`/`proposed_values` power the side-by-side comparison view described in Section 10.

### `GET /api/submissions/{id}`
Full detail of a single submission, including current vs. proposed values.

- **Auth:** `admin`; `alumni` (own submission only)
- **Response 200:** single submission object as above

### `PUT /api/submissions/{id}/approve`
Approve a pending submission; writes the proposed values into the official tables (`alumni`, `academic_records`, `employment`, or `employment_history`) and marks the submission `Approved`.

- **Auth:** `admin`
- **Request body (optional):** `{ "note": "string" }`
- **Response 200:**
```json
{ "data": { "submission_id": 501, "status": "Approved", "applied_at": "2026-08-26T09:00:00Z" } }
```
- **Side effects:** updates official record, writes audit log entry (Section 27)
- **Errors:** 409 if submission is not in `Pending`/`Correction Required` state

### `PUT /api/submissions/{id}/reject`
Reject a submission; official data is left unchanged.

- **Auth:** `admin`
- **Request body:** `{ "reason": "string" }` (required, shown to alumni)
- **Response 200:** `{ "data": { "submission_id": 501, "status": "Rejected" } }`

### `PUT /api/submissions/{id}/request-correction`
Mark a submission as needing correction and send it back to the alumni with admin comments, rather than a flat rejection.

- **Auth:** `admin`
- **Request body:** `{ "comments": "string" }`
- **Response 200:** `{ "data": { "submission_id": 501, "status": "Correction Required" } }`

### `PUT /api/submissions/{id}` (resubmit)
Alumni updates a `Correction Required` submission and resends it for review.

- **Auth:** `alumni` (own submission only)
- **Request body:** `{ "proposed_changes": { } }`
- **Response 200:** `{ "data": { "submission_id": 501, "status": "Pending" } }`

---

## 7. Dashboard / Analytics

Implements PRD Sections 16–17. All aggregation happens in FastAPI/PostgreSQL; the frontend only renders returned aggregates.

### `GET /api/dashboard/overview`
Dashboard 1 — Alumni & Academic Overview.

- **Auth:** `faculty`, `admin`
- **Query parameters (filters):** `graduation_year`, `degree`, `major`, `minor`
- **Response 200:**
```json
{
  "data": {
    "kpis": {
      "total_alumni": 500,
      "ib_majors": 310,
      "ib_minors": 90,
      "average_cgpa": 3.41,
      "internship_completion_rate": 0.87
    },
    "charts": {
      "alumni_by_graduation_year": [ { "year": 2024, "count": 80 } ],
      "degree_distribution": [ { "degree": "BBA", "count": 400 } ],
      "major_distribution": [ { "major": "International Business", "count": 310 } ],
      "minor_distribution": [ { "minor": "International Business", "count": 90 } ],
      "cgpa_distribution": [ { "bucket": "3.50-4.00", "count": 120 } ],
      "internship_completion": [ { "status": "Completed", "count": 435 } ]
    }
  }
}
```

### `GET /api/dashboard/career`
Dashboard 2 — Career Landscape.

- **Auth:** `faculty`, `admin`
- **Query parameters (filters):** `graduation_year`, `degree`, `major`, `minor`, `industry`, `country`, `employment_status`
- **Response 200:**
```json
{
  "data": {
    "kpis": {
      "employed": 320,
      "seeking_employment": 45,
      "further_studies": 60,
      "self_employed": 30
    },
    "charts": {
      "employment_by_industry": [ { "industry": "FMCG", "count": 90 } ],
      "top_employers": [ { "company": "Company A", "count": 15 } ],
      "employment_by_job_function": [ { "function": "Marketing", "count": 70 } ],
      "employment_by_country": [ { "country": "Bangladesh", "count": 280 } ],
      "career_snapshot": [ { "status": "Employed", "percentage": 64.0 } ],
      "career_progression": [ { "student_id": "2310843", "positions": 3 } ]
    }
  }
}
```

### `GET /api/dashboard/data-quality`
Admin data-quality summary (PRD Section 29).

- **Auth:** `admin`
- **Response 200:**
```json
{
  "data": {
    "incomplete_profiles": 17,
    "pending_verification": 12,
    "potential_duplicates": 3,
    "missing_employment_info": 24
  }
}
```

---

## 8. Admin — Users & Data Quality

### `GET /api/users`
List system users (alumni accounts, faculty, admin) for account management.

- **Auth:** `admin`
- **Query parameters:** `role`, `status`, pagination
- **Response 200:** list of `{ user_id, role, student_id?, email, status }`

### `POST /api/users`
Create a faculty or admin account.

- **Auth:** `admin`
- **Request body:** `{ "name": "string", "email": "string", "role": "faculty" }`
- **Response 201:** created user, with a temporary password / invite flow

### `PUT /api/users/{user_id}`
Update a user's role or status (e.g., deactivate an account).

- **Auth:** `admin`
- **Response 200:** updated user

### `GET /api/data-quality/duplicates`
List potential duplicate alumni records for review (Section 29).

- **Auth:** `admin`
- **Response 200:** list of candidate duplicate pairs with matching fields (name/email/student_id similarity)

### `GET /api/audit-logs`
Query the audit trail (Section 27).

- **Auth:** `admin`
- **Query parameters:** `user`, `record` (student_id or alumni_id), `action`, `date_from`, `date_to`, pagination
- **Response 200:**
```json
{
  "data": [
    { "user": "Admin01", "action": "Updated CGPA", "record": "2310843", "timestamp": "2026-08-26T00:00:00Z" }
  ]
}
```

---

## 9. Role → Endpoint Access Matrix

| Endpoint | Alumni | Faculty | Admin |
|---|---|---|---|
| `POST /api/auth/login`, `/register`, `/logout` | ✅ | ✅ | ✅ |
| `GET /api/alumni` (directory) | ❌ | ✅ | ✅ |
| `GET /api/alumni/{id}` | own only | ✅ | ✅ |
| `POST /api/alumni`, `PUT /api/alumni/{id}`, `DELETE /api/alumni/{id}` | ❌ | ❌ | ✅ |
| `GET .../academic`, `.../employment`, `.../employment-history` | own only | ✅ | ✅ |
| `PUT .../academic`, `PUT .../employment`, write history | ❌ | ❌ | ✅ |
| `POST /api/submissions` | own only | ❌ | ❌ |
| `GET /api/submissions` | own only | ❌ | ✅ |
| `PUT /api/submissions/{id}/approve\|reject\|request-correction` | ❌ | ❌ | ✅ |
| `GET /api/dashboard/overview`, `/career` | ❌ | ✅ | ✅ |
| `GET /api/dashboard/data-quality` | ❌ | ❌ | ✅ |
| `GET/POST/PUT /api/users` | ❌ | ❌ | ✅ |
| `GET /api/audit-logs` | ❌ | ❌ | ✅ |

---

## 10. Validation Rules Summary (Backend Layer)

Per PRD Section 26, these are enforced server-side (in addition to matching PostgreSQL constraints):

- `student_id`: required, unique, fixed format (numeric string as issued by IUB)
- `email`: valid email format, unique per alumni
- `cgpa`: numeric, range 0.00–4.00
- `admission_year` / `graduation_year`: valid 4-digit year, `graduation_year >= admission_year`
- `internship_completed`: required `true` for `degree = "BBA"`; optional for other degrees
- `employment_status`: enum (`Employed`, `Seeking Employment`, `Further Studies`, `Self-Employed`)
- Employer fields (`company`, `job_title`, `industry`, `job_function`, `country`, `city`, `start_year`) required when `employment_status` in (`Employed`, `Self-Employed`)
- Duplicate detection: flags matching `student_id`, `personal_email`, or high name-similarity across records

---

## 11. Notes for Implementation

- This spec covers the **prototype scope** (PRD Section 32). Endpoints under Sections 8–9 (`users`, `audit-logs`, `data-quality`) depend on the `users`, `roles`, `alumni_submissions`, and `audit_logs` tables introduced in PRD Section 19, and should be built in Phase 5 (Security & Governance).
- All write endpoints that touch official data (`PUT /api/alumni/*`, submission approvals) must write to `audit_logs`.
- The frontend must never receive PostgreSQL credentials or query PostgreSQL directly; all data access goes through these FastAPI endpoints.
