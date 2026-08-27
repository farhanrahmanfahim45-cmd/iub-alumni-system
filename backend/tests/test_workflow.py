"""
End-to-end tests for the verification workflow, admin writes, and auditing.

Run against a seeded database:
    cd backend
    python tests/test_workflow.py

These exercise the rule the whole system rests on: an alumni-submitted change
must not reach the official tables until an admin approves it.
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
ALUMNI2 = ("2100002", os.getenv("SEED_ALUMNI_PASSWORD", "AlumniTest123"))

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


def db_value(table, column, student_id):
    row = fetch_one(f"SELECT {column} AS v FROM {table} WHERE student_id = %s",
                    (student_id,))
    return row["v"] if row else None


def run() -> bool:
    admin_t = token(*ADMIN)
    faculty_t = token(*FACULTY)
    alumni_t = token(*ALUMNI)
    alumni2_t = token(*ALUMNI2)

    # Start from a clean slate so counts are predictable.
    execute("DELETE FROM alumni_submissions")

    print("\n=== Who may submit ===")
    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "contact",
        "proposed_changes": {"phone": "+8801711111111"},
    })
    check(r.status_code == 201, "alumnus creates a submission")
    sub_id = r.json()["data"]["submission_id"]
    check(r.json()["data"]["status"] == "Pending", "new submission starts Pending")
    check(r.json()["data"]["current_values"]["phone"] is not None,
          "submission snapshots the current value for the reviewer")

    r = client.post("/api/submissions", headers=auth(admin_t), json={
        "submission_type": "contact", "proposed_changes": {"phone": "x"}})
    check(r.status_code == 403, "admin cannot submit through the alumni queue")

    r = client.post("/api/submissions", headers=auth(faculty_t), json={
        "submission_type": "contact", "proposed_changes": {"phone": "x"}})
    check(r.status_code == 403, "faculty cannot submit")

    check(client.post("/api/submissions", json={
        "submission_type": "contact", "proposed_changes": {"phone": "x"}}
    ).status_code == 401, "submitting requires a token")

    print("\n=== The official record is untouched while Pending ===")
    check(db_value("alumni", "phone", ALUMNI[0]) != "+8801711111111",
          "phone NOT written to the alumni table while Pending")

    print("\n=== Field whitelist ===")
    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "contact",
        "proposed_changes": {"student_id": "9999999", "phone": "+880171"},
    })
    check(r.status_code == 400, "cannot smuggle student_id into a contact submission")

    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "contact", "proposed_changes": {"cgpa": 4.0}})
    check(r.status_code == 400, "cgpa rejected in a contact submission")

    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "academic", "proposed_changes": {"cgpa": 5.5}})
    check(r.status_code == 400 and r.json()["error"]["field"] == "cgpa",
          "CGPA above 4.00 rejected, with the field named")

    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "contact", "proposed_changes": {"personal_email": "not-an-email"}})
    check(r.status_code == 400, "malformed email rejected")

    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "employment",
        "proposed_changes": {"employment_status": "Employed"}})
    check(r.status_code == 400 and r.json()["error"]["field"] == "company",
          "Employed with no company rejected before it reaches the database")

    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "employment",
        "proposed_changes": {"employment_status": "Retired", "company": "X"}})
    check(r.status_code == 400, "invalid employment status rejected")

    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "nonsense", "proposed_changes": {"a": 1}})
    check(r.status_code == 400, "unknown submission type rejected")

    print("\n=== Queue visibility ===")
    r = client.get("/api/submissions", headers=auth(admin_t))
    check(r.status_code == 200, "admin sees the queue")
    admin_total = r.json()["meta"]["total_records"]

    r = client.get("/api/submissions", headers=auth(alumni2_t))
    check(all(s["student_id"] == ALUMNI2[0] for s in r.json()["data"]),
          "alumnus sees only their own submissions")
    check(r.json()["meta"]["total_records"] < admin_total,
          "alumnus does not see the whole queue")

    check(client.get("/api/submissions", headers=auth(faculty_t)).status_code == 403,
          "faculty cannot see the queue")
    check(client.get(f"/api/submissions/{sub_id}",
                     headers=auth(alumni2_t)).status_code == 403,
          "alumnus cannot open another's submission")

    print("\n=== Approve writes through ===")
    before_phone = db_value("alumni", "phone", ALUMNI[0])
    r = client.put(f"/api/submissions/{sub_id}/approve", headers=auth(admin_t),
                   json={"note": "Verified by phone."})
    check(r.status_code == 200, "admin approves")
    check(r.json()["data"]["status"] == "Approved", "status becomes Approved")
    check(db_value("alumni", "phone", ALUMNI[0]) == "+8801711111111",
          "approved value IS now in the alumni table")
    check(before_phone != "+8801711111111", "…and it wasn't there before")

    r = client.put(f"/api/submissions/{sub_id}/approve", headers=auth(admin_t), json={})
    check(r.status_code == 409, "approving twice is rejected")

    print("\n=== Only admins review ===")
    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "research_interest",
        "proposed_changes": {"research_interest": "Trade Policy"}})
    pending_id = r.json()["data"]["submission_id"]

    check(client.put(f"/api/submissions/{pending_id}/approve",
                     headers=auth(faculty_t), json={}).status_code == 403,
          "faculty cannot approve")
    check(client.put(f"/api/submissions/{pending_id}/approve",
                     headers=auth(alumni_t), json={}).status_code == 403,
          "an alumnus cannot approve their own submission")

    print("\n=== Reject leaves the record alone ===")
    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "academic", "proposed_changes": {"cgpa": 4.0}})
    reject_id = r.json()["data"]["submission_id"]
    cgpa_before = db_value("academic_records", "cgpa", ALUMNI[0])

    r = client.put(f"/api/submissions/{reject_id}/reject", headers=auth(admin_t),
                   json={"reason": "CGPA doesn't match the transcript."})
    check(r.status_code == 200 and r.json()["data"]["status"] == "Rejected",
          "admin rejects with a reason")
    check(db_value("academic_records", "cgpa", ALUMNI[0]) == cgpa_before,
          "rejected value NOT written to the academic record")
    check(r.json()["data"]["review_note"] is not None,
          "the reason is stored for the alumnus to read")

    r = client.put(f"/api/submissions/{pending_id}/reject", headers=auth(admin_t),
                   json={})
    check(r.status_code == 400, "rejecting without a reason is refused")

    print("\n=== Correction round trip ===")
    r = client.put(f"/api/submissions/{pending_id}/request-correction",
                   headers=auth(admin_t),
                   json={"comments": "Please be more specific."})
    check(r.status_code == 200 and r.json()["data"]["status"] == "Correction Required",
          "admin sends a submission back")

    r = client.put(f"/api/submissions/{pending_id}", headers=auth(alumni2_t),
                   json={"proposed_changes": {"research_interest": "X"}})
    check(r.status_code == 403, "another alumnus cannot edit it")

    r = client.put(f"/api/submissions/{pending_id}", headers=auth(alumni_t),
                   json={"proposed_changes": {"research_interest": "Trade Policy in South Asia"}})
    check(r.status_code == 200 and r.json()["data"]["status"] == "Pending",
          "owner corrects and it returns to Pending")
    check(r.json()["data"]["review_note"] is None,
          "the previous review note is cleared on resubmission")

    r = client.put(f"/api/submissions/{reject_id}", headers=auth(alumni_t),
                   json={"proposed_changes": {"cgpa": 3.9}})
    check(r.status_code == 409, "a rejected submission cannot be reopened")

    r = client.put(f"/api/submissions/{pending_id}/approve", headers=auth(admin_t),
                   json={})
    check(r.status_code == 200, "the corrected submission can then be approved")
    check(db_value("academic_records", "research_interest", ALUMNI[0])
          == "Trade Policy in South Asia", "corrected value written through")

    print("\n=== employment_history appends rather than overwrites ===")
    n_before = fetch_one(
        "SELECT COUNT(*) AS n FROM employment_history WHERE student_id = %s",
        (ALUMNI[0],))["n"]
    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "employment_history",
        "proposed_changes": {"company": "Former Employer Ltd.", "job_title": "Analyst",
                             "start_year": 2019, "end_year": 2021},
    })
    hist_id = r.json()["data"]["submission_id"]
    client.put(f"/api/submissions/{hist_id}/approve", headers=auth(admin_t), json={})
    n_after = fetch_one(
        "SELECT COUNT(*) AS n FROM employment_history WHERE student_id = %s",
        (ALUMNI[0],))["n"]
    check(n_after == n_before + 1, "a history row is added, not replaced")

    print("\n=== Admin direct edits ===")
    r = client.put(f"/api/alumni/{ALUMNI2[0]}", headers=auth(admin_t),
                   json={"phone": "+8801799999999"})
    check(r.status_code == 200, "admin edits a record directly")
    check(db_value("alumni", "phone", ALUMNI2[0]) == "+8801799999999",
          "the direct edit is applied immediately")

    check(client.put(f"/api/alumni/{ALUMNI2[0]}", headers=auth(faculty_t),
                     json={"phone": "x"}).status_code == 403,
          "faculty cannot edit records")
    check(client.put(f"/api/alumni/{ALUMNI2[0]}", headers=auth(alumni_t),
                     json={"phone": "x"}).status_code == 403,
          "an alumnus cannot edit through the admin endpoint")

    r = client.put(f"/api/alumni/{ALUMNI2[0]}/academic", headers=auth(admin_t),
                   json={"cgpa": 9.9})
    check(r.status_code == 400, "admin edits are validated too — CGPA 9.9 refused")

    r = client.put(f"/api/alumni/{ALUMNI2[0]}", headers=auth(admin_t),
                   json={"alumni_id": "AL-99999"})
    check(r.status_code == 400, "admin cannot rewrite alumni_id through this endpoint")

    print("\n=== Soft delete ===")
    r = client.delete(f"/api/alumni/{ALUMNI2[0]}", headers=auth(admin_t))
    check(r.status_code == 200 and r.json()["data"]["record_status"] == "deactivated",
          "admin deactivates a record")
    check(fetch_one("SELECT 1 FROM alumni WHERE student_id = %s",
                    (ALUMNI2[0],)) is not None,
          "the row still exists — it's a soft delete")

    r = client.get("/api/alumni?page_size=100", headers=auth(admin_t))
    check(r.json()["meta"]["total_records"] == 499,
          "deactivated records drop out of the directory (499 of 500)")

    r = client.get("/api/alumni?include_inactive=true", headers=auth(admin_t))
    check(r.json()["meta"]["total_records"] == 500,
          "…but are still reachable with include_inactive")

    check(client.delete(f"/api/alumni/{ALUMNI2[0]}",
                        headers=auth(admin_t)).status_code == 409,
          "deactivating twice is rejected")

    r = client.put(f"/api/alumni/{ALUMNI2[0]}/reactivate", headers=auth(admin_t))
    check(r.status_code == 200, "deactivation is reversible")
    check(client.get("/api/alumni", headers=auth(admin_t)
                     ).json()["meta"]["total_records"] == 500,
          "the record returns to the directory")

    print("\n=== Audit trail ===")
    r = client.get("/api/audit-logs", headers=auth(admin_t))
    check(r.status_code == 200, "admin reads the audit log")
    entries = r.json()["data"]
    check(len(entries) > 0, "actions were recorded")

    actions = [e["action"] for e in entries]
    approved = next(e for e in entries if "Approved" in e["action"])
    check(any("Approved" in a for a in actions), "approvals are logged")
    check(any("Rejected" in a for a in actions), "rejections are logged")
    check(any("Requested correction" in a for a in actions),
          "correction requests are logged")
    check(any("Updated alumni record" in a for a in actions),
          "direct edits are logged")
    check(any("Deactivated" in a for a in actions), "deactivations are logged")

    # An update-type approval records what it replaced. An employment_history
    # approval is an append, so it correctly has no "before" state.
    updates = [e for e in entries
               if "Approved" in e["action"] and "employment_history" not in e["action"]]
    check(updates and updates[0]["old_values"] is not None
          and updates[0]["new_values"] is not None,
          "an update approval records both the before and after values")
    appends = [e for e in entries if "Approved employment_history" in e["action"]]
    check(appends and appends[0]["old_values"] is None,
          "an append approval records no before state — it replaced nothing")
    check(approved["actor_email"] == ADMIN[0], "the acting admin is recorded")

    r = client.get(f"/api/audit-logs?record={ALUMNI[0]}", headers=auth(admin_t))
    check(all(e["record_id"] == ALUMNI[0] for e in r.json()["data"]),
          "audit log filters by record")

    check(client.get("/api/audit-logs", headers=auth(faculty_t)).status_code == 403,
          "faculty cannot read the audit log")
    check(client.get("/api/audit-logs", headers=auth(alumni_t)).status_code == 403,
          "alumni cannot read the audit log")

    print("\n=== Audit log is append-only ===")
    audit_id = entries[0]["audit_id"]
    try:
        execute("UPDATE audit_logs SET action = 'tampered' WHERE audit_id = %s",
                (audit_id,))
        tampered = True
    except Exception:
        tampered = False
    check(not tampered, "a direct UPDATE on audit_logs is blocked by the database")

    try:
        execute("DELETE FROM audit_logs WHERE audit_id = %s", (audit_id,))
        deleted = True
    except Exception:
        deleted = False
    check(not deleted, "a direct DELETE on audit_logs is blocked")

    print("\n=== Atomicity ===")
    # A submission whose value the database will reject must leave both the
    # record and the submission unchanged.
    r = client.post("/api/submissions", headers=auth(alumni_t), json={
        "submission_type": "personal",
        "proposed_changes": {"first_name": "X" * 150},
    })
    bad_id = r.json()["data"]["submission_id"]
    name_before = db_value("alumni", "first_name", ALUMNI[0])
    r = client.put(f"/api/submissions/{bad_id}/approve", headers=auth(admin_t), json={})
    check(r.status_code >= 400, "an over-length value is refused at approval")
    check(db_value("alumni", "first_name", ALUMNI[0]) == name_before,
          "the record is unchanged after the failed approval")
    state = fetch_one("SELECT status FROM alumni_submissions WHERE submission_id = %s",
                      (bad_id,))["status"]
    check(state == "Pending",
          "the submission stays Pending — it did not flip to Approved with nothing applied")

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
