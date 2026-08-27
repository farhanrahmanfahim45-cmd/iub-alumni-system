# Database Dictionary

**IUB International Business Alumni Information Management System**
**Authoritative structure:** `database/schema.sql`
**Values documented from:** `validated_data_corrected.xlsx` (487 alumni / 500 academic / 500 employment / 195 employment-history rows)

This document defines what each field *means*, its expected values, and how the tables relate. Where the observed dataset conflicts with `schema.sql`, that is flagged inline — `schema.sql` wins as the structural authority, and the data must be corrected to match it (see `docs/data_load_issues.md`).

---

## 1. Relationships

```
alumni (student_id PK)
   │
   ├──1:1──▶ academic_records   (student_id FK, academic_id PK)
   ├──1:1──▶ employment          (student_id FK, employment_id PK)
   └──1:N──▶ employment_history  (student_id FK, employment_history_id PK)
```

- `student_id` is the **join key** across all four tables and the current primary identifier.
- `academic_records` and `employment` are **one row per alumnus** in the current dataset (max 1 each, verified) — even though the schema does not enforce uniqueness on `student_id` in those tables. A `UNIQUE(student_id)` constraint should be added if 1:1 is the intended rule.
- `employment_history` is **zero-to-many**: 166 of 487 alumni have history rows (138 with one, 27 with two, 1 with three); 321 have none. Absence of history is normal, not missing data.
- Current employment lives in `employment`; past employment lives in `employment_history`. They are never mixed.

---

## 2. Table: `alumni`

Personal, contact, and degree-level information. One row per alumnus.

| Field | Type | Null? | Meaning & expected values |
|---|---|---|---|
| `student_id` | VARCHAR(7) PK | No | IUB-issued student number, 7 digits. The system's current primary identifier. First two digits appear to encode admission year (`20xxxxx` → 2020, `1800xxx` → 2018) — observed to match `admission_year` in every row, but **this is a dataset convention, not a rule the schema enforces**; do not build logic that depends on it. |
| `alumni_id` | VARCHAR(8) UNIQUE | No | Long-term institutional identifier, format `AL-00001` (CHECK `^AL-[0-9]{5}$`). Sequential in the prototype dataset. Intended to eventually replace `student_id` as the primary reference without breaking the FK structure. |
| `first_name` | VARCHAR(100) | No | Given name. |
| `last_name` | VARCHAR(100) | No | Family name. Display name = `first_name + ' ' + last_name`. |
| `personal_email` | VARCHAR(255) UNIQUE | No | Alumnus's contact email. **Sensitive** — never returned in directory/list responses (`docs/security.md` §4). ⚠️ The schema CHECK requires `@iub.edu.bd`, which contradicts the PRD's rule that personal email is stored *separately from* institutional email. See §6 below. |
| `phone` | VARCHAR(50) | Yes | Contact phone. **Sensitive** — same restriction as email. Prototype values are placeholders (`DEMO-PHONE-001`), not parseable phone numbers; no format validation should assume a real numbering plan until real data arrives. |
| `linkedin_url` | TEXT | Yes | LinkedIn profile URL. Prototype values are `https://example.com/alumni/NNN` placeholders. Not sensitive. |
| `degree` | VARCHAR(20) | No | Degree awarded. Observed: `BBA` (367), `BSc` (40), `B.Pharm` (32), `BA` (15), `BSS` (12), `B.Eng` (11), `LLB` (10). Not constrained by the schema — treat as a controlled vocabulary enforced in the API layer. |
| `major` | VARCHAR(100) | No | Primary field of study. 20 distinct values observed; `International Business` is the largest (256). Must be academically valid for the `degree` (e.g., `Pharmacy` only with `B.Pharm`). |
| `minor` | VARCHAR(100) | Yes | Secondary field. 50 alumni have no minor — legitimately null. 13 distinct values observed. ⚠️ Includes a case inconsistency (`international business` lowercase in 5 rows) that must be normalized before load. |
| `admission_year` | INT | Yes | Year of first enrolment. Observed range 2010–2023. |
| `graduation_year` | INT | Yes | Year degree was awarded. Observed range 2013–2027. CHECK enforces `graduation_year >= admission_year`. Observed gaps are 3, 4, or 5 years. Note: values beyond the current year (2026, 2027) represent expected/scheduled graduation in the synthetic dataset. |

