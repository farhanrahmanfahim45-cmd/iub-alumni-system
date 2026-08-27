"""
Load validated_data_final.xlsx into PostgreSQL.

Usage:
    python database/load_data.py                    # load
    python database/load_data.py --truncate         # wipe tables first
    python database/load_data.py --dry-run          # validate only, no writes

Reads connection settings from .env (never hardcoded — see docs/security.md §3):
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

Load order is parent-first so foreign keys resolve:
    alumni -> academic_records -> employment -> employment_history

Idempotent: re-running does not create duplicates. Rows are upserted on their
primary key, so this can be run repeatedly against the same database.
"""

import argparse
import os
import sys

import pandas as pd

DATA_FILE = os.getenv("DATA_FILE", "data/validated_data_final.xlsx")

VALID_STATUSES = {"Employed", "Seeking Employment", "Further Studies", "Self-Employed"}


# --------------------------------------------------------------------------- #
# Connection
# --------------------------------------------------------------------------- #
def get_connection():
    # Imported here, not at module level, so --dry-run works without a
    # PostgreSQL client library present.
    import psycopg
    from dotenv import load_dotenv

    load_dotenv()
    required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        sys.exit(f"Missing in .env: {', '.join(missing)}")

    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


# --------------------------------------------------------------------------- #
# Pre-load validation — never trust the spreadsheet's own status column
# --------------------------------------------------------------------------- #
def validate(al, ac, em, eh):
    """Re-check every schema constraint before touching the database."""
    errors = []
    alset = set(al.Student_ID)

    for name, df in [("academic_records", ac), ("employment", em),
                     ("employment_history", eh)]:
        orphans = set(df.Student_ID) - alset
        if orphans:
            errors.append(f"{name}: {len(orphans)} student_id values with no "
                          f"alumni row: {sorted(orphans)[:10]}")

    for col in ["Student_ID", "Alumni_ID", "Personal_Email"]:
        dups = al[al[col].duplicated()][col].tolist()
        if dups:
            errors.append(f"alumni.{col}: duplicates {dups[:10]}")

    bad = al[~al.Alumni_ID.str.match(r"^AL-\d{5}$")]
    if len(bad):
        errors.append(f"alumni.alumni_id: {len(bad)} fail ^AL-[0-9]{{5}}$")

    bad = al[~al.Personal_Email.str.match(r"^[^@]+@iub\.edu\.bd$")]
    if len(bad):
        errors.append(f"alumni.personal_email: {len(bad)} fail chk_email "
                      f"(case-sensitive) — e.g. {bad.Personal_Email.head(3).tolist()}")

    bad = al[al.Graduation_Year < al.Admission_Year]
    if len(bad):
        errors.append(f"alumni: {len(bad)} rows with graduation_year < admission_year")

    bad = ac[(ac.CGPA < 0) | (ac.CGPA > 4)]
    if len(bad):
        errors.append(f"academic_records: {len(bad)} CGPA values outside 0–4.00")

    bad = ac[~ac.Internship_Completed.isin(["Yes", "No"])]
    if len(bad):
        errors.append(f"academic_records: {len(bad)} internship_completed not Yes/No")

    bad = em[~em.Employment_Status.isin(VALID_STATUSES)]
    if len(bad):
        errors.append(f"employment: {len(bad)} invalid employment_status")

    bad = eh[eh.End_Year < eh.Start_Year]
    if len(bad):
        errors.append(f"employment_history: {len(bad)} rows with end_year < start_year")

    # Business rules the schema cannot express
    bba = al.merge(ac, on="Student_ID")
    bad = bba[(bba.Degree == "BBA") & (bba.Internship_Completed != "Yes")]
    if len(bad):
        errors.append(f"{len(bad)} BBA alumni without a completed internship "
                      f"(mandatory for BBA)")

    unemployed = em[em.Employment_Status.isin(["Seeking Employment", "Further Studies"])]
    bad = unemployed[unemployed.Company.notna()]
    if len(bad):
        errors.append(f"employment: {len(bad)} non-employed rows carry employer data")

    employed = em[em.Employment_Status.isin(["Employed", "Self-Employed"])]
    bad = employed[employed.Company.isna()]
    if len(bad):
        errors.append(f"employment: {len(bad)} employed rows missing company")

    return errors


