/**
 * Types mirroring the FastAPI response models in backend/app/models.py.
 * Kept hand-written rather than generated so the frontend contract is
 * readable in one place; if they drift, the API's /openapi.json is the
 * source of truth.
 */

export type Role = "alumni" | "faculty" | "admin";

export interface Envelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PageMeta {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export interface PagedEnvelope<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  field?: string | null;
}

/* -------------------------------------------------------------------- */
/* Auth                                                                  */
/* -------------------------------------------------------------------- */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  expires_in: number;
  student_id: string | null;
  alumni_id: string | null;
  full_name: string | null;
}

export interface Me {
  user_id: number;
  role: Role;
  email: string;
  student_id: string | null;
}

/* -------------------------------------------------------------------- */
/* Alumni                                                                */
/* -------------------------------------------------------------------- */
export type EmploymentStatus =
  | "Employed"
  | "Seeking Employment"
  | "Further Studies"
  | "Self-Employed";

export interface DirectoryRow {
  student_id: string;
  alumni_id: string;
  name: string;
  degree: string;
  major: string;
  minor: string | null;
  graduation_year: number | null;
  company: string | null;
  employment_status: EmploymentStatus | null;
}

export interface AcademicRecord {
  student_id: string;
  cgpa: number | null;
  academic_honors: string | null;
  internship_completed: boolean | null;
  internship_organization: string | null;
  internship_position: string | null;
  internship_industry: string | null;
  research_interest: string | null;
}

export interface CurrentEmployment {
  student_id: string;
  employment_status: EmploymentStatus;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  job_function: string | null;
  country: string | null;
  city: string | null;
  start_year: number | null;
}

export interface EmploymentHistoryEntry {
  employment_history_id: string;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  job_function: string | null;
  country: string | null;
  city: string | null;
  start_year: number | null;
  end_year: number | null;
}

export interface AlumniProfile {
  student_id: string;
  alumni_id: string;
  first_name: string;
  last_name: string;
  degree: string;
  major: string;
  minor: string | null;
  admission_year: number | null;
  graduation_year: number | null;
  linkedin_url: string | null;
  record_status: string;
  /** Present only when the viewer is permitted to see them. */
  personal_email: string | null;
  institutional_email: string | null;
  phone: string | null;
  /** Tells the UI whether to render the contact section at all. */
  contact_details_visible: boolean;
  academic: AcademicRecord | null;
  current_employment: CurrentEmployment | null;
  employment_history: EmploymentHistoryEntry[];
}

/* -------------------------------------------------------------------- */
/* Submissions                                                           */
/* -------------------------------------------------------------------- */
export type SubmissionStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Correction Required";

export type SubmissionType =
  | "personal"
  | "contact"
  | "academic"
  | "internship"
  | "research_interest"
  | "employment"
  | "employment_history";

export interface Submission {
  submission_id: number;
  student_id: string;
  submission_type: SubmissionType;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  current_values: Record<string, unknown> | null;
  proposed_values: Record<string, unknown> | null;
}

/* -------------------------------------------------------------------- */
/* Dashboards                                                            */
/* -------------------------------------------------------------------- */
export interface OverviewDashboard {
  kpis: {
    total_alumni: number;
    ib_majors: number;
    ib_minors: number;
    average_cgpa: number | null;
    internship_completion_rate: number | null;
  };
  charts: Record<string, Record<string, string | number | null>[]>;
}

export interface CareerDashboard {
  kpis: {
    total_alumni: number;
    employed: number;
    seeking_employment: number;
    further_studies: number;
    self_employed: number;
    employment_rate: number | null;
  };
  charts: Record<string, Record<string, string | number | null>[]>;
}

export interface DataQuality {
  incomplete_profiles: number;
  pending_verification: number;
  potential_duplicates: number;
  missing_employment_info: number;
  missing_cgpa: number;
  bba_without_internship: number;
  deactivated_records: number;
  unclaimed_profiles: number;
}

/* -------------------------------------------------------------------- */
/* Users                                                                 */
/* -------------------------------------------------------------------- */
export interface UserSummary {
  user_id: number;
  role: Role;
  email: string;
  full_name: string | null;
  status: "active" | "pending_verification" | "deactivated";
  student_id: string | null;
  created_at: string;
  last_login_at: string | null;
}