**Scope note:** the department's interest is alumni with an International Business **major or minor**. 127 of 487 records have neither — these are present to give the directory and dashboards realistic degree diversity, not because they're in scope for departmental reporting. Dashboard KPIs for "IB Majors" (256) and "IB Minors" (152, after case normalization) should count these fields explicitly rather than assuming every row is an IB alumnus.

---

## 3. Table: `academic_records`

Academic performance, honors, internship, and research interest. One row per alumnus.

| Field | Type | Null? | Meaning & expected values |
|---|---|---|---|
| `academic_id` | VARCHAR(20) PK | No | Surrogate key, format `AC-00001`. Internal only — not shown in the UI. |
| `student_id` | VARCHAR(7) FK | No | → `alumni.student_id`. |
| `cgpa` | NUMERIC(3,2) | Yes | Cumulative GPA on a 4.00 scale. CHECK `0 ≤ cgpa ≤ 4.00`. Observed range 2.44–4.00, mean 3.35. Drives the "Average CGPA" KPI and CGPA distribution chart. |
| `academic_honors` | VARCHAR(100) | Yes | Recognition received. Observed: `Dean's List`, `Merit Scholarship`, `Academic Scholarship`, `Departmental Recognition`. **Null in 365 of 500 rows** — no honors is the normal case, so the UI must not render an empty field as an error. |
| `internship_completed` | VARCHAR(10) | Yes | `'Yes'` or `'No'` (CHECK-enforced). Stored as text, not boolean — the API should expose it as a boolean to the frontend while writing the string form to the database. |
| `internship_organization` | VARCHAR(255) | Yes | Where the internship was done. Null when `internship_completed = 'No'`. |
| `internship_position` | VARCHAR(150) | Yes | Internship role title. |
| `internship_industry` | VARCHAR(100) | Yes | Sector of the internship host. 11 values observed (`Banking`, `Consulting`, `E-commerce`, `FMCG`, `Financial Services`, `Logistics`, `NGO/Development`, `Pharmaceuticals`, `Retail`, `Technology`, `Telecommunications`). |
| `research_interest` | VARCHAR(255) | Yes | Declared academic/research interest. 12 IB-oriented values observed (e.g. `International Trade`, `Foreign Direct Investment`, `Global Supply Chain`). Populated in every row of the current dataset, but nullable in the schema. |

**Business rule — BBA internship:** all 367 BBA records have `internship_completed = 'Yes'` (verified). This reflects BBA's mandatory internship requirement. The rule is **degree-specific and must not be enforced universally** — other degrees may legitimately have `'No'`.

---

## 4. Table: `employment`

Current employment status. One row per alumnus, including alumni who are not employed.

| Field | Type | Null? | Meaning & expected values |
|---|---|---|---|
| `employment_id` | VARCHAR(20) PK | No | Surrogate key, format `EMP-00001`. Internal only. |
| `student_id` | VARCHAR(7) FK | No | → `alumni.student_id`. |
| `employment_status` | VARCHAR(50) | No | CHECK-enforced to exactly: `Employed` (399), `Seeking Employment` (40), `Further Studies` (46), `Self-Employed` (15). Drives the Career Landscape KPI cards. |
| `company` | VARCHAR(255) | Yes | Current employer. |
| `job_title` | VARCHAR(150) | Yes | Current role. 15 values observed, from `Management Trainee` through `Senior Manager` — a rough seniority ladder, useful for career-progression analysis. |
| `industry` | VARCHAR(100) | Yes | Employer's sector. 20 values observed. Drives "Employment by Industry". |
| `job_function` | VARCHAR(100) | Yes | Functional area: `Business Analysis`, `Business Development`, `Finance`, `Human Resources`, `Marketing`, `Operations`, `Sales`, `Supply Chain`. Drives "Employment by Job Function". |
| `country` | VARCHAR(100) | Yes | 9 values observed: `Bangladesh` plus `Australia`, `Malaysia`, `Qatar`, `Saudi Arabia`, `Singapore`, `UAE`, `UK`, `USA`. Drives "Employment by Country". |
| `city` | VARCHAR(100) | Yes | 24 values observed, consistent with their country. |
| `start_year` | INT | Yes | Year the current role began. Observed 2014–2026. |

