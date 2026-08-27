/**
 * Shared UI primitives.
 *
 * Kept in one file because each is small and they're used together; split
 * them out if any grows past a screenful.
 */

import type { ReactNode } from "react";

import type { EmploymentStatus, SubmissionStatus } from "../lib/types";

/* -------------------------------------------------------------------- */
/* Status pill                                                           */
/* -------------------------------------------------------------------- */
type Tone = "positive" | "pending" | "negative" | "attention" | "neutral";

/**
 * One hue per state, used identically on every screen, so a colour means
 * the same thing in the directory as it does in the review queue.
 */
const TONES: Record<string, Tone> = {
  // Employment
  Employed: "positive",
  "Self-Employed": "positive",
  "Seeking Employment": "neutral",
  "Further Studies": "neutral",
  // Submissions
  Approved: "positive",
  Pending: "pending",
  Rejected: "negative",
  "Correction Required": "attention",
  // Accounts and records
  active: "positive",
  pending_verification: "pending",
  deactivated: "negative",
};

const ACCOUNT_LABELS: Record<string, string> = {
  active: "Active",
  pending_verification: "Awaiting verification",
  deactivated: "Deactivated",
};

export function StatusPill({
  status,
}: {
  status: EmploymentStatus | SubmissionStatus | string | null;
}) {
  if (!status) return <span className="muted">—</span>;
  const tone = TONES[status] ?? "neutral";
  return (
    <span className={`pill pill--${tone}`}>{ACCOUNT_LABELS[status] ?? status}</span>
  );
}

/* -------------------------------------------------------------------- */
/* Identity                                                              */
/* -------------------------------------------------------------------- */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/**
 * The university seal, drawn rather than loaded, so it stays crisp at any
 * size and needs no asset pipeline. Simplified from IUB_Logo.png: the flame
 * device and wordmark only.
 *
 * docs/brand_guidelines.md flags that IUB has not supplied usage rules or a
 * vector original — replace this with the official mark once they do.
 */
export function Seal({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Independent University, Bangladesh"
    >
      <circle cx="32" cy="32" r="31" fill="#fff" stroke="var(--border)" />
      <path
        d="M32 13c5 6 6.5 11 4.5 16.5-1 2.8-2.8 4.8-4.5 6.2-1.7-1.4-3.5-3.4-4.5-6.2C25.5 24 27 19 32 13Z"
        fill="var(--iub-purple)"
      />
      <path d="M18 33.5l12 5.5v9l-12-5.5v-9Z" fill="var(--iub-navy)" />
      <path d="M46 33.5l-12 5.5v9l12-5.5v-9Z" fill="var(--iub-orange)" />
      <text
        x="32"
        y="57"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        letterSpacing="0.5"
        fill="var(--iub-gray)"
        fontFamily="Inter, sans-serif"
      >
        IUB
      </text>
    </svg>
  );
}

/* -------------------------------------------------------------------- */
/* States                                                                */
/* -------------------------------------------------------------------- */
/** An empty screen is an invitation to act, not a blank area. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {body && <p className="empty__body">{body}</p>}
      {action && <div style={{ marginTop: "var(--space-4)" }}>{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="alert alert--error" role="alert">
      {message}
    </div>
  );
}

/** Skeleton rows match the real row height, so nothing jumps on load. */
export function SkeletonRows({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (__, c) => (
            <td key={c}>
              <div
                className="skeleton"
                style={{ height: 12, width: c === 0 ? "70%" : "50%" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function SkeletonBlock({ height = 120 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} />;
}

/* -------------------------------------------------------------------- */
/* Pagination                                                            */
/* -------------------------------------------------------------------- */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <span className="tnum">
        {first}–{last} of {total.toLocaleString()}
      </span>
      <div className="pagination__controls">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span className="tnum" style={{ padding: "0 var(--space-2)" }}>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
