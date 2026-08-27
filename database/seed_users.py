"""
Create demo user accounts for the prototype.

    python database/seed_users.py                    # one admin, one faculty, 3 alumni
    python database/seed_users.py --all-alumni       # an account for every alumni record

Passwords are read from the environment so none are hardcoded:
    SEED_ADMIN_PASSWORD, SEED_FACULTY_PASSWORD, SEED_ALUMNI_PASSWORD
Falls back to a clearly-marked development default if unset. Never run with
the defaults against anything but a local prototype database.
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from app.core.db import execute, fetch_all, fetch_one, init_pool  # noqa: E402
from app.core.security import hash_password  # noqa: E402

DEV_DEFAULT = "ChangeMe-Dev-Only-123"


def upsert_user(role: str, email: str, password: str, full_name: str,
                student_id: str | None = None) -> None:
    existing = fetch_one("SELECT user_id FROM users WHERE LOWER(email) = LOWER(%s)",
                         (email,))
    if existing:
        execute(
            "UPDATE users SET password_hash = %s, status = 'active', "
            "role_code = %s, full_name = %s WHERE user_id = %s",
            (hash_password(password), role, full_name, existing["user_id"]),
        )
        print(f"  updated {role:<8} {email}")
        return

    execute(
        """
        INSERT INTO users (role_code, student_id, email, password_hash,
                           full_name, status)
        VALUES (%s, %s, %s, %s, %s, 'active')
        """,
        (role, student_id, email, hash_password(password), full_name),
    )
    print(f"  created {role:<8} {email}"
          + (f"  (student {student_id})" if student_id else ""))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all-alumni", action="store_true",
                    help="create an account for every alumni record")
    args = ap.parse_args()

    init_pool()

    admin_pw = os.getenv("SEED_ADMIN_PASSWORD", DEV_DEFAULT)
    faculty_pw = os.getenv("SEED_FACULTY_PASSWORD", DEV_DEFAULT)
    alumni_pw = os.getenv("SEED_ALUMNI_PASSWORD", DEV_DEFAULT)

    if DEV_DEFAULT in (admin_pw, faculty_pw, alumni_pw):
        print("WARNING: using the development default password for at least one "
              "account. Set SEED_*_PASSWORD in .env before any shared deployment.\n")

    print("Staff accounts:")
    upsert_user("admin", "admin@iub.edu.bd", admin_pw, "Department Admin")
    upsert_user("faculty", "faculty@iub.edu.bd", faculty_pw, "Faculty Member")

    print("\nAlumni accounts:")
    limit = "" if args.all_alumni else "LIMIT 3"
    rows = fetch_all(
        f"""
        SELECT student_id, first_name, last_name, personal_email
        FROM alumni ORDER BY alumni_id {limit}
        """
    )
    for r in rows:
        upsert_user(
            "alumni",
            r["personal_email"],
            alumni_pw,
            f"{r['first_name']} {r['last_name']}",
            student_id=r["student_id"],
        )

    counts = fetch_all(
        "SELECT role_code, count(*) AS n FROM users GROUP BY role_code ORDER BY role_code"
    )
    print("\nAccounts now in the database:")
    for c in counts:
        print(f"  {c['role_code']:<8} {c['n']}")
    print("\nAlumni sign in with their Student ID; staff sign in with their email.")


if __name__ == "__main__":
    main()
