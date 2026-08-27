/**
 * Accounts (docs/api_spec.md §8). Admin only.
 *
 * Activating an alumni account is the second half of profile claiming: a
 * registration creates a pending account that can't sign in until someone
 * here approves it.
 */

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { useAuth } from "../auth/AuthProvider";
import { ApiError, api, buildQuery, getPage } from "../lib/api";
import type { PageMeta, UserSummary } from "../lib/types";
import {
  EmptyState,
  ErrorNote,
  Pagination,
  SkeletonRows,
  StatusPill,
} from "../components/ui";

const TABS = [
  { key: "pending_verification", label: "Awaiting approval" },
  { key: "active", label: "Active" },
  { key: "deactivated", label: "Deactivated" },
  { key: "all", label: "All" },
];

export function UsersPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState("pending_verification");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserSummary[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const query = buildQuery({
      status: tab === "all" ? null : tab,
      page,
      page_size: 25,
    });
    getPage<UserSummary>(`/api/users${query}`)
      .then((res) => {
        setRows(res.data);
        setMeta(res.meta);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load accounts."),
      )
      .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(load, [load]);

  async function setStatus(user: UserSummary, status: string) {
    setError(null);
    try {
      await api.put(`/api/users/${user.user_id}`, { status });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that account.");
    }
  }

  return (
    <>
      <div className="page__head">
        <div>
          <h1>Accounts</h1>
          <p className="page__count tnum">
            {meta ? `${meta.total_records.toLocaleString()} accounts` : "Loading…"}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setCreating(true)}>
          Add staff account
        </button>
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
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorNote message={error} />}

      <section className="card" style={{ marginTop: error ? "var(--space-4)" : 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Student ID</th>
                <th>Last signed in</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            {loading ? (
              <SkeletonRows rows={6} cols={7} />
            ) : (
              <tbody>
                {rows.map((user) => {
                  const isSelf = user.user_id === session?.userId;
                  return (
                    <tr key={user.user_id}>
                      <td className="cell-name">
                        {user.full_name ?? <span className="muted">—</span>}
                      </td>
                      <td>{user.email}</td>
                      <td style={{ textTransform: "capitalize" }}>{user.role}</td>
                      <td className="tnum">
                        {user.student_id ?? <span className="muted">—</span>}
                      </td>
                      <td className="tnum">
                        {user.last_login_at ? (
                          new Date(user.last_login_at).toLocaleDateString()
                        ) : (
                          <span className="muted">Never</span>
                        )}
                      </td>
                      <td>
                        <StatusPill status={user.status} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {/* An admin can't change their own role or status —
                            the API refuses it, so the button isn't offered. */}
                        {isSelf ? (
                          <span className="muted">You</span>
                        ) : user.status === "active" ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => setStatus(user, "deactivated")}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => setStatus(user, "active")}
                          >
                            {user.status === "pending_verification"
                              ? "Approve"
                              : "Reactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>

        {!loading && rows.length === 0 && (
          <EmptyState
            title={
              tab === "pending_verification"
                ? "No accounts waiting"
                : "No accounts here"
            }
            body={
              tab === "pending_verification"
                ? "When an alumnus registers to claim their profile, their account appears here for approval."
                : "Try another tab."
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
      </section>

      {creating && (
        <CreateStaffPanel
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setTab("active");
            setPage(1);
          }}
        />
      )}
    </>
  );
}

function CreateStaffPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "faculty",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setField(null);
    try {
      await api.post("/api/users", form);
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setField(err.field);
      } else {
        setError("Couldn't create that account.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside className="panel" role="dialog" aria-modal="true" aria-label="Add staff account">
        <header className="panel__head">
          <h2 className="card__title">Add a staff account</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            Close
          </button>
        </header>

        <form onSubmit={submit} style={{ display: "contents" }}>
          <div className="panel__body">
            {error && <ErrorNote message={error} />}

            <p className="muted" style={{ marginTop: error ? "var(--space-4)" : 0 }}>
              Alumni accounts aren't created here — an alumnus registers to claim
              their own record, and you approve it from the list.
            </p>

            <label className="field">
              <span className="field__label">Full name</span>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                aria-invalid={field === "email" || undefined}
                style={
                  field === "email" ? { borderColor: "var(--status-negative)" } : undefined
                }
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Role</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="faculty">Faculty — read-only</option>
                <option value="admin">Administrator — full access</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">Temporary password</span>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={10}
                required
              />
              <span className="field__hint">
                At least 10 characters. Share it with them directly and ask them to
                change it.
              </span>
            </label>
          </div>

          <footer className="panel__foot">
            <div className="panel__actions">
              <button type="submit" className="btn" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </>
  );
}
