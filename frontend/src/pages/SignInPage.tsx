import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { ApiError } from "../lib/api";
import { ErrorNote, Seal } from "../components/ui";

export function SignInPage() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) {
    const from = (location.state as { from?: Location } | null)?.from;
    const fallback = session.role === "alumni" ? "/me" : "/directory";
    return <Navigate to={from?.pathname ?? fallback} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(identifier.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="signin">
      <form className="signin__card" onSubmit={handleSubmit}>
        <Seal className="signin__seal" />
        <h1 className="signin__title">Alumni Information System</h1>
        <p className="signin__sub">Department of International Business</p>

        {error && <ErrorNote message={error} />}

        <label className="field" style={{ marginTop: error ? "var(--space-4)" : 0 }}>
          <span className="field__label">Student ID or email</span>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            placeholder="2000001"
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" className="btn btn--block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="signin__hint">
          Alumni sign in with their Student ID. Faculty and administrators use
          their IUB email address.
        </p>
      </form>
    </div>
  );
}
