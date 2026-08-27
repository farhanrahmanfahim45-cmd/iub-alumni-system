"""
End-to-end tests for the analytics dashboards, data quality panel,
user management, and alumni registration.

    cd backend
    python tests/test_dashboard.py

The dashboard figures are checked against counts computed independently in
SQL, so a wrong GROUP BY or a join that multiplies rows is caught rather than
merely returning a plausible-looking number.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402

from app.core.db import execute, fetch_one  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)

ADMIN = ("admin@iub.edu.bd", os.getenv("SEED_ADMIN_PASSWORD", "AdminTest123"))
FACULTY = ("faculty@iub.edu.bd", os.getenv("SEED_FACULTY_PASSWORD", "FacultyTest123"))
ALUMNI = ("2000001", os.getenv("SEED_ALUMNI_PASSWORD", "AlumniTest123"))

results: list[tuple[bool, str]] = []


def check(condition, label: str) -> None:
    results.append((bool(condition), label))
    print(f"  {'PASS' if condition else 'FAIL'}  {label}")


def token(identifier, password):
    r = client.post("/api/auth/login",
                    json={"identifier": identifier, "password": password})
    return r.json()["data"]["access_token"] if r.status_code == 200 else None


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def sql(query, params=()):
    return fetch_one(query, params)["v"]


def run() -> bool:
    admin_t = token(*ADMIN)
    faculty_t = token(*FACULTY)
    alumni_t = token(*ALUMNI)

    print("\n=== Dashboard access ===")
    check(client.get("/api/dashboard/overview").status_code == 401,
          "dashboards require a token")
    check(client.get("/api/dashboard/overview",
                     headers=auth(alumni_t)).status_code == 403,
          "alumni cannot read dashboards")
    check(client.get("/api/dashboard/overview",
                     headers=auth(faculty_t)).status_code == 200,
          "faculty can read the academic dashboard")
    check(client.get("/api/dashboard/data-quality",
                     headers=auth(faculty_t)).status_code == 403,
          "faculty cannot read the data-quality panel (admin only)")

    print("\n=== Dashboard 1 — KPIs match the database ===")
    r = client.get("/api/dashboard/overview", headers=auth(admin_t))
    check(r.status_code == 200, "overview responds")
    k = r.json()["data"]["kpis"]

    check(k["total_alumni"] == sql(
        "SELECT COUNT(*) AS v FROM alumni WHERE record_status='active'"),
        f"total_alumni matches SQL ({k['total_alumni']})")
    check(k["ib_majors"] == sql(
        "SELECT COUNT(*) AS v FROM alumni WHERE record_status='active' "
        "AND major='International Business'"),
        f"ib_majors matches SQL ({k['ib_majors']})")
    check(k["ib_minors"] == sql(
        "SELECT COUNT(*) AS v FROM alumni WHERE record_status='active' "
        "AND minor='International Business'"),
        f"ib_minors matches SQL ({k['ib_minors']})")
    check(abs(k["average_cgpa"] - float(sql(
        "SELECT ROUND(AVG(cgpa),2) AS v FROM academic_records ac "
        "JOIN alumni a USING (student_id) WHERE a.record_status='active'"))) < 0.01,
        f"average_cgpa matches SQL ({k['average_cgpa']})")
    check(0 < k["internship_completion_rate"] <= 1,
          f"internship_completion_rate is a proportion ({k['internship_completion_rate']})")

    print("\n=== Dashboard 1 — charts are internally consistent ===")
    charts = r.json()["data"]["charts"]
    check(sum(c["count"] for c in charts["degree_distribution"]) == k["total_alumni"],
          "degree_distribution sums to total_alumni")
    check(sum(c["count"] for c in charts["major_distribution"]) == k["total_alumni"],
          "major_distribution sums to total_alumni")
    check(sum(c["count"] for c in charts["minor_distribution"]) < k["total_alumni"],
          "minor_distribution excludes alumni with no minor")
    check(all(c["minor"] is not None for c in charts["minor_distribution"]),
          "…and contains no null category")
    check(sum(c["count"] for c in charts["alumni_by_graduation_year"]) == k["total_alumni"],
          "alumni_by_graduation_year sums to total_alumni")
    check(len(charts["cgpa_distribution"]) > 1, "cgpa_distribution is bucketed")
    check(sum(c["count"] for c in charts["cgpa_distribution"]) == k["total_alumni"],
          "cgpa_distribution sums to total_alumni")

    ib_major_count = next(c["count"] for c in charts["major_distribution"]
                          if c["major"] == "International Business")
    check(ib_major_count == k["ib_majors"],
          "the IB slice of major_distribution equals the IB majors KPI")

    print("\n=== Dashboard 1 — filters ===")
    r = client.get("/api/dashboard/overview?degree=BBA", headers=auth(admin_t))
    bba = r.json()["data"]["kpis"]["total_alumni"]
    check(bba == sql("SELECT COUNT(*) AS v FROM alumni "
                     "WHERE record_status='active' AND degree='BBA'"),
          f"degree=BBA filters the KPI ({bba})")
    check(bba < k["total_alumni"], "…and it is fewer than the unfiltered total")
    check(all(c["degree"] == "BBA"
              for c in r.json()["data"]["charts"]["degree_distribution"]),
          "the filter reaches the charts, not just the KPIs")

    r = client.get("/api/dashboard/overview?graduation_year=2025&degree=BBA",
                   headers=auth(admin_t))
    check(r.json()["data"]["kpis"]["total_alumni"] == sql(
        "SELECT COUNT(*) AS v FROM alumni WHERE record_status='active' "
        "AND degree='BBA' AND graduation_year=2025"),
        "two filters combine correctly")

    r = client.get("/api/dashboard/overview?degree=NoSuchDegree",
                   headers=auth(admin_t))
    check(r.status_code == 200 and r.json()["data"]["kpis"]["total_alumni"] == 0,
          "a filter matching nothing returns zeroes, not an error")
    check(r.json()["data"]["kpis"]["average_cgpa"] is None,
          "…and average_cgpa is null rather than a divide-by-zero")

    print("\n=== Dashboard 2 — career landscape ===")
    r = client.get("/api/dashboard/career", headers=auth(admin_t))
    check(r.status_code == 200, "career dashboard responds")
    ck = r.json()["data"]["kpis"]
    cc = r.json()["data"]["charts"]

    for label, status_value in [("employed", "Employed"),
                                ("seeking_employment", "Seeking Employment"),
                                ("further_studies", "Further Studies"),
                                ("self_employed", "Self-Employed")]:
        expected = sql(
            "SELECT COUNT(*) AS v FROM employment e JOIN alumni a USING (student_id) "
            "WHERE a.record_status='active' AND e.employment_status = %s",
            (status_value,))
        check(ck[label] == expected, f"{label} matches SQL ({ck[label]})")

    check(ck["employed"] + ck["seeking_employment"] + ck["further_studies"]
          + ck["self_employed"] == ck["total_alumni"],
          "the four status KPIs sum to the total")
    check(abs(sum(c["percentage"] for c in cc["career_snapshot"]) - 100.0) < 0.2,
          "career_snapshot percentages sum to 100")

    check(sum(c["count"] for c in cc["employment_by_industry"])
          == ck["employed"] + ck["self_employed"],
          "employment_by_industry covers only alumni with an employer")
    check(len(cc["top_employers"]) <= 10, "top_employers respects the default limit")
    check(cc["top_employers"][0]["count"] >= cc["top_employers"][-1]["count"],
          "top_employers is sorted by count descending")

    r2 = client.get("/api/dashboard/career?top_n=3", headers=auth(admin_t))
    check(len(r2.json()["data"]["charts"]["top_employers"]) == 3,
          "top_n controls the employer list length")

    check(all(c["roles_held"] >= 1 for c in cc["career_progression"]),
          "career_progression counts at least the current role")

    r = client.get("/api/dashboard/career?industry=Banking", headers=auth(admin_t))
    check(all(c["industry"] == "Banking"
              for c in r.json()["data"]["charts"]["employment_by_industry"]),
          "industry filter applies")

    r = client.get("/api/dashboard/career?employment_status=Further Studies",
                   headers=auth(admin_t))
    fs = r.json()["data"]["kpis"]
    check(fs["employed"] == 0 and fs["further_studies"] == fs["total_alumni"],
          "employment_status filter isolates one status")

    print("\n=== Dashboards react to data changes ===")
    before = client.get("/api/dashboard/overview",
                        headers=auth(admin_t)).json()["data"]["kpis"]["total_alumni"]
    client.delete("/api/alumni/2100002", headers=auth(admin_t))
    after = client.get("/api/dashboard/overview",
                       headers=auth(admin_t)).json()["data"]["kpis"]["total_alumni"]
    check(after == before - 1, "deactivating a record drops it from the KPI")
    client.put("/api/alumni/2100002/reactivate", headers=auth(admin_t))
    restored = client.get("/api/dashboard/overview",
                          headers=auth(admin_t)).json()["data"]["kpis"]["total_alumni"]
    check(restored == before, "reactivating restores it — dashboards are live")

    print("\n=== Data quality ===")
    r = client.get("/api/dashboard/data-quality", headers=auth(admin_t))
    check(r.status_code == 200, "admin reads the data-quality panel")
    dq = r.json()["data"]
    for field in ["incomplete_profiles", "pending_verification",
                  "potential_duplicates", "missing_employment_info",
                  "missing_cgpa", "bba_without_internship",
                  "deactivated_records", "unclaimed_profiles"]:
        check(field in dq and isinstance(dq[field], int), f"{field} reported")

    check(dq["bba_without_internship"] == 0,
          "no BBA alumni are missing an internship (the cleaned dataset holds)")
    check(dq["missing_employment_info"] == 0,
          "every active alumnus has an employment record")
    check(dq["unclaimed_profiles"] == sql(
        "SELECT COUNT(*) AS v FROM alumni a WHERE a.record_status='active' "
        "AND NOT EXISTS (SELECT 1 FROM users u WHERE u.student_id=a.student_id)"),
        f"unclaimed_profiles matches SQL ({dq['unclaimed_profiles']})")

    execute("DELETE FROM alumni_submissions")
    client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "research_interest",
        "proposed_changes": {"research_interest": "Trade Policy"}})
    dq2 = client.get("/api/dashboard/data-quality",
                     headers=auth(admin_t)).json()["data"]
    check(dq2["pending_verification"] == 1,
          "a new submission appears in pending_verification")

    print("\n=== User management ===")
    check(client.get("/api/users", headers=auth(faculty_t)).status_code == 403,
          "faculty cannot list users")
    check(client.get("/api/users", headers=auth(alumni_t)).status_code == 403,
          "alumni cannot list users")

    r = client.get("/api/users", headers=auth(admin_t))
    check(r.status_code == 200, "admin lists users")
    check(all("password_hash" not in u for u in r.json()["data"]),
          "password hashes are never returned")

    r = client.get("/api/users?role=alumni", headers=auth(admin_t))
    check(all(u["role"] == "alumni" for u in r.json()["data"]),
          "role filter works")

    execute("DELETE FROM users WHERE email = 'newfaculty@iub.edu.bd'")
    r = client.post("/api/users", headers=auth(admin_t), json={
        "email": "newfaculty@iub.edu.bd", "full_name": "New Faculty",
        "role": "faculty", "password": "ATempPassword123"})
    check(r.status_code == 201, "admin creates a faculty account")
    new_id = r.json()["data"]["user_id"]
    check(token("newfaculty@iub.edu.bd", "ATempPassword123") is not None,
          "the new account can sign in")

    r = client.post("/api/users", headers=auth(admin_t), json={
        "email": "newfaculty@iub.edu.bd", "full_name": "Dup",
        "role": "faculty", "password": "ATempPassword123"})
    check(r.status_code == 409, "duplicate email rejected")

    r = client.post("/api/users", headers=auth(admin_t), json={
        "email": "x@iub.edu.bd", "full_name": "X",
        "role": "alumni", "password": "ATempPassword123"})
    check(r.status_code == 400, "alumni accounts cannot be created here")

    r = client.post("/api/users", headers=auth(admin_t), json={
        "email": "short@iub.edu.bd", "full_name": "X",
        "role": "faculty", "password": "short"})
    check(r.status_code == 400, "a too-short password is rejected")

    r = client.put(f"/api/users/{new_id}", headers=auth(admin_t),
                   json={"status": "deactivated"})
    check(r.status_code == 200, "admin deactivates an account")
    check(token("newfaculty@iub.edu.bd", "ATempPassword123") is None,
          "a deactivated account cannot sign in")

    admin_id = fetch_one("SELECT user_id AS v FROM users WHERE email = %s",
                         (ADMIN[0],))["v"]
    r = client.put(f"/api/users/{admin_id}", headers=auth(admin_t),
                   json={"status": "deactivated"})
    check(r.status_code == 409, "an admin cannot deactivate their own account")

    alumni_user_id = fetch_one(
        "SELECT user_id AS v FROM users WHERE student_id = %s", (ALUMNI[0],))["v"]
    r = client.put(f"/api/users/{alumni_user_id}", headers=auth(admin_t),
                   json={"role": "admin"})
    check(r.status_code == 409, "an alumni account cannot be promoted to staff")

    print("\n=== Alumni registration ===")
    execute("DELETE FROM users WHERE email = 'claimant@example.com'")
    unclaimed = fetch_one(
        "SELECT a.student_id AS v FROM alumni a WHERE a.record_status='active' "
        "AND NOT EXISTS (SELECT 1 FROM users u WHERE u.student_id=a.student_id) "
        "LIMIT 1")["v"]

    r = client.post("/api/auth/register", json={
        "student_id": unclaimed, "email": "claimant@example.com",
        "password": "AGoodPassword123"})
    check(r.status_code == 201, "an alumnus can claim their record")
    created = fetch_one("SELECT status AS v FROM users WHERE student_id = %s",
                        (unclaimed,))
    check(created and created["v"] == "pending_verification",
          "the account starts as pending_verification, not active")
    check(token(unclaimed, "AGoodPassword123") is None,
          "a pending account cannot sign in until an admin activates it")

    r2 = client.post("/api/auth/register", json={
        "student_id": "9999999", "email": "nobody@example.com",
        "password": "AGoodPassword123"})
    check(r2.status_code == 201, "an unknown Student ID returns the same status")
    check(r2.json()["data"]["message"] == r.json()["data"]["message"],
          "…and the same message — registration can't be used to test which IDs exist")
    check(fetch_one("SELECT 1 AS v FROM users WHERE email = 'nobody@example.com'") is None,
          "…but no account is actually created")

    r = client.post("/api/auth/register", json={
        "student_id": unclaimed, "email": "another@example.com",
        "password": "AGoodPassword123"})
    check(fetch_one("SELECT COUNT(*) AS v FROM users WHERE student_id = %s",
                    (unclaimed,))["v"] == 1,
          "a record can only be claimed once")

    execute("UPDATE users SET status='active' WHERE student_id = %s", (unclaimed,))
    check(token(unclaimed, "AGoodPassword123") is not None,
          "once activated, the alumnus can sign in")

    # Clean up the accounts this suite created.
    execute("DELETE FROM users WHERE email IN "
            "('claimant@example.com', 'newfaculty@iub.edu.bd')")
    execute("DELETE FROM alumni_submissions")

    passed = sum(1 for ok, _ in results if ok)
    print(f"\n{'=' * 56}\n{passed}/{len(results)} checks passed")
    failed = [label for ok, label in results if not ok]
    if failed:
        print("\nFailures:")
        for label in failed:
            print(f"  - {label}")
    return not failed


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