# --------------------------------------------------------------------------- #
# Loading
# --------------------------------------------------------------------------- #
def rows_of(df, columns):
    """Yield tuples in column order, converting pandas NA to None."""
    subset = df[columns].astype(object).where(df[columns].notna(), None)
    return [tuple(r) for r in subset.itertuples(index=False, name=None)]


TABLES = [
    (
        "alumni",
        ["Student_ID", "Alumni_ID", "First_Name", "Last_Name", "Personal_Email",
         "Phone", "LinkedIn_URL", "Degree", "Major", "Minor",
         "Admission_Year", "Graduation_Year"],
        ["student_id", "alumni_id", "first_name", "last_name", "personal_email",
         "phone", "linkedin_url", "degree", "major", "minor",
         "admission_year", "graduation_year"],
        "student_id",
    ),
    (
        "academic_records",
        ["Academic_ID", "Student_ID", "CGPA", "Academic_Honors",
         "Internship_Completed", "Internship_Organization", "Internship_Position",
         "Internship_Industry", "Research_Interest"],
        ["academic_id", "student_id", "cgpa", "academic_honors",
         "internship_completed", "internship_organization", "internship_position",
         "internship_industry", "research_interest"],
        "academic_id",
    ),
    (
        "employment",
        ["Employment_ID", "Student_ID", "Employment_Status", "Company", "Job_Title",
         "Industry", "Job_Function", "Country", "City", "Start_Year"],
        ["employment_id", "student_id", "employment_status", "company", "job_title",
         "industry", "job_function", "country", "city", "start_year"],
        "employment_id",
    ),
    (
        "employment_history",
        ["Employment_History_ID", "Student_ID", "Company", "Job_Title", "Industry",
         "Job_Function", "Country", "City", "Start_Year", "End_Year"],
        ["employment_history_id", "student_id", "company", "job_title", "industry",
         "job_function", "country", "city", "start_year", "end_year"],
        "employment_history_id",
    ),
]

SHEETS = {
    "alumni": "Alumni",
    "academic_records": "Academic_Records",
    "employment": "Employment",
    "employment_history": "Employment_History",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--truncate", action="store_true",
                    help="delete all rows from the four tables before loading")
    ap.add_argument("--dry-run", action="store_true",
                    help="validate the spreadsheet and exit without writing")
    ap.add_argument("--file", default=DATA_FILE)
    args = ap.parse_args()

    xl = pd.ExcelFile(args.file)
    frames = {t: xl.parse(SHEETS[t]) for t, _, _, _ in TABLES}
    al, ac, em, eh = (frames["alumni"], frames["academic_records"],
                      frames["employment"], frames["employment_history"])

    print(f"Read {args.file}: alumni={len(al)} academic={len(ac)} "
          f"employment={len(em)} history={len(eh)}")

    errors = validate(al, ac, em, eh)
    if errors:
        print("\nValidation failed — nothing was loaded:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    print("Validation passed: all schema constraints and business rules satisfied.")

    if args.dry_run:
        print("Dry run — no database writes.")
        return

    with get_connection() as conn:
        with conn.cursor() as cur:
            if args.truncate:
                # child tables first, or the FKs block the delete
                cur.execute("TRUNCATE employment_history, employment, "
                            "academic_records, alumni CASCADE")
                print("Truncated all four tables.")

            for table, src_cols, db_cols, pk in TABLES:
                df = frames[table]
                data = rows_of(df, src_cols)
                placeholders = ", ".join(["%s"] * len(db_cols))
                updates = ", ".join(f"{c} = EXCLUDED.{c}"
                                    for c in db_cols if c != pk)
                sql = (f"INSERT INTO {table} ({', '.join(db_cols)}) "
                       f"VALUES ({placeholders}) "
                       f"ON CONFLICT ({pk}) DO UPDATE SET {updates}")
                cur.executemany(sql, data)
                print(f"  {table}: {len(data)} rows upserted")

        conn.commit()

    # Post-load verification — check the database, not the spreadsheet
    with get_connection() as conn:
        with conn.cursor() as cur:
            for table, _, _, _ in TABLES:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                print(f"  {table}: {cur.fetchone()[0]} rows in PostgreSQL")
            cur.execute("""
                SELECT COUNT(*) FROM academic_records a
                LEFT JOIN alumni al USING (student_id)
                WHERE al.student_id IS NULL
            """)
            print(f"  orphaned academic_records after load: {cur.fetchone()[0]}")

    print("\nLoad complete.")


if __name__ == "__main__":
    main()
