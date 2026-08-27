"""
Request and response models.

Field names are snake_case to match both the database and docs/api_spec.md.
Optional fields default to None so a partial record (no minor, no honours,
no employer) serialises cleanly rather than erroring.
"""

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, EmailStr, Field

T = TypeVar("T")


# --------------------------------------------------------------------------- #
# Envelopes (docs/api_spec.md §1.3)
# --------------------------------------------------------------------------- #
class PageMeta(BaseModel):
    page: int
    page_size: int
    total_records: int
    total_pages: int


class Envelope(BaseModel, Generic[T]):
    data: T
    meta: dict[str, Any] | None = None


class PagedEnvelope(BaseModel, Generic[T]):
    data: list[T]
    meta: PageMeta


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
class LoginRequest(BaseModel):
    # Student ID for alumni, email for faculty/admin.
    identifier: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    expires_in: int
    student_id: str | None = None
    alumni_id: str | None = None
    full_name: str | None = None


class MeResponse(BaseModel):
    user_id: int
    role: str
    email: str
    student_id: str | None = None


# --------------------------------------------------------------------------- #
# Alumni
# --------------------------------------------------------------------------- #
class DirectoryRow(BaseModel):
    """
    A row in the Alumni Directory (PRD §11).

    Deliberately excludes personal_email and phone — restricted fields never
    appear in list responses regardless of role (docs/security.md §4).
    """

    student_id: str
    alumni_id: str
    name: str
    degree: str
    major: str
    minor: str | None = None
    graduation_year: int | None = None
    company: str | None = None
    employment_status: str | None = None


class AcademicRecord(BaseModel):
    student_id: str
    cgpa: float | None = None
    academic_honors: str | None = None
    internship_completed: bool | None = None
    internship_organization: str | None = None
    internship_position: str | None = None
    internship_industry: str | None = None
    research_interest: str | None = None


class CurrentEmployment(BaseModel):
    student_id: str
    employment_status: str
    company: str | None = None
    job_title: str | None = None
    industry: str | None = None
    job_function: str | None = None
    country: str | None = None
    city: str | None = None
    start_year: int | None = None


class EmploymentHistoryEntry(BaseModel):
    employment_history_id: str
    company: str | None = None
    job_title: str | None = None
    industry: str | None = None
    job_function: str | None = None
    country: str | None = None
    city: str | None = None
    start_year: int | None = None
    end_year: int | None = None


class AlumniProfile(BaseModel):
    """Full profile (PRD §8). Contact fields are omitted when not permitted."""

    student_id: str
    alumni_id: str
    first_name: str
    last_name: str
    degree: str
    major: str
    minor: str | None = None
    admission_year: int | None = None
    graduation_year: int | None = None
    linkedin_url: str | None = None
    record_status: str = "active"

    # Restricted (docs/security.md §4) — populated only for the alumnus
    # themselves and admins.
    personal_email: EmailStr | None = None
    institutional_email: str | None = None
    phone: str | None = None
    contact_details_visible: bool = False

    academic: AcademicRecord | None = None
    current_employment: CurrentEmployment | None = None
    employment_history: list[EmploymentHistoryEntry] = []


# --------------------------------------------------------------------------- #
# Submissions
# --------------------------------------------------------------------------- #
class SubmissionCreate(BaseModel):
    submission_type: str
    proposed_changes: dict[str, Any] = Field(min_length=1)


class SubmissionSummary(BaseModel):
    submission_id: int
    student_id: str
    submission_type: str
    status: str
    submitted_at: datetime
    reviewed_at: datetime | None = None
    review_note: str | None = None
    current_values: dict[str, Any] | None = None
    proposed_values: dict[str, Any] | None = None


# --------------------------------------------------------------------------- #
# Dashboards
# --------------------------------------------------------------------------- #
# `charts` is a free-form mapping rather than a fixed model: each chart has a
# different row shape, and the frontend reads them by key. The KPI block is
# where the contract matters, so it is spelled out.
class OverviewKPIs(BaseModel):
    total_alumni: int
    ib_majors: int
    ib_minors: int
    average_cgpa: float | None = None
    internship_completion_rate: float | None = None


class OverviewDashboard(BaseModel):
    kpis: OverviewKPIs
    charts: dict[str, list[dict[str, Any]]]


class CareerKPIs(BaseModel):
    total_alumni: int
    employed: int
    seeking_employment: int
    further_studies: int
    self_employed: int
    employment_rate: float | None = None


class CareerDashboard(BaseModel):
    kpis: CareerKPIs
    charts: dict[str, list[dict[str, Any]]]


class DataQuality(BaseModel):
    incomplete_profiles: int
    pending_verification: int
    potential_duplicates: int
    missing_employment_info: int
    missing_cgpa: int
    bba_without_internship: int
    deactivated_records: int
    unclaimed_profiles: int


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
class UserSummary(BaseModel):
    user_id: int
    role: str
    email: str
    full_name: str | None = None
    status: str
    student_id: str | None = None
    created_at: datetime
    last_login_at: datetime | None = None


class StaffUserCreate(BaseModel):
    """Faculty or admin account. Alumni accounts come from registration."""

    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    role: str = Field(pattern="^(faculty|admin)$")
    password: str = Field(min_length=10, max_length=128)


class UserUpdate(BaseModel):
    role: str | None = Field(None, pattern="^(faculty|admin)$")
    status: str | None = Field(None, pattern="^(active|pending_verification|deactivated)$")
    full_name: str | None = Field(None, min_length=1, max_length=200)


class RegisterRequest(BaseModel):
    """Alumni profile claiming (PRD §7)."""

    student_id: str = Field(min_length=7, max_length=7)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class RegisterResponse(BaseModel):
    status: str
    student_id: str | None = None
    message: str
