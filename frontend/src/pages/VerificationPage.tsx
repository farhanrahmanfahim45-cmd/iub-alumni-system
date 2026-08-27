/**
 * Verification Centre (PRD §10). Admin only.
 *
 * The queue on the left, the decision on the right. Opening a submission is
 * a side panel rather than a navigation, so an admin working through a batch
 * never loses their place in the list.
 *
 * The three actions sit together at the bottom of the panel, below the
 * comparison, so nobody decides before scrolling past what they're deciding
 * on. Colour carries the intent before the label is read: navy approve,
 * red reject, orange send back.
 */

import { useCallback, useEffect, useState } from "react";

import { ApiError, api, buildQuery, getPage } from "../lib/api";
import type { PageMeta, Submission, SubmissionStatus } from "../lib/types";
import { Comparison, typeLabel } from "../components/Comparison";
import {
  EmptyState,
  ErrorNote,
  Pagination,
  SkeletonRows,
  StatusPill,
} from "../components/ui";

const TABS: { key: SubmissionStatus | "all"; label: string }[] = [
  { key: "Pending", label: "Pending" },
  { key: "Correction Required", label: "Sent back" },
  { key: "Approved", label: "Approved" },
  { key: "Rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const PAGE_SIZE = 25;

type Action = "approve" | "reject" | "request-correction";

export function VerificationPage() {
  const [tab, setTab] = useState<SubmissionStatus | "all">("Pending");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Submission[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const query = buildQuery({
      status: tab === "all" ? null : tab,
      page,
      page_size: PAGE_SIZE,
    });
    getPage<Submission>(`/api/submissions${query}`)
      .then((res) => {
        setRows(res.data);
        setMeta(res.meta);
      })
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Couldn't load submissions.",
        ),
      )
      .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(load, [load]);

  function handleReviewed(updated: Submission) {
    setSelected(null);
    // The row may no longer belong on this tab, so reload rather than patch.
    load();
    void updated;
  }

  return (
    <>
      <div className="page__head">
        <div>
          <h1>Verification centre</h1>
          <p className="page__count tnum">
            {meta ? `${meta.total_records.toLocaleString()} submissions` : "Loading…"}
          </p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? "tab tab--active" : "tab"}
            onClick={() => {
              setTab(t.key);
              setPage(1);
              setSelected(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="card">
        {error ? (
          <div className="card__body">
            <ErrorNote message={error} />
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Student ID</th>
                    <th>Change</th>
                    <th>Fields</th>
                    <th>Status</th>
                  </tr>
                </thead>
                {loading ? (
                  <SkeletonRows rows={6} cols={5} />
                ) : (
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.submission_id}
                        className="clickable"
                        tabIndex={0}
                        onClick={() => setSelected(row)}
                        onKeyDown={(e) => e.key === "Enter" && setSelected(row)}
                      >
                        <td className="tnum">
                          {new Date(row.submitted_at).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="tnum">{row.student_id}</td>
                        <td className="cell-name">{typeLabel(row.submission_type)}</td>
                        <td className="muted">
                          {Object.keys(row.proposed_values ?? {}).length} field
                          {Object.keys(row.proposed_values ?? {}).length === 1 ? "" : "s"}
                        </td>
                        <td>
                          <StatusPill status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>

            {!loading && rows.length === 0 && (
              <EmptyState
                title={
                  tab === "Pending"
                    ? "Nothing waiting for review"
                    : "No submissions here"
                }
                body={
                  tab === "Pending"
                    ? "You're all caught up. New submissions from alumni appear here."
                    : "Try another tab to see submissions in a different state."
                }
              />
            )}

            {meta && (
              <Pagination
                page={meta.page}
                pageSize={meta.page_size}
                total={meta.total_records}
                totalPages={meta.total_pages}
                onChange={setPage}
              />
            )}
          </>
        )}
      </section>

      {selected && (
        <ReviewPanel
          submission={selected}
          onClose={() => setSelected(null)}
          onReviewed={handleReviewed}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------- */
/* Review panel                                                          */
/* -------------------------------------------------------------------- */
function ReviewPanel({
  submission,
  onClose,
  onReviewed,
}: {
  submission: Submission;
  onClose: () => void;
  onReviewed: (updated: Submission) => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Action | null>(null);

  const open =
    submission.status === "Pending" || submission.status === "Correction Required";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(action: Action) {
    // Rejecting or sending back without saying why leaves the alumnus with
    // nothing to act on, so the reason is required before the call is made.
    if (action !== "approve" && note.trim() === "") {
      setError(
        action === "reject"
          ? "Add a reason so the alumnus knows why this was rejected."
          : "Add a comment so the alumnus knows what to change.",
      );
      return;
    }
    setBusy(action);
    setError(null);
    const body =
      action === "approve"
        ? { note: note.trim() || null }
        : action === "reject"
          ? { reason: note.trim() }
          : { comments: note.trim() };
    try {
      const res = await api.put<{ data: Submission }>(
        `/api/submissions/${submission.submission_id}/${action}`,
        body,
      );
      onReviewed(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that.");
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  const ACTION_COPY: Record<Action, { label: string; confirm: string }> = {
    approve: {
      label: "Approve",
      confirm: "Approve and update the record?",
    },
    reject: { label: "Reject", confirm: "Reject this submission?" },
    "request-correction": {
      label: "Send back",
      confirm: "Send this back for correction?",
    },
  };

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Review ${typeLabel(submission.submission_type)} submission`}
      >
        <header className="panel__head">
          <div>
            <h2 className="card__title">{typeLabel(submission.submission_type)}</h2>
            <p className="muted tnum" style={{ margin: "var(--space-1) 0 0" }}>
              {submission.student_id} · submitted{" "}
              {new Date(submission.submitted_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </header>

        <div className="panel__body">
          <Comparison
            type={submission.submission_type}
            current={submission.current_values}
            proposed={submission.proposed_values}
          />

          {submission.review_note && (
            <div className="note">
              <span className="field__label">Review note</span>
              <p style={{ margin: 0 }}>{submission.review_note}</p>
            </div>
          )}
        </div>

        {open ? (
          <footer className="panel__foot">
            {error && <ErrorNote message={error} />}

            <label className="field" style={{ marginTop: error ? "var(--space-3)" : 0 }}>
              <span className="field__label">
                Note to the alumnus
                <span className="muted"> — required to reject or send back</span>
              </span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did you check, or what needs changing?"
              />
            </label>

            {confirming ? (
              <div className="confirm">
                <span>{ACTION_COPY[confirming].confirm}</span>
                <div className="confirm__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setConfirming(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={
                      confirming === "approve"
                        ? "btn btn--sm"
                        : confirming === "reject"
                          ? "btn btn--sm btn--danger"
                          : "btn btn--sm btn--warn"
                    }
                    onClick={() => submit(confirming)}
                    disabled={busy !== null}
                  >
                    {busy ? "Saving…" : ACTION_COPY[confirming].label}
                  </button>
                </div>
              </div>
            ) : (
              <div className="panel__actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setConfirming("approve")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn--warn-outline"
                  onClick={() => setConfirming("request-correction")}
                >
                  Send back
                </button>
                <button
                  type="button"
                  className="btn btn--danger-outline"
                  onClick={() => setConfirming("reject")}
                >
                  Reject
                </button>
              </div>
            )}
          </footer>
        ) : (
          <footer className="panel__foot">
            <p className="muted" style={{ margin: 0 }}>
              This submission was {submission.status.toLowerCase()}
              {submission.reviewed_at
                ? ` on ${new Date(submission.reviewed_at).toLocaleDateString()}`
                : ""}
              .
            </p>
          </footer>
        )}
      </aside>
    </>
  );
}
