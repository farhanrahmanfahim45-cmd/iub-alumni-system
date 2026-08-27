/**
 * Session state.
 *
 * The role here decides what the interface *shows*. It is not a security
 * boundary — the API re-checks the role on every request, so hiding a tab
 * is a courtesy, not a lock.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigate, useLocation } from "react-router-dom";

import {
  ApiError,
  api,
  getData,
  getToken,
  setToken,
  setUnauthenticatedHandler,
} from "../lib/api";
import type { Envelope, LoginResponse, Me, Role } from "../lib/types";

export interface Session {
  userId: number;
  role: Role;
  email: string;
  studentId: string | null;
  fullName: string | null;
}

interface AuthValue {
  session: Session | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    setToken(null);
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(() => setSession(null));
  }, []);

  // Restore a session on refresh by asking the API who the token belongs to,
  // rather than trusting anything cached in the browser.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await getData<Me>("/api/auth/me");
        if (!cancelled) {
          setSession({
            userId: me.user_id,
            role: me.role,
            email: me.email,
            studentId: me.student_id,
            fullName: null,
          });
        }
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const res = await api.post<Envelope<LoginResponse>>("/api/auth/login", {
      identifier,
      password,
    });
    const data = res.data;
    setToken(data.access_token);
    const me = await getData<Me>("/api/auth/me");
    setSession({
      userId: me.user_id,
      role: data.role,
      email: me.email,
      studentId: data.student_id,
      fullName: data.full_name,
    });
  }, []);

  const value = useMemo(
    () => ({ session, loading, signIn, signOut }),
    [session, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Convenience for the common "is this person staff" check. */
export function isStaff(role: Role | undefined): boolean {
  return role === "admin" || role === "faculty";
}

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(session.role)) {
    // Send people to the landing page their role actually has, rather than
    // showing a dead end.
    return <Navigate to={session.role === "alumni" ? "/me" : "/directory"} replace />;
  }

  return <>{children}</>;
}

export { ApiError };
