# Security Requirements

**IUB International Business Alumni Information Management System**
**Status:** Essential — treat as a hard requirement, not a suggestion

These rules are non-negotiable for the prototype and must not be relaxed for convenience during development (e.g., "just for testing," "just for the demo"). Any deviation must be called out explicitly and reverted before the system is used with real data.

---

## 1. Authentication

- Authentication is required for **all** protected areas of the system. Nothing beyond `POST /api/auth/login` and `POST /api/auth/register` is reachable without a valid token.
- Every request to a protected endpoint must carry a valid bearer token (`Authorization: Bearer <token>`); the backend must reject missing, malformed, or expired tokens with `401`, before any business logic runs.
- Passwords must be hashed (e.g., bcrypt/argon2) before storage — never stored or logged in plain text.
- Tokens must expire (short-lived access token); do not issue tokens with unlimited lifetime.
- Login failures must not reveal whether the *identifier* (Student ID/email) or the *password* was wrong — return a generic "invalid credentials" message.

---

## 2. Roles

The system has exactly three roles. Every authenticated user has exactly one role, and every endpoint must check it.

- **Alumni**
- **Faculty**
- **Admin**

Role must be enforced **server-side, on every request** — never trust a role claim from the frontend alone beyond what's embedded in the verified token.

### 2.1 Alumni

Can:
- View own profile only.
- Submit updates (personal, contact, academic, internship, research interest, employment, employment history) as pending submissions.
- View own submission status/history.

Cannot:
- Directly modify verified/official records, under any circumstance. Every alumni-initiated change must go through `POST /api/submissions` and remain in `Pending` state until an admin acts on it.
- View any other alumni's profile or contact information.
- Access faculty or admin functionality (directory, analytics, verification, user management).

An alumni request for `student_id` X must be rejected with `403` if the authenticated token's `student_id` does not match X — regardless of what the frontend sends.

### 2.2 Faculty

Can:
- View the alumni directory and search/filter it.
- View alumni profiles (subject to the contact-information rule in Section 5).
- Access analytics dashboards (read-only).

Cannot:
- Edit any alumni record, academic record, or employment record.
- Approve, reject, or otherwise act on submissions.
- Access user management, audit logs, or the data-quality panel.

Faculty access is read-only in the prototype, full stop — there is no faculty write path anywhere in the API.

### 2.3 Admin

Full management and verification privileges:
- Manage alumni records (create, edit, deactivate).
- Verify alumni and manage the verification workflow (approve / reject / request correction on submissions).
- Correct records directly.
- Add/edit employment and employment history.
- Manage user accounts (faculty/admin accounts, activation/deactivation).
- Access all dashboards, the data-quality panel, and audit logs.

Admin is the only role permitted to write directly to official (non-submission) tables.

---

## 3. Database Security

- **PostgreSQL credentials must never be exposed to the frontend**, in any form — not in API responses, client-side config, environment variables shipped to the browser, source maps, or error messages.
- **All database access must go through FastAPI.** The frontend (React) must never hold a direct connection string or query PostgreSQL directly, under any circumstance, including for "read-only" or "just analytics" shortcuts.
- The application must connect to PostgreSQL using a **dedicated, least-privilege database user** — not the PostgreSQL superuser. This user's grants should be scoped to only the schemas/tables the application needs.
- Database errors (constraint violations, connection failures) must be caught and translated into generic API error responses (Section 1.3/1.4 of the API spec) — raw database error text, table names, or stack traces must never reach the client.

---

## 4. Protecting Sensitive Contact Information

- Sensitive contact fields — **personal email and phone number** — must not be publicly exposed.
- These fields must never appear in list/directory responses (`GET /api/alumni`), regardless of role.
- These fields may appear in the single-profile response (`GET /api/alumni/{student_id}`) only for:
  - The alumni themselves (own record), or
  - Admin/faculty, if and only if the department's approved visibility policy permits it for that role.
- Until IUB/the department finalizes the visibility policy (PRD Section 25), default to the **most restrictive** interpretation: treat personal email and phone as admin-only, and require an explicit policy decision before exposing them to faculty.
- Alumni should eventually be able to control which optional fields are visible to other authorized users — this is a future refinement, not a reason to expose more than the minimum today.

---

## 5. Input Validation (Defense in Depth)

Validation must happen at every layer, not just one:

- **Frontend:** required fields, email format, Student ID format, year format — for user experience, not as a security boundary.
- **Backend (FastAPI):** the real security boundary. Re-validate everything the frontend validates, plus business rules (e.g., BBA alumni must have an internship record), allowed enum values (employment status, submission status), duplicate detection, and relationship validation (e.g., `graduation_year >= admission_year`).
- **PostgreSQL:** primary keys, foreign keys, unique constraints (e.g., unique Student ID), check constraints (e.g., CGPA range), and correct data types as the last line of defense — the database must reject bad data even if the API layer has a bug.

Never assume the frontend validated something; the backend must independently enforce every rule that matters.

---

## 6. Audit Logging

- All administrative actions that change official data must be recorded: who (`user`), what (`action`), on which record (`student_id`/`alumni_id`), and when (`timestamp`).
- This includes, at minimum: direct admin edits to alumni/academic/employment records, and submission approve/reject/correction actions.
- Audit logs are admin-only and must not be editable or deletable through the application (append-only from the API's perspective).

---

## 7. Backup & Recovery

- Production PostgreSQL must have regular, automated backups.
- Backups must be stored in **separate storage from the production database machine** — a backup on the same disk/server as production is not an acceptable backup.

---

## 8. General Rules

- Never log secrets, passwords, or full tokens.
- Never commit database credentials, API keys, or `.env` files to version control.
- Treat every rule above as applying equally to the prototype and to any future production deployment — the prototype's use of synthetic/dummy data does not relax these requirements, since the same code path will eventually handle real personal data.
