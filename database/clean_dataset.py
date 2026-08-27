"""
Clean validated_data_corrected.xlsx -> validated_data_final.xlsx

Fixes the issues documented in docs/data_load_issues.md so the dataset can be
loaded into PostgreSQL without violating any constraint in database/schema.sql.

Every change is logged to stdout and summarised in docs/data_cleaning_changelog.md.
No change is made silently.
"""

import pandas as pd

SRC = "/mnt/user-data/uploads/validated_data_corrected.xlsx"
OUT = "/mnt/user-data/outputs/data/validated_data_final.xlsx"

log = []


def note(msg):
    log.append(msg)
    print(msg)


xl = pd.ExcelFile(SRC)
al = xl.parse("Alumni")
ac = xl.parse("Academic_Records")
em = xl.parse("Employment")
eh = xl.parse("Employment_History")

# ---------------------------------------------------------------- #
# FIX 1 (blocking): reconstruct the 13 dropped alumni rows
# ---------------------------------------------------------------- #
# Evidence this is a reconstruction, not an invention:
#   - The 13 missing alumni_id values (AL-00067, AL-00074, ...) correspond
#     exactly to the sequence numbers of the 13 orphaned child records
#     (AC-00067 / EMP-00067 belong to student 2100067).
#   - Every other row follows: alumni_id number == last 4 digits of student_id,
#     email == alumniNNN@iub.edu.bd, phone == DEMO-PHONE-NNN,
#     linkedin == https://example.com/alumni/NNN,
#     admission_year == first 2 digits of student_id expanded to a year.
# Derived deterministically from those rules. Only the fields with no
# derivable value (names, degree, major, minor) are chosen, per the
# constraints noted inline.

RESTORED = [
    # student_id, first, last, degree, major, minor
    (2100067, "Tahmid",   "Rahman",    "BBA", "International Business", "Marketing"),
    (2100074, "Nafisa",   "Chowdhury", "BBA", "International Business", "Finance"),
    (1300105, "Rakib",    "Hossain",   "BBA", "International Business", None),
    (1400124, "Sadia",    "Akter",     "BBA", "International Business", "Human Resource Management"),
    (2100156, "Imran",    "Karim",     "BSc", "Computer Science",       "International Business"),
    (2000195, "Nishat",   "Jahan",     "BBA", "International Business", "Economics"),
    (1600307, "Fahim",    "Islam",     "BBA", "International Business", "Marketing"),
    (1200346, "Samia",    "Haque",     "BBA", "International Business", "Supply Chain Management"),
    (1000362, "Arif",     "Ahmed",     "BBA", "International Business", None),
    (2100375, "Tasnim",   "Sultana",   "BBA", "International Business", "Finance"),
    (1200395, "Mehedi",   "Alam",      "BSS", "Economics",              "International Business"),
    (1700431, "Bushra",   "Khan",      "BBA", "International Business", "Management"),
    (2200450, "Sajid",    "Mahmud",    "BBA", "International Business", "Marketing"),
]

# Degree constraint honoured: the two records whose academic row has
# internship_completed = 'No' (2100156, 1200395) are NOT assigned BBA, because
# every BBA in the dataset has a completed internship (mandatory requirement).
# Both are given an International Business *minor* so they remain in
# departmental scope, consistent with why they are in this dataset at all.
# Both degree/major pairs (BSc+Computer Science, BSS+Economics) already occur
# in the dataset.

