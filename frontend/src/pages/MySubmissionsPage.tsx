/**
 * My submissions (PRD §9). Alumni only.
 *
 * A submission that was sent back is the only one that needs action, so it
 * carries the admin's comment inline and an edit form right there — the
 * alumnus never has to go looking for what to fix.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ApiError, api, getPage } from "../lib/api";
import type { Submission } from "../lib/types";
import {
  Comparison,
  SUBMISSION_TYPES,
  displayValue,
  typeLabel,
} from "../components/Comparison";
import { EmptyState, ErrorNote, SkeletonBlock, StatusPill } from "../components/ui";

export function MySubmissionsPage() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getPage<Submission>("/api/submissions?page_size=100")
      .then((res) => setRows(res.data))
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Couldn't load your submissions.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading) return <SkeletonBlock height={280} />;
  if (error) return <ErrorNote message={error} />;

  return (
    <>
      <div className="page__head">
        <div>
          <h1>My submissions</h1>
          <p className="page__count">
            Everything you've sent to the department, and where it got to.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="You haven't sent anything yet"
            body="When you update your information, it appears here so you can follow what happens to it."
            action={
              <Link className="btn" to="/me/update">
                Update my information
              </Link>
            }
          />
        </div>
      ) : (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          {rows.map((row) => (
            <SubmissionCard
              key={row.submission_id}
              submission={row}
              editing={editing === row.submission_id}
              onEdit={() => setEditing(row.submission_id)}
              onCancel={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                load();
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function SubmissionCard({
  submission,
  editing,
  onEdit,
  onCancel,
  onSaved,
}: {
  submission: Submission;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const needsWork = submission.status === "Correction Required";
  const def = SUBMISSION_TYPES[submission.submission_type];

  const [values, setValues] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(submission.proposed_values ?? {})) {
      next[key] = value === null || value === undefined ? "" : String(value);
    }
    return next;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    const proposed: Record<string, unknown> = {};
    for (const [key, text] of Object.entries(values)) {
      const field = def.fields.find((f) => f.name === key);
      const trimmed = text.trim();
      proposed[key] =
        trimmed === "" ? null : field?.type === "number" ? Number(trimmed) : trimmed;
    }
    try {
      await api.put(`/api/submissions/${submission.submission_id}`, {
        proposed_changes: proposed,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={needsWork ? "card card--attention" : "card"}>
      <div className="card__head">
        <div>
          <h2 className="card__title">{typeLabel(submission.submission_type)}</h2>
          <p className="muted" style={{ margin: "var(--space-1) 0 0" }}>
            Sent{" "}
            {new Date(submission.submitted_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <StatusPill status={submission.status} />
      </div>

      <div className="card__body">
        {/* The admin's message is the first thing to read when something
            came back, not a footnote under the values. */}
        {submission.review_note && (
          <div className={needsWork ? "note note--attention" : "note"}>
            <span className="field__label">
              {needsWork ? "What needs changing" : "Note from the department"}
            </span>
            <p style={{ margin: 0 }}>{submission.review_note}</p>
          </div>
        )}

        {editing ? (
          <>
            {error && <ErrorNote message={error} />}
            <div className="form-grid" style={{ marginTop: "var(--space-4)" }}>
              {Object.keys(submission.proposed_values ?? {}).map((name) => {
                const field = def.fields.find((f) => f.name === name);
                return (
                  <label className="field" key={name}>
                    <span className="field__label">{field?.label ?? name}</span>
                    <input
                      type={field?.type === "number" ? "number" : "text"}
                      value={values[name] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [name]: e.target.value }))
                      }
                    />
                    <span className="field__hint">
                      On record: {displayValue(submission.current_values?.[name])}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="panel__actions" style={{ marginTop: "var(--space-4)" }}>
              <button type="button" className="btn" onClick={resend} disabled={busy}>
                {busy ? "Sending…" : "Send again"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onCancel}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <Comparison
              type={submission.submission_type}
              current={submission.current_values}
              proposed={submission.proposed_values}
            />
            {needsWork && (
              <div className="panel__actions" style={{ marginTop: "var(--space-4)" }}>
                <button type="button" className="btn" onClick={onEdit}>
                  Edit and send again
                </button>
              </div>
            )}
            {submission.status === "Approved" && (
              <p className="muted" style={{ marginBottom: 0 }}>
                This is on your record now.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
