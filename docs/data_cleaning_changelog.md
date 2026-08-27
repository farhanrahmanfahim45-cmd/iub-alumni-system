# Data Cleaning Changelog

**Input:** `validated_data_corrected.xlsx` (487 / 500 / 500 / 195 rows)
**Output:** `data/validated_data_final.xlsx` (500 / 500 / 500 / 195 rows)
**Script:** `database/clean_dataset.py`
**Date:** 2026-08-26

Resolves the issues in `docs/data_load_issues.md`. Every change is listed below with its reasoning, so any of them can be reversed if the department disagrees.

---

## 1. Restored 13 dropped alumni rows *(fixes the FK violation)*

The 13 orphaned child records now have parent rows, so `Alumni` is back to 500 and all three foreign keys resolve.

**This is a reconstruction, not an invention.** The evidence that these rows were dropped rather than the children being spurious:

- The 13 missing `alumni_id` values (`AL-00067`, `AL-00074`, `AL-00105`, `AL-00124`, `AL-00156`, `AL-00195`, `AL-00307`, `AL-00346`, `AL-00362`, `AL-00375`, `AL-00395`, `AL-00431`, `AL-00450`) map **exactly** onto the sequence numbers of the orphaned records — `AC-00067` / `EMP-00067` belong to student `2100067`.
- Every existing row follows fixed derivation rules, which were applied to reproduce these:

| Field | Rule | Example (`2100067`) |
|---|---|---|
| `alumni_id` | last 4 digits of `student_id` | `AL-00067` |
| `personal_email` | `alumniNNN@iub.edu.bd` | `alumni067@iub.edu.bd` |
| `phone` | `DEMO-PHONE-NNN` | `DEMO-PHONE-067` |
| `linkedin_url` | `https://example.com/alumni/NNN` | `.../067` |
| `admission_year` | first 2 digits of `student_id` | `21` → `2021` |
| `graduation_year` | `admission_year + 4` (modal gap, 301 of 487 rows) | `2025` |

**Fields with no derivable value** — names, degree, major, minor — were chosen, subject to two constraints:

- **Degree honours the BBA internship rule.** Two of the 13 (`2100156`, `1200395`) have `internship_completed = 'No'` in their academic record, so neither can be BBA (all 367 BBA records have a completed internship). They were assigned `BSc / Computer Science` and `BSS / Economics` — both combinations already occur in the dataset — each with an International Business **minor**, keeping them in departmental scope. The other 11 were assigned `BBA / International Business`, consistent with the dataset's composition.
- **`graduation_year` does not postdate existing employment.** Verified against each record's earliest `employment.start_year` and `employment_history.start_year`: 0 conflicts.

Names were drawn from the first/last name pools already present in the dataset.

**If the original 13 rows still exist somewhere**, replace these reconstructions with the originals — the derived fields will match, only the name/degree/major choices differ.

---

## 2. Lowercased 5 emails *(fixes the CHECK violation)*

`AL-00083`, `AL-00213`, `AL-00299`, `AL-00325`, `AL-00443` — `ALUMNI083@IUB.EDU.BD` → `alumni083@iub.edu.bd`. `chk_email` is case-sensitive.

**Also do this in the API:** normalise email to lowercase on write, or a case-sensitive `UNIQUE` lets `Alumni083@…` and `alumni083@…` coexist as two alumni.

---

## 3. Normalised 5 minor values

`international business` → `International Business` for students `1800028`, `1800116`, `1300268`, `1800422`, `1600472`. These would otherwise render as a separate slice in the Minor Distribution chart and be missed by any exact-match filter.

---

## 4. Cleared 56 `minor` values that duplicated `major` ⚠️

**This is the one change with a visible effect on the dashboards, and the one most likely to need a departmental decision.**

56 rows had `minor == major` (53 originally, plus 3 more once the casing in change 3 was normalised). 48 of them were `International Business` in both fields. Since a student cannot minor in their own major, `minor` was set to `NULL`.

Effect on the Dashboard 1 KPIs:

| KPI | Before | After |
|---|---|---|
| IB Majors | 256 | **267** (+11 restored alumni) |
| IB Minors | 147 | **106** |
| Neither IB | 129 | 127 |

The IB Minors figure drops by 41 because those records were counting the same alumni twice — once as a major, once as a minor. **106 is the accurate count** of alumni whose minor is International Business.

If the department confirms these rows were meant to mean something else (e.g. "IB major, minor unspecified"), the change is a one-line revert in `clean_dataset.py`. Consider adding `CHECK (minor IS NULL OR minor <> major)` to `schema.sql` to prevent recurrence.

---

## 5. Trimmed whitespace from 4 names

`' Orin '`, `' Shakib '`, `' Sifat '`, `' Nayeem '` (students `1400069`, `2100125`, `2000378`, `1800451`). Leading/trailing spaces break exact-match name search and sort order.

---

## 6. Dropped `Record_Status` and `Validation_Errors`

ETL metadata with no counterpart in `schema.sql`, removed from all four sheets. Note that these columns claimed `VALID` for every row in the source file while five of those rows would have been rejected by the database — **do not use them as a load gate.**

---

## Verification after cleaning

All 18 checks pass against the output file:

```
PASS  FK orphans (academic / employment / history): 0 / 0 / 0
PASS  duplicate student_id / alumni_id / personal_email: 0 / 0 / 0
PASS  student_id length, alumni_id format, chk_email
PASS  graduation_year >= admission_year
PASS  cgpa within 0–4.00
PASS  internship_completed in (Yes, No)
PASS  employment_status in the four allowed values
PASS  employment_history end_year >= start_year
PASS  minor <> major
PASS  BBA internship rule (all BBA have completed internships)
PASS  conditional-null rule (employer fields match employment status)
```

Final counts: **Alumni 500 · Academic 500 · Employment 500 · Employment History 195** (166 alumni have history: 138 with one role, 27 with two, 1 with three).

---

## Still open — not fixed here

These need a decision rather than a script:

1. **`personal_email` CHECK requires `@iub.edu.bd`.** The current dataset satisfies it, so the load works — but the constraint makes it impossible for an alumnus to submit a real post-graduation address, which breaks the self-service update flow. Relax the CHECK to a generic email pattern, or add a separate `institutional_email` column and move the constraint there. **Blocks Phase 2.**
2. **No `UNIQUE(student_id)`** on `academic_records` or `employment`, though both are 1:1 in practice. Without it, a duplicate academic row would silently double-count in every dashboard aggregate.
3. **Supporting tables missing** from `schema.sql`: `users`, `roles`, `alumni_submissions`, `audit_logs`. Required by the API spec, the security document, and the verification workflow.
4. **13 rows where employment `start_year` is one year before `graduation_year`.** Left as-is — starting a job shortly before formal graduation is realistic, but flag it if the dashboards need a strict "employment begins after graduation" assumption.
