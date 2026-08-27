"""
The verification workflow (PRD §10, docs/data_workflow.md §3).

Alumni-submitted changes are *proposals*. Nothing here writes to the official
tables except `apply_submission`, and that is only ever called from the
approve endpoint, inside the same transaction that records the audit entry.

Each submission type maps to a fixed set of columns on one table. The map is
a whitelist: a field not listed is rejected, so a crafted request body cannot
reach a column the alumnus was never meant to touch (for example role,
student_id, or alumni_id).
"""

from typing import Any

from fastapi import HTTPException, status

# submission_type -> (table, {field: column})
FIELD_MAP: dict[str, tuple[str, dict[str, str]]] = {
    "personal": ("alumni", {
        "first_name": "first_name",
        "last_name": "last_name",
    }),
    "contact": ("alumni", {
        "personal_email": "personal_email",
        "phone": "phone",
        "linkedin_url": "linkedin_url",
    }),
    "academic": ("academic_records", {
        "cgpa": "cgpa",
        "academic_honors": "academic_honors",
    }),
    "internship": ("academic_records", {
        "internship_completed": "internship_completed",
        "internship_organization": "internship_organization",
        "internship_position": "internship_position",
        "internship_industry": "internship_industry",
    }),
    "research_interest": ("academic_records", {
        "research_interest": "research_interest",
    }),
    "employment": ("employment", {
        "employment_status": "employment_status",
        "company": "company",
        "job_title": "job_title",
        "industry": "industry",
        "job_function": "job_function",
        "country": "country",
        "city": "city",
        "start_year": "start_year",
    }),
    # Appends a row rather than updating one — an alumnus can have many.
    "employment_history": ("employment_history", {
        "company": "company",
        "job_title": "job_title",
        "industry": "industry",
        "job_function": "job_function",
        "country": "country",
        "city": "city",
        "start_year": "start_year",
        "end_year": "end_year",
    }),
}

EMPLOYMENT_STATUSES = {
    "Employed", "Seeking Employment", "Further Studies", "Self-Employed",
}
EMPLOYER_FIELDS = [
    "company", "job_title", "industry", "job_function",
    "country", "city", "start_year",
]


def _bad_request(message: str, field: str | None = None):
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": "VALIDATION_ERROR", "message": message, "field": field},
    )


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #
def validate_changes(submission_type: str, changes: dict[str, Any]) -> dict[str, Any]:
    """
    Check a proposed change set against the whitelist and the business rules.

    Returns the cleaned values ready to store. Raises 400 with the offending
    field name so the frontend can highlight it inline (docs/security.md §5 —
    the backend is the real boundary; the frontend's checks are for UX).
    """
    if submission_type not in FIELD_MAP:
        raise _bad_request(
            f"Unknown submission type. Expected one of: "
            f"{', '.join(sorted(FIELD_MAP))}.",
            "submission_type",
        )

    _, allowed = FIELD_MAP[submission_type]

    unknown = set(changes) - set(allowed)
    if unknown:
        raise _bad_request(
            f"These fields can't be changed in a '{submission_type}' submission: "
            f"{', '.join(sorted(unknown))}.",
            sorted(unknown)[0],
        )

    if not changes:
        raise _bad_request("No changes were included.", "proposed_changes")

    clean: dict[str, Any] = dict(changes)

    # --- field-level rules -------------------------------------------------
    if "cgpa" in clean and clean["cgpa"] is not None:
        try:
            cgpa = float(clean["cgpa"])
        except (TypeError, ValueError):
            raise _bad_request("CGPA must be a number.", "cgpa")
        if not 0 <= cgpa <= 4:
            raise _bad_request("CGPA must be between 0.00 and 4.00.", "cgpa")
        clean["cgpa"] = round(cgpa, 2)

    if "personal_email" in clean:
        email = (clean["personal_email"] or "").strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            raise _bad_request("Enter a valid email address.", "personal_email")
        # Stored lowercase so the case-insensitive unique index behaves
        # predictably (see migration 001).
        clean["personal_email"] = email

    if "internship_completed" in clean:
        value = clean["internship_completed"]
        if isinstance(value, bool):
            clean["internship_completed"] = "Yes" if value else "No"
        elif value in ("Yes", "No"):
            pass
        else:
            raise _bad_request(
                "Internship completion must be yes or no.", "internship_completed"
            )
        if clean["internship_completed"] == "No":
            # The database check would reject details alongside 'No'; catch it
            # here so the alumnus gets a readable message instead of a 500.
            for f in ("internship_organization", "internship_position",
                      "internship_industry"):
                if clean.get(f):
                    raise _bad_request(
                        "Remove the internship details, or mark the internship "
                        "as completed.", f,
                    )

    for year_field in ("start_year", "end_year", "admission_year", "graduation_year"):
        if year_field in clean and clean[year_field] is not None:
            try:
                clean[year_field] = int(clean[year_field])
            except (TypeError, ValueError):
                raise _bad_request("Enter a four-digit year.", year_field)
            if not 1993 <= clean[year_field] <= 2100:
                raise _bad_request("That year looks incorrect.", year_field)

    if ("start_year" in clean and "end_year" in clean
            and clean["start_year"] and clean["end_year"]
            and clean["end_year"] < clean["start_year"]):
        raise _bad_request("The end year can't be before the start year.", "end_year")

    # --- employment status consistency (mirrors chk_status_employer_fields) --
    if submission_type == "employment" and "employment_status" in clean:
        emp_status = clean["employment_status"]
        if emp_status not in EMPLOYMENT_STATUSES:
            raise _bad_request(
                f"Employment status must be one of: "
                f"{', '.join(sorted(EMPLOYMENT_STATUSES))}.",
                "employment_status",
            )
        if emp_status in ("Employed", "Self-Employed"):
            if not clean.get("company"):
                raise _bad_request(
                    "Add the name of your employer.", "company"
                )
        else:
            # Not employed: employer fields must be cleared, not left stale.
            for f in EMPLOYER_FIELDS:
                clean[f] = None

    if submission_type == "employment_history" and not clean.get("company"):
        raise _bad_request(
            "Add the name of the organisation for this role.", "company"
        )

    return clean