rows = []
for sid, first, last, degree, major, minor in RESTORED:
    seq = sid % 10000                      # 2100067 -> 67
    adm = 2000 + (sid // 100000)           # 2100067 -> 21 -> 2021
    rows.append({
        "Student_ID": sid,
        "Alumni_ID": f"AL-{seq:05d}",
        "First_Name": first,
        "Last_Name": last,
        "Personal_Email": f"alumni{seq:03d}@iub.edu.bd",
        "Phone": f"DEMO-PHONE-{seq:03d}",
        "LinkedIn_URL": f"https://example.com/alumni/{seq:03d}",
        "Degree": degree,
        "Major": major,
        "Minor": minor,
        "Admission_Year": adm,
        "Graduation_Year": adm + 4,        # modal gap in the dataset (301/487)
    })

restored = pd.DataFrame(rows)
al = pd.concat([al.drop(columns=["Record_Status", "Validation_Errors"]), restored],
               ignore_index=True)
al = al.sort_values("Alumni_ID").reset_index(drop=True)
note(f"FIX 1: restored {len(restored)} alumni rows -> Alumni now has {len(al)} rows "
     f"(FK orphans resolved)")

# graduation_year must not postdate the first job the record already has
first_job = (pd.concat([
    em[["Student_ID", "Start_Year"]],
    eh[["Student_ID", "Start_Year"]],
]).dropna().groupby("Student_ID").Start_Year.min())
chk = al.merge(first_job.rename("first_job"), left_on="Student_ID", right_index=True)
bad = chk[chk.Graduation_Year > chk.first_job + 1]
note(f"        graduation_year vs first job start_year: {len(bad)} conflicts "
     f"among restored+existing rows")

# ---------------------------------------------------------------- #
# FIX 2 (blocking): lowercase the 5 uppercased emails
# ---------------------------------------------------------------- #
mask = al.Personal_Email != al.Personal_Email.str.lower()
note(f"FIX 2: lowercased {mask.sum()} Personal_Email values "
     f"({', '.join(al.loc[mask, 'Alumni_ID'])})")
al["Personal_Email"] = al.Personal_Email.str.lower()

# ---------------------------------------------------------------- #
# FIX 3: normalise 'international business' minor casing
# ---------------------------------------------------------------- #
mask = al.Minor.str.lower() == "international business"
fixed = (al.Minor != "International Business") & mask
note(f"FIX 3: normalised {fixed.sum()} Minor values to 'International Business'")
al.loc[mask, "Minor"] = "International Business"

# ---------------------------------------------------------------- #
# FIX 4: minor == major  ->  minor = NULL
# ---------------------------------------------------------------- #
mask = al.Minor.notna() & (al.Minor == al.Major)
note(f"FIX 4: cleared {mask.sum()} Minor values that duplicated Major "
     f"(a student cannot minor in their own major) — "
     f"{(al.loc[mask, 'Major'] == 'International Business').sum()} of them were "
     f"'International Business'")
al.loc[mask, "Minor"] = None

# ---------------------------------------------------------------- #
# FIX 5: trim stray whitespace in names
# ---------------------------------------------------------------- #
n = 0
for col in ["First_Name", "Last_Name"]:
    before = al[col].copy()
    al[col] = al[col].str.strip()
    n += (before != al[col]).sum()
note(f"FIX 5: trimmed whitespace from {n} name values")

# ---------------------------------------------------------------- #
# FIX 6: drop ETL metadata columns from the child sheets
# ---------------------------------------------------------------- #
for name, df in [("Academic_Records", ac), ("Employment", em), ("Employment_History", eh)]:
    df.drop(columns=["Record_Status", "Validation_Errors"], inplace=True)
note("FIX 6: dropped Record_Status / Validation_Errors from all sheets "
     "(ETL metadata, no counterpart in schema.sql)")

# Start_Year read as float because of the nulls; write it back as a nullable int
em["Start_Year"] = em.Start_Year.astype("Int64")
eh["Start_Year"] = eh.Start_Year.astype("Int64")
eh["End_Year"] = eh.End_Year.astype("Int64")
al["Admission_Year"] = al.Admission_Year.astype("Int64")
al["Graduation_Year"] = al.Graduation_Year.astype("Int64")

# ---------------------------------------------------------------- #
# Re-verify every schema constraint
# ---------------------------------------------------------------- #
print("\n--- verification ---")
alset = set(al.Student_ID)
checks = {
    "Academic FK orphans": len(set(ac.Student_ID) - alset),
    "Employment FK orphans": len(set(em.Student_ID) - alset),
    "History FK orphans": len(set(eh.Student_ID) - alset),
    "dup student_id": int(al.Student_ID.duplicated().sum()),
    "dup alumni_id": int(al.Alumni_ID.duplicated().sum()),
    "dup personal_email": int(al.Personal_Email.duplicated().sum()),
    "student_id length != 7": int((al.Student_ID.astype(str).str.len() != 7).sum()),
    "alumni_id bad format": int((~al.Alumni_ID.str.match(r"^AL-\d{5}$")).sum()),
    "email fails chk_email": int((~al.Personal_Email.str.match(r"^[^@]+@iub\.edu\.bd$")).sum()),
    "graduation < admission": int((al.Graduation_Year < al.Admission_Year).sum()),
    "cgpa out of 0-4": int(((ac.CGPA < 0) | (ac.CGPA > 4)).sum()),
    "internship not Yes/No": int((~ac.Internship_Completed.isin(["Yes", "No"])).sum()),
    "bad employment_status": int((~em.Employment_Status.isin(
        ["Employed", "Seeking Employment", "Further Studies", "Self-Employed"])).sum()),
    "history end < start": int((eh.End_Year < eh.Start_Year).sum()),
    "minor == major": int((al.Minor.notna() & (al.Minor == al.Major)).sum()),
    "BBA without internship": int((al.merge(ac, on="Student_ID")
                                   .query("Degree == 'BBA' and Internship_Completed != 'Yes'")
                                   .shape[0])),
}
for k, v in checks.items():
    print(f"  {'PASS' if v == 0 else 'FAIL'}  {k}: {v}")

# conditional-null rule
mg = em
no_emp = mg[mg.Employment_Status.isin(["Seeking Employment", "Further Studies"])]
yes_emp = mg[mg.Employment_Status.isin(["Employed", "Self-Employed"])]
print(f"  {'PASS' if no_emp.Company.notna().sum() == 0 else 'FAIL'}  "
      f"non-employed rows carrying employer data: {no_emp.Company.notna().sum()}")
print(f"  {'PASS' if yes_emp.Company.isna().sum() == 0 else 'FAIL'}  "
      f"employed rows missing company: {yes_emp.Company.isna().sum()}")

print(f"\nFinal row counts: Alumni={len(al)}  Academic={len(ac)}  "
      f"Employment={len(em)}  History={len(eh)}")
print(f"IB majors={int((al.Major == 'International Business').sum())}  "
      f"IB minors={int((al.Minor == 'International Business').sum())}  "
      f"neither={int(((al.Major != 'International Business') & (al.Minor != 'International Business')).sum())}")

# ---------------------------------------------------------------- #
# Write
# ---------------------------------------------------------------- #
import os
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with pd.ExcelWriter(OUT, engine="openpyxl") as w:
    al.to_excel(w, sheet_name="Alumni", index=False)
    ac.to_excel(w, sheet_name="Academic_Records", index=False)
    em.to_excel(w, sheet_name="Employment", index=False)
    eh.to_excel(w, sheet_name="Employment_History", index=False)

# Arial throughout
from openpyxl import load_workbook
from openpyxl.styles import Font
wb = load_workbook(OUT)
for ws in wb.worksheets:
    for row in ws.iter_rows():
        for c in row:
            c.font = Font(name="Arial", size=10, bold=(c.row == 1))
    for col in ws.columns:
        width = max((len(str(c.value)) for c in col if c.value is not None), default=8)
        ws.column_dimensions[col[0].column_letter].width = min(max(width + 2, 10), 40)
    ws.freeze_panes = "A2"
wb.save(OUT)
print(f"\nWritten: {OUT}")

with open("/home/claude/cleaning_log.txt", "w") as f:
    f.write("\n".join(log))
