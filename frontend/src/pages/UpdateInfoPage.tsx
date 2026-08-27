/**
 * Update information (PRD §9). Alumni only.
 *
 * One focused form per submission type rather than one long form, so the
 * change set stays small and maps cleanly to what an admin will review.
 *
 * Before sending, the alumnus sees the same Current → Proposed comparison
 * the admin will see. Nothing here writes to a record — the button says
 * "Send for review" because that is exactly what it does.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { ApiError, api, getData } from "../lib/api";
import type { AlumniProfile, SubmissionType } from "../lib/types";
import { Comparison, SUBMISSION_TYPES, displayValue } from "../components/Comparison";
import { ErrorNote, SkeletonBlock } from "../components/ui";

/** Types an alumnus may submit, in the order they're most likely to need. */
const ORDER: SubmissionType[] = [
  "contact",
  "employment",
  "employment_history",
  "research_interest",
  "internship",
  "personal",
  "academic",
];

type Values = Record<string, string | boolean>;

export function UpdateInfoPage() {
  const { session } = useAuth();
  const [type, setType] = useState<SubmissionType>("contact");
  const [profile, setProfile] = useState<AlumniProfile | null>(null);
  const [values, setValues] = useState<Values>({});
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const def = SUBMISSION_TYPES[type];

  useEffect(() => {
    if (!session?.studentId) return;
    getData<AlumniProfile>(`/api/alumni/${session.studentId}`)
      .then(setProfile)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load your profile."),
      )
      .finally(() => setLoading(false));
  }, [session?.studentId]);

  /** What the record says now, for the fields in the chosen form. */
  const current = useMemo(() => {
    if (!profile) return {};
    const source: Record<string, unknown> = {
      ...profile,
      ...(profile.academic ?? {}),
      ...(profile.current_employment ?? {}),
    };
    const out: Record<string, unknown> = {};
    for (const field of def.fields) out[field.name] = source[field.name] ?? null;
    return out;
  }, [profile, def]);

  // Prefill from the record so the alumnus edits rather than retypes. An
  // append starts blank — there is nothing to edit.
  useEffect(() => {
    if (!profile) return;
    if (def.appends) {
      setValues({});
    } else {
      const next: Values = {};
      for (const field of def.fields) {
        const value = current[field.name];
        next[field.name] =
          field.type === "boolean" ? Boolean(value) : value === null ? "" : String(value);
      }
      setValues(next);
    }
    setReviewing(false);
    setSent(false);
    setError(null);
    setFieldError(null);
  }, [type, profile, def, current]);

  /** Only what actually differs is sent. */
  const changes = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const field of def.fields) {
      const raw = values[field.name];
      if (field.type === "boolean") {
        if (Boolean(raw) !== Boolean(current[field.name])) out[field.name] = Boolean(raw);
        continue;
      }
      const text = String(raw ?? "").trim();
      if (def.appends) {
        if (text !== "") out[field.name] = field.type === "number" ? Number(text) : text;
        continue;
      }
      const before = current[field.name];
      const beforeText = before === null || before === undefined ? "" : String(before);
      if (text !== beforeText) {
        out[field.name] =
          text === "" ? null : field.type === "number" ? Number(text) : text;
      }
    }
    return out;
  }, [values, current, def]);

  const changeCount = Object.keys(changes).length;

  async function send() {
    setBusy(true);
    setError(null);
    setFieldError(null);
    try {
      await api.post("/api/submissions", {
        submission_type: type,
        proposed_changes: changes,
      });
      setSent(true);
      setReviewing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldError(err.field);
      } else {
        setError("Couldn't send that. Try again.");
      }
      setReviewing(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <SkeletonBlock height={360} />;

  return (
    <>
      <div className="page__head">
        <div>
          <h1>Update my information</h1>
          <p className="page__count">
            Changes go to the department for review before they appear on your record.
          </p>
        </div>
      </div>

      <div className="layout-split">
        <aside className="card" style={{ padding: "var(--space-2)" }}>
          <nav aria-label="What to update">
            {ORDER.map((key) => (
              <button
                key={key}
                type="button"
                className={key === type ? "sidenav__item sidenav__item--active" : "sidenav__item"}
                onClick={() => setType(key)}
              >
                {SUBMISSION_TYPES[key].label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="card">
          <div className="card__head">
            <div>
              <h2 className="card__title">{def.label}</h2>
              <p className="muted" style={{ margin: "var(--space-1) 0 0" }}>
                {def.description}
              </p>
            </div>
          </div>

          <div className="card__body">
            {sent ? (
              <div className="note note--positive">
                <p style={{ margin: 0, fontWeight: 500 }}>Sent for review</p>
                <p style={{ margin: "var(--space-2) 0 var(--space-3)" }}>
                  The department will review this. Your record stays as it is until
                  they approve it.
                </p>
                <Link className="btn btn--ghost btn--sm" to="/me/submissions">
                  Track this submission
                </Link>
              </div>
            ) : reviewing ? (
              <>
                <p className="field__label" style={{ marginBottom: "var(--space-3)" }}>
                  Check this before sending
                </p>
                <Comparison
                  type={type}
                  current={current}
                  proposed={changes}
                  appends={def.appends}
                />
                <div className="panel__actions" style={{ marginTop: "var(--space-5)" }}>
                  <button type="button" className="btn" onClick={send} disabled={busy}>
                    {busy ? "Sending…" : "Send for review"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setReviewing(false)}
                    disabled={busy}
                  >
                    Keep editing
                  </button>
                </div>
              </>
            ) : (
              <>
                {error && <ErrorNote message={error} />}

                <div
                  className="form-grid"
                  style={{ marginTop: error ? "var(--space-4)" : 0 }}
                >
                  {def.fields.map((field) => {
                    const value = values[field.name];
                    const invalid = fieldError === field.name;
                    return (
                      <label className="field" key={field.name}>
                        <span className="field__label">{field.label}</span>

                        {field.type === "boolean" ? (
                          <select
                            value={value ? "yes" : "no"}
                            onChange={(e) =>
                              setValues((v) => ({
                                ...v,
                                [field.name]: e.target.value === "yes",
                              }))
                            }
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        ) : field.type === "select" ? (
                          <select
                            value={String(value ?? "")}
                            onChange={(e) =>
                              setValues((v) => ({ ...v, [field.name]: e.target.value }))
                            }
                          >
                            <option value="">Not set</option>
                            {field.options?.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type === "number" ? "number" : field.type ?? "text"}
                            value={String(value ?? "")}
                            placeholder={field.placeholder}
                            aria-invalid={invalid || undefined}
                            style={
                              invalid
                                ? { borderColor: "var(--status-negative)" }
                                : undefined
                            }
                            onChange={(e) =>
                              setValues((v) => ({ ...v, [field.name]: e.target.value }))
                            }
                          />
                        )}

                        {field.hint && !invalid && (
                          <span className="field__hint">{field.hint}</span>
                        )}
                        {invalid && error && (
                          <span className="field-error">{error}</span>
                        )}
                        {!def.appends && (
                          <span className="field__hint">
                            On record: {displayValue(current[field.name])}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                <div className="panel__actions" style={{ marginTop: "var(--space-4)" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setReviewing(true)}
                    disabled={changeCount === 0}
                  >
                    Review {changeCount > 0 ? `${changeCount} change` : "changes"}
                    {changeCount > 1 ? "s" : ""}
                  </button>
                  {changeCount === 0 && (
                    <span className="muted">
                      {def.appends
                        ? "Fill in the role you want to add."
                        : "Edit a field to continue."}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