**Conditional-null rule (verified in the data, not enforced by the schema):** when `employment_status` is `Seeking Employment` or `Further Studies`, all employer fields (`company`, `job_title`, `industry`, `job_function`, `country`, `city`, `start_year`) are null — correctly so. When status is `Employed` or `Self-Employed`, they are populated. The API must enforce this in both directions: reject an `Employed` record with no company, and reject a `Seeking Employment` record that carries employer data.

---

## 5. Table: `employment_history`

Previous employment. Zero, one, or many rows per alumnus.

| Field | Type | Null? | Meaning & expected values |
|---|---|---|---|
| `employment_history_id` | VARCHAR(20) PK | No | Surrogate key, format `HIST-00001`. Internal only. |
| `student_id` | VARCHAR(7) FK | No | → `alumni.student_id`. |
| `company` | VARCHAR(255) | Yes | Former employer. |
| `job_title` | VARCHAR(150) | Yes | Former role. Same vocabulary as `employment.job_title`. |
| `industry` | VARCHAR(100) | Yes | Former employer's sector. |
| `job_function` | VARCHAR(100) | Yes | Former functional area. |
| `country` / `city` | VARCHAR(100) | Yes | Former work location. |
| `start_year` | INT | Yes | Year the role began. Observed 2018–2024. |
| `end_year` | INT | Yes | Year the role ended. CHECK: `end_year IS NULL OR end_year >= start_year`. Populated in every row of the current dataset (2019–2025); null would mean an open-ended past role, which should not normally occur since current roles belong in `employment`. |

**Display rule:** render as a chronological timeline/table sorted by `start_year` descending, with the `employment` row shown above it as "Present". Do not assume history rows are contiguous or gap-free — career gaps are real and should display as gaps, not be filled in.

---

## 6. Known Conflicts Requiring a Decision

These are documented rather than silently resolved, per development principle 11 ("ask for clarification when requirements conflict").

1. **`personal_email` domain constraint.** `schema.sql` enforces `personal_email ~ '^[^@]+@iub\.edu\.bd$'`, but the PRD and project context state personal email is stored *separately from* institutional email. As written, the constraint makes it impossible to store a real personal address (Gmail, employer domain) — which is precisely what alumni will submit after graduation. Either the CHECK should be relaxed to a generic email-format pattern, or a separate `institutional_email` column should be added and the constraint moved to it. **This blocks the alumni self-service update flow and should be resolved before Phase 2.**

2. **`major` == `minor` in 53 rows** (45 of them `International Business` in both). Academically this is usually invalid — a student does not minor in their own major. Needs either a `CHECK (minor IS NULL OR minor <> major)` constraint plus data correction, or an explicit departmental confirmation that these rows mean "IB major, no minor."

3. **No `UNIQUE(student_id)`** on `academic_records` or `employment`, though both are 1:1 in practice. Without it, nothing stops two academic records for the same student, which would silently double-count in every dashboard aggregate.

4. **Supporting tables not yet defined.** `users`, `roles`, `alumni_submissions`, `audit_logs` are required by the API spec, security doc, and verification workflow, but do not exist in `schema.sql`. They should be added before Phase 5 (Security & Governance).

---

## 7. Field-to-Feature Map

Quick reference for which fields feed which part of the product:

| Feature | Fields used |
|---|---|
| Directory table | `student_id`, `first_name`, `last_name`, `degree`, `major`, `graduation_year`, `employment.company`, `employment.employment_status` |
| Directory search | `first_name`, `last_name`, `student_id`, `alumni_id`, `personal_email`, `employment.company` |
| Directory filters | `degree`, `major`, `minor`, `graduation_year`, `employment_status`, `industry`, `country` |
| Dashboard 1 (Academic) | `student_id` (count), `major`, `minor`, `cgpa`, `internship_completed`, `graduation_year`, `degree` |
| Dashboard 2 (Career) | `employment_status`, `industry`, `company`, `job_function`, `country`, plus `employment_history` for progression |
| Data quality checks | duplicate `student_id` / `personal_email`, null `phone` / `personal_email`, `cgpa` range, year logic, `employment_status`-vs-employer-field consistency |
| Restricted from faculty/public | `personal_email`, `phone` (see `docs/security.md` §4) |
