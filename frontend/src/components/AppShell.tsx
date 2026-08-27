/**
 * The application frame: identity bar plus role-aware navigation.
 *
 * Tabs a role can't use aren't rendered at all — a faculty member never sees
 * a Verification tab that would only refuse them. The API enforces the same
 * rules independently.
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import type { Role } from "../lib/types";
import { Avatar, Seal } from "./ui";

interface Tab {
  to: string;
  label: string;
  roles: Role[];
}

const TABS: Tab[] = [
  { to: "/me", label: "My profile", roles: ["alumni"] },
  { to: "/me/update", label: "Update information", roles: ["alumni"] },
  { to: "/me/submissions", label: "My submissions", roles: ["alumni"] },
  { to: "/directory", label: "Directory", roles: ["faculty", "admin"] },
  { to: "/verification", label: "Verification", roles: ["admin"] },
  { to: "/analytics/overview", label: "Academic overview", roles: ["faculty", "admin"] },
  { to: "/analytics/career", label: "Career landscape", roles: ["faculty", "admin"] },
  { to: "/data-quality", label: "Data quality", roles: ["admin"] },
  { to: "/users", label: "Accounts", roles: ["admin"] },
];

const ROLE_LABEL: Record<Role, string> = {
  alumni: "Alumni",
  faculty: "Faculty",
  admin: "Administrator",
};

export function AppShell() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  if (!session) return null;

  const tabs = TABS.filter((tab) => tab.roles.includes(session.role));
  const displayName = session.fullName ?? session.email;

  function handleSignOut() {
    signOut();
    navigate("/signin", { replace: true });
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <Seal className="brand__seal" />
          <span>
            <span className="brand__name">Alumni Information System</span>
            <span className="brand__dept">Department of International Business</span>
          </span>
        </div>

        <div className="topbar__spacer" />

        <div className="account">
          <span style={{ textAlign: "right" }}>
            <span className="account__name">{displayName}</span>
            <br />
            <span className="account__role">{ROLE_LABEL[session.role]}</span>
          </span>
          <Avatar name={displayName} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="nav" aria-label="Sections">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/me"}
            className={({ isActive }) =>
              isActive ? "nav__link nav__link--active" : "nav__link"
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
