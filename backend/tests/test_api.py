"""
End-to-end API tests.

Run with a seeded database available:
    cd backend
    python -m pytest tests/ -v          (or: python tests/test_api.py)

These test the security boundaries, not just the happy path — every check
below corresponds to a rule in docs/security.md.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)

ADMIN = ("admin@iub.edu.bd", os.getenv("SEED_ADMIN_PASSWORD", "AdminTest123"))
FACULTY = ("faculty@iub.edu.bd", os.getenv("SEED_FACULTY_PASSWORD", "FacultyTest123"))
ALUMNI = ("2000001", os.getenv("SEED_ALUMNI_PASSWORD", "AlumniTest123"))
OTHER_ALUMNI_ID = "2100002"

results: list[tuple[bool, str]] = []


def check(condition: bool, label: str) -> None:
    results.append((bool(condition), label))
    print(f"  {'PASS' if condition else 'FAIL'}  {label}")


def token(identifier: str, password: str) -> str | None:
    r = client.post("/api/auth/login",
                    json={"identifier": identifier, "password": password})
    if r.status_code != 200:
        return None
    return r.json()["data"]["access_token"]


def auth(tok: str) -> dict:
    return {"Authorization": f"Bearer {tok}"}


def run() -> bool:
    print("\n=== Authentication ===")
    r = client.post("/api/auth/login",
                    json={"identifier": ADMIN[0], "password": ADMIN[1]})
    check(r.status_code == 200, "admin logs in with email")
    admin_tok = r.json()["data"]["access_token"]
    check(r.json()["data"]["role"] == "admin", "login returns the correct role")

    r = client.post("/api/auth/login",
                    json={"identifier": ALUMNI[0], "password": ALUMNI[1]})
    check(r.status_code == 200, "alumnus logs in with Student ID")
    alumni_tok = r.json()["data"]["access_token"]
    check(r.json()["data"]["alumni_id"] == "AL-00001",
          "login resolves the alumni_id")

    faculty_tok = token(*FACULTY)
    check(faculty_tok is not None, "faculty logs in with email")

    r = client.post("/api/auth/login",
                    json={"identifier": ADMIN[0], "password": "wrong"})
    check(r.status_code == 401, "wrong password rejected")

    r = client.post("/api/auth/login",
                    json={"identifier": "nobody@nowhere.com", "password": "x"})
    check(r.status_code == 401, "unknown account rejected")
    check(r.json()["error"]["code"] == "INVALID_CREDENTIALS",
          "same error code for unknown account as for wrong password")

    print("\n=== Unauthenticated access ===")
    check(client.get("/api/alumni").status_code == 401,
          "directory requires a token")
    check(client.get(f"/api/alumni/{ALUMNI[0]}").status_code == 401,
          "profile requires a token")
    check(client.get("/api/alumni", headers=auth("not-a-real-token")).status_code == 401,
          "garbage token rejected")

    print("\n=== Directory (faculty/admin only) ===")
    r = client.get("/api/alumni", headers=auth(faculty_tok))
    check(r.status_code == 200, "faculty can read the directory")
    body = r.json()
    check(body["meta"]["total_records"] == 500, "directory reports 500 records")
    check(len(body["data"]) == 25, "default page size is 25")

    row = body["data"][0]
    check("personal_email" not in row and "phone" not in row,
          "directory rows never include personal_email or phone")

    r = client.get("/api/alumni", headers=auth(alumni_tok))
    check(r.status_code == 403, "alumni cannot read the directory")

    print("\n=== Directory search and filters ===")
    r = client.get("/api/alumni?degree=BBA", headers=auth(admin_tok))
    check(r.json()["meta"]["total_records"] == 378,
          "degree=BBA returns 378 (367 original + 11 restored)")

    r = client.get("/api/alumni?major=International Business", headers=auth(admin_tok))
    check(r.json()["meta"]["total_records"] == 267, "major=IB returns 267")

    r = client.get("/api/alumni?minor=International Business", headers=auth(admin_tok))
    check(r.json()["meta"]["total_records"] == 106, "minor=IB returns 106")

    r = client.get("/api/alumni?employment_status=Employed", headers=auth(admin_tok))
    check(r.json()["meta"]["total_records"] == 399, "employment_status=Employed returns 399")

    r = client.get("/api/alumni?graduation_year=2025&degree=BBA", headers=auth(admin_tok))
    check(r.status_code == 200 and r.json()["meta"]["total_records"] > 0,
          "two filters combine")

    r = client.get("/api/alumni?name=abdullah", headers=auth(admin_tok))
    check(r.json()["meta"]["total_records"] > 0, "name search is case-insensitive")

    r = client.get("/api/alumni?company=Daraz", headers=auth(admin_tok))
    check(r.json()["meta"]["total_records"] == 16, "company search returns 16 for Daraz")

    r = client.get("/api/alumni?page=2&page_size=10", headers=auth(admin_tok))
    check(r.json()["meta"]["page"] == 2 and len(r.json()["data"]) == 10,
          "pagination works")

    r = client.get("/api/alumni?page_size=500", headers=auth(admin_tok))
    check(r.status_code == 400, "page_size above the 100 cap is rejected")

    print("\n=== Profile access ===")
    r = client.get(f"/api/alumni/{ALUMNI[0]}", headers=auth(alumni_tok))
    check(r.status_code == 200, "alumnus reads their own profile")
    profile = r.json()["data"]
    check(profile["personal_email"] is not None,
          "own profile includes their contact details")
    check(profile["academic"]["internship_completed"] is True,
          "internship_completed exposed as a boolean, not 'Yes'")
    check(isinstance(profile["employment_history"], list),
          "employment_history included in the profile")

    r = client.get(f"/api/alumni/{OTHER_ALUMNI_ID}", headers=auth(alumni_tok))
    check(r.status_code == 403, "alumnus CANNOT read another alumnus's profile")

    r = client.get(f"/api/alumni/{OTHER_ALUMNI_ID}", headers=auth(faculty_tok))
    check(r.status_code == 200, "faculty reads any profile")
    check(r.json()["data"]["personal_email"] is None,
          "faculty does NOT see personal_email (most-restrictive default)")
    check(r.json()["data"]["phone"] is None, "faculty does NOT see phone")
    check(r.json()["data"]["contact_details_visible"] is False,
          "contact_details_visible flag tells the UI to hide the section")

    r = client.get(f"/api/alumni/{OTHER_ALUMNI_ID}", headers=auth(admin_tok))
    check(r.json()["data"]["personal_email"] is not None,
          "admin sees personal_email")

    r = client.get("/api/alumni/9999999", headers=auth(admin_tok))
    check(r.status_code == 404, "unknown student_id returns 404")

    print("\n=== Sub-resources ===")
    r = client.get(f"/api/alumni/{ALUMNI[0]}/academic", headers=auth(alumni_tok))
    check(r.status_code == 200 and r.json()["data"]["cgpa"] is not None,
          "own academic record readable")
    check(client.get(f"/api/alumni/{OTHER_ALUMNI_ID}/academic",
                     headers=auth(alumni_tok)).status_code == 403,
          "another alumnus's academic record blocked")

    r = client.get(f"/api/alumni/{ALUMNI[0]}/employment", headers=auth(alumni_tok))
    check(r.status_code == 200 and "employment_status" in r.json()["data"],
          "own employment readable")

    r = client.get(f"/api/alumni/{ALUMNI[0]}/employment-history",
                   headers=auth(faculty_tok))
    check(r.status_code == 200 and isinstance(r.json()["data"], list),
          "employment history readable by faculty")

    # An alumnus with no history rows must return [], not 404.
    r = client.get("/api/alumni?page_size=100", headers=auth(admin_tok))
    empty_found = False
    for candidate in r.json()["data"][:40]:
        h = client.get(f"/api/alumni/{candidate['student_id']}/employment-history",
                       headers=auth(admin_tok))
        if h.status_code == 200 and h.json()["data"] == []:
            empty_found = True
            break
    check(empty_found, "alumnus with no history returns an empty list, not 404")

    print("\n=== /me and health ===")
    r = client.get("/api/auth/me", headers=auth(alumni_tok))
    check(r.json()["data"]["student_id"] == ALUMNI[0],
          "/me returns the alumnus's student_id")
    r = client.get("/api/auth/me", headers=auth(faculty_tok))
    check(r.json()["data"]["student_id"] is None,
          "/me returns no student_id for staff")
    check(client.get("/api/health").json()["status"] == "ok", "health check responds")

    passed = sum(1 for ok, _ in results if ok)
    print(f"\n{'=' * 52}\n{passed}/{len(results)} checks passed")
    failed = [label for ok, label in results if not ok]
    if failed:
        print("\nFailures:")
        for label in failed:
            print(f"  - {label}")
    return not failed


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