# --------------------------------------------------------------------------- #
# Snapshot / apply
# --------------------------------------------------------------------------- #
def snapshot_current(cur, submission_type: str, student_id: str,
                     fields: list[str]) -> dict[str, Any] | None:
    """
    Read the official values the submission would replace.

    Stored on the submission so the reviewer sees what the alumnus was looking
    at, and so the audit entry can record the before state even if the record
    changes in between.
    """
    table, allowed = FIELD_MAP[submission_type]
    if table == "employment_history":
        return None  # an append has nothing it replaces

    columns = ", ".join(allowed[f] for f in fields)
    cur.execute(
        f"SELECT {columns} FROM {table} WHERE student_id = %s", (student_id,)
    )
    row = cur.fetchone()
    if row is None:
        return None
    return {k: (str(v) if hasattr(v, "quantize") else v) for k, v in row.items()}


def apply_submission(cur, submission_type: str, student_id: str,
                     values: dict[str, Any]) -> None:
    """
    Write approved values into the official tables.

    Called only from the approve endpoint, inside its transaction. If any
    database constraint rejects the write, the whole approval rolls back —
    the submission does not silently flip to Approved with nothing applied.
    """
    table, allowed = FIELD_MAP[submission_type]
    columns = {allowed[f]: v for f, v in values.items() if f in allowed}
    if not columns:
        return

    if table == "employment_history":
        columns["student_id"] = student_id
        # Surrogate key follows the dataset's HIST-NNNNN convention.
        cur.execute(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(employment_history_id FROM 6) AS INT)), 0) + 1 AS n "
            "FROM employment_history WHERE employment_history_id LIKE 'HIST-%'"
        )
        columns["employment_history_id"] = f"HIST-{cur.fetchone()['n']:05d}"
        names = ", ".join(columns)
        placeholders = ", ".join(f"%({c})s" for c in columns)
        cur.execute(
            f"INSERT INTO {table} ({names}) VALUES ({placeholders})", columns
        )
        return

    assignments = ", ".join(f"{c} = %({c})s" for c in columns)
    params = dict(columns, student_id=student_id)
    cur.execute(
        f"UPDATE {table} SET {assignments} WHERE student_id = %(student_id)s", params
    )
    if cur.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "NO_TARGET_RECORD",
                "message": "There's no record to update for this alumnus.",
            },
        )
