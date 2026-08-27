import { Suspense, lazy } from "react";
import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";

import { AuthProvider, RequireAuth, useAuth } from "./auth/AuthProvider";
import { AppShell } from "./components/AppShell";
import { EmptyState, SkeletonBlock } from "./components/ui";
import { DataQualityPage } from "./pages/DataQualityPage";
import { DirectoryPage } from "./pages/DirectoryPage";
import { MySubmissionsPage } from "./pages/MySubmissionsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SignInPage } from "./pages/SignInPage";
import { UpdateInfoPage } from "./pages/UpdateInfoPage";
import { UsersPage } from "./pages/UsersPage";
import { VerificationPage } from "./pages/VerificationPage";

// Recharts is a third of the bundle and only two screens need it, so the
// dashboards load on demand. Everyone else — including every alumnus, who
// can't reach these routes at all — never downloads it.
const OverviewDashboardPage = lazy(() =>
  import("./pages/OverviewDashboardPage").then((m) => ({
    default: m.OverviewDashboardPage,
  })),
);
const CareerDashboardPage = lazy(() =>
  import("./pages/CareerDashboardPage").then((m) => ({
    default: m.CareerDashboardPage,
  })),
);

/** Matches the dashboard's own loading state, so the swap isn't visible. */
function ChartsLoading() {
  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <SkeletonBlock height={112} />
      <SkeletonBlock height={300} />
    </div>
  );
}

/** Sends each role to the landing page that makes sense for it. */
function Home() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/signin" replace />;
  return <Navigate to={session.role === "alumni" ? "/me" : "/directory"} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Home />} />

            {/* Alumni */}
            <Route
              path="/me"
              element={
                <RequireAuth roles={["alumni"]}>
                  <ProfilePage own />
                </RequireAuth>
              }
            />
            <Route
              path="/me/update"
              element={
                <RequireAuth roles={["alumni"]}>
                  <UpdateInfoPage />
                </RequireAuth>
              }
            />
            <Route
              path="/me/submissions"
              element={
                <RequireAuth roles={["alumni"]}>
                  <MySubmissionsPage />
                </RequireAuth>
              }
            />

            {/* Staff */}
            <Route
              path="/directory"
              element={
                <RequireAuth roles={["faculty", "admin"]}>
                  <DirectoryPage />
                </RequireAuth>
              }
            />
            <Route
              path="/alumni/:studentId"
              element={
                <RequireAuth roles={["faculty", "admin"]}>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/verification"
              element={
                <RequireAuth roles={["admin"]}>
                  <VerificationPage />
                </RequireAuth>
              }
            />
            <Route
              path="/analytics/overview"
              element={
                <RequireAuth roles={["faculty", "admin"]}>
                  <Suspense fallback={<ChartsLoading />}>
                    <OverviewDashboardPage />
                  </Suspense>
                </RequireAuth>
              }
            />
            <Route
              path="/analytics/career"
              element={
                <RequireAuth roles={["faculty", "admin"]}>
                  <Suspense fallback={<ChartsLoading />}>
                    <CareerDashboardPage />
                  </Suspense>
                </RequireAuth>
              }
            />
            <Route
              path="/data-quality"
              element={
                <RequireAuth roles={["admin"]}>
                  <DataQualityPage />
                </RequireAuth>
              }
            />
            <Route
              path="/users"
              element={
                <RequireAuth roles={["admin"]}>
                  <UsersPage />
                </RequireAuth>
              }
            />

            <Route
              path="*"
              element={
                <EmptyState
                  title="Page not found"
                  body="Check the address, or use the tabs above to get back."
                />
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
