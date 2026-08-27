# Data Load Issues

**Source file checked:** `validated_data_corrected.xlsx`
**Checked against:** `database/schema.sql` + PRD business rules
**Date:** 2026-08-26

Every row in all four sheets is marked `Record_Status = VALID` with an empty `Validation_Errors` column. That labelling is **not accurate** — the checks below were run directly against the schema's constraints and found issues that will cause a PostgreSQL load to fail or silently produce a wrong dataset.

---

## Blocking — the load will fail on these

### 1. 13 orphaned records (foreign key violation)

`Academic_Records` and `Employment` each contain 500 rows, but `Alumni` has only **487**. Thirteen `student_id` values appear in the child sheets with no parent row in `Alumni`:

```
1000362  1200346  1200395  1300105  1400124  1600307  1700431
2000195  2100067  2100074  2100156  2100375  2200450
```

Three of these (`1200346`, `1400124`, `1600307`) also appear in `Employment_History`.

`fk_academic_alumni`, `fk_employment_alumni`, and `fk_history_alumni` will reject these rows. **Decision needed:** either the 13 missing alumni rows were dropped and should be restored, or these child records are leftovers and should be deleted. Restoring is likely correct — the ID sequences in `Academic_ID`/`Employment_ID` run cleanly to 500, suggesting the alumni rows were lost, not that extra children were added.

### 2. 5 emails fail the CHECK constraint (case)

`chk_email` is case-sensitive (`~ '^[^@]+@iub\.edu\.bd$'`). These five are uppercased and will be rejected:

| Alumni ID | Student ID | Value |
|---|---|---|
| AL-00083 | 1900083 | `ALUMNI083@IUB.EDU.BD` |
| AL-00213 | 2000213 | `ALUMNI213@IUB.EDU.BD` |
| AL-00299 | 2000299 | `ALUMNI299@IUB.EDU.BD` |
| AL-00325 | 1300325 | `ALUMNI325@IUB.EDU.BD` |
| AL-00443 | 1100443 | `ALUMNI443@IUB.EDU.BD` |

Fix by lowercasing. Consider also lowercasing on write in the API, since a case-sensitive UNIQUE constraint means `Alumni083@…` and `alumni083@…` could both be stored as separate rows.

---

## Non-blocking — will load, but produces wrong analytics

### 3. 5 minors with inconsistent casing

`minor = 'international business'` (lowercase) in student IDs `1800028`, `1800116`, `1300268`, `1800422`, `1600472`. These load fine but will appear as a **separate category** in the Minor Distribution chart and be missed by any `minor = 'International Business'` filter — undercounting the IB Minors KPI by 5 (147 vs. the correct 152).

### 4. 53 records where `major` == `minor`

45 of them are `International Business` in both fields; the rest are `Computer Science`, `Accounting`, `Economics`, `Finance`, `Supply Chain Management`. A student normally cannot minor in their own major. Either correct these to `minor = NULL`, or confirm with the department that this is intentional. As-is, they inflate both the IB Majors and IB Minors counts from the same records.

### 5. `Record_Status` / `Validation_Errors` columns should not be loaded

These two columns exist in every sheet but have no counterpart in `schema.sql`. They're ETL metadata, not alumni data — drop them at load time rather than adding columns for them.

---

## Verified clean

For the record, these all passed:

- No duplicate `student_id`, `alumni_id`, or `personal_email` in `Alumni`.
- All `alumni_id` values match `^AL-[0-9]{5}$`; all `student_id` values are exactly 7 characters.
- `graduation_year >= admission_year` in every row (gaps of 3, 4, or 5 years).
- All CGPA values within 0–4.00 (range 2.44–4.00, no nulls).
- `internship_completed` is only `Yes`/`No`; `employment_status` only the four allowed values.
- `end_year >= start_year` in every `Employment_History` row.
- **BBA internship rule holds:** all 367 BBA records have `internship_completed = 'Yes'`.
- **Conditional-null rule holds:** all 40 `Seeking Employment` and 46 `Further Studies` rows have null employer fields; all 399 `Employed` and 15 `Self-Employed` rows have them populated.
- No value exceeds its column's VARCHAR length.
- `academic_records` and `employment` are strictly 1:1 per student (max 1 row each).

---

## Suggested load order

Once items 1–2 are fixed:

1. `alumni` first (parent table).
2. `academic_records`, `employment` — after alumni exists, or the FK will fail.
3. `employment_history` last.
4. Re-run these same checks against PostgreSQL after loading, rather than trusting the spreadsheet's own `Record_Status` column.
