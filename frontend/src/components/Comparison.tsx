/**
 * The Current → Proposed comparison, and the field definitions behind it.
 *
 * The same component renders in three places: an alumnus confirming what
 * they're about to send, an alumnus reviewing what came back, and an admin
 * deciding. Showing all three the identical view is the point — everyone is
 * looking at the same thing when they act on it.
 *
 * FIELDS mirrors FIELD_MAP in backend/app/core/submissions.py. The backend
 * is the authority: it whitelists these server-side, so a mismatch here
 * produces a clear 400, never an unauthorised write.
 */

import type { SubmissionType } from "../lib/types";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "select" | "boolean";
  options?: string[];
  hint?: string;
  placeholder?: string;
}

export interface TypeDef {
  label: string;
  description: string;
  fields: FieldDef[];
  /** Appends a record instead of replacing one. */
  appends?: boolean;
}

const EMPLOYMENT_STATUSES = [
  "Employed",
  "Seeking Employment",
  "Further Studies",
  "Self-Employed",
];

export const SUBMISSION_TYPES: Record<SubmissionType, TypeDef> = {
  contact: {
    label: "Contact details",
    description: "How the department reaches you.",
    fields: [
      { name: "personal_email", label: "Email", type: "email" },
      { name: "phone", label: "Phone" },
      {
        name: "linkedin_url",
        label: "LinkedIn",
        placeholder: "https://linkedin.com/in/…",
      },
    ],
  },
  personal: {
    label: "Name",
    description: "Corrections to how your name is recorded.",
    fields: [
      { name: "first_name", label: "First name" },
      { name: "last_name", label: "Last name" },
    ],
  },
  employment: {
    label: "Current position",
    description: "Where you work now, or what you're doing instead.",
    fields: [
      {
        name: "employment_status",
        label: "Status",
        type: "select",
        options: EMPLOYMENT_STATUSES,
      },
      {
        name: "company",
        label: "Employer",
        hint: "Required if you're employed or self-employed.",
      },
      { name: "job_title", label: "Role" },
      { name: "industry", label: "Industry" },
      { name: "job_function", label: "Function" },
      { name: "country", label: "Country" },
      { name: "city", label: "City" },
      { name: "start_year", label: "Started in", type: "number" },
    ],
  },
  employment_history: {
    label: "A previous role",
    description: "Adds a past role. Your existing entries stay as they are.",
    appends: true,
    fields: [
      { name: "company", label: "Organisation" },
      { name: "job_title", label: "Role" },
      { name: "industry", label: "Industry" },
      { name: "job_function", label: "Function" },
      { name: "country", label: "Country" },
      { name: "city", label: "City" },
      { name: "start_year", label: "From", type: "number" },
      { name: "end_year", label: "To", type: "number" },
    ],
  },
  internship: {
    label: "Internship",
    description: "Your undergraduate internship placement.",
    fields: [
      { name: "internship_completed", label: "Completed", type: "boolean" },
      { name: "internship_organization", label: "Organisation" },
      { name: "internship_position", label: "Position" },
      { name: "internship_industry", label: "Industry" },
    ],
  },
  research_interest: {
    label: "Research interest",
    description: "The area you'd want to be contacted about.",
    fields: [{ name: "research_interest", label: "Research interest" }],
  },
  academic: {
    label: "Academic record",
    description:
      "CGPA and honours. The department checks these against your transcript.",
    fields: [
      { name: "cgpa", label: "CGPA", type: "number", hint: "Between 0.00 and 4.00." },
      { name: "academic_honors", label: "Honours" },
    ],
  },
};

export function typeLabel(type: SubmissionType): string {
  return SUBMISSION_TYPES[type]?.label ?? type;
}

export function fieldLabel(type: SubmissionType, name: string): string {
  return (
    SUBMISSION_TYPES[type]?.fields.find((f) => f.name === name)?.label ?? name
  );
}

/** Renders a stored value the way a person reads it, not the way it's typed. */
export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/* -------------------------------------------------------------------- */
/* Comparison                                                            */
/* -------------------------------------------------------------------- */
export function Comparison({
  type,
  current,
  proposed,
  appends,
}: {
  type: SubmissionType;
  current: Record<string, unknown> | null;
  proposed: Record<string, unknown> | null;
  appends?: boolean;
}) {
  const fields = Object.keys(proposed ?? {});
  if (fields.length === 0) {
    return <p className="muted">No changes in this submission.</p>;
  }

  // An appended record replaces nothing, so a two-column diff would be
  // misleading — show it as what it is: a new entry.
  if (appends ?? SUBMISSION_TYPES[type]?.appends) {
    return (
      <>
        <p className="diff__note">
          A new entry. Nothing already on the record changes.
        </p>
        <dl className="diff diff--single">
          {fields.map((name) => (
            <div className="diff__row" key={name}>
              <dt className="diff__label">{fieldLabel(type, name)}</dt>
              <dd className="diff__proposed">{displayValue(proposed?.[name])}</dd>
            </div>
          ))}
        </dl>
      </>
    );
  }

  return (
    <dl className="diff">
      <div className="diff__head">
        <span />
        <span className="diff__col-label">On record</span>
        <span className="diff__col-label diff__col-label--new">Proposed</span>
      </div>
      {fields.map((name) => {
        const before = current?.[name];
        const after = proposed?.[name];
        const changed = displayValue(before) !== displayValue(after);
        return (
          <div className="diff__row" key={name}>
            <dt className="diff__label">{fieldLabel(type, name)}</dt>
            <dd className="diff__current">{displayValue(before)}</dd>
            <dd className={changed ? "diff__proposed" : "diff__proposed muted"}>
              {displayValue(after)}
              {!changed && <span className="diff__unchanged"> (unchanged)</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
