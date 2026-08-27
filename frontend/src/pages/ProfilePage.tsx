/**
 * Alumni profile (PRD §8).
 *
 * Used for both the staff view (`/alumni/:studentId`) and an alumnus's own
 * page (`/me`). The API decides what a viewer may see; this page renders
 * what it receives and explains anything it can't show.
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { ApiError, getData } from "../lib/api";
import type { AlumniProfile } from "../lib/types";
import { ErrorNote, SkeletonBlock, StatusPill } from "../components/ui";

export function ProfilePage({ own = false }: { own?: boolean }) {
  const { session } = useAuth();
  const params = useParams<{ studentId: string }>();
  const studentId = own ? session?.studentId : params.studentId;

  const [profile, setProfile] = useState<AlumniProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getData<AlumniProfile>(`/api/alumni/${studentId}`)
      .then((data) => !cancelled && setProfile(data))
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Couldn't load this profile.",
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        <SkeletonBlock height={96} />
        <SkeletonBlock height={220} />
        <SkeletonBlock height={180} />
      </div>
    );
  }

  if (error) return <ErrorNote message={error} />;
  if (!profile) return null;

  const name = `${profile.first_name} ${profile.last_name}`;
  const academic = profile.academic;
  const job = profile.current_employment;

  return (
    <>
      <div className="page__head">
        <div>
          <h1>{name}</h1>
          <p className="page__count">
            <span className="tnum">{profile.student_id}</span> ·{" "}
            <span className="tnum">{profile.alumni_id}</span> · {profile.degree} in{" "}
            {profile.major}
            {profile.minor ? `, minor in ${profile.minor}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          {profile.record_status !== "active" && (
            <StatusPill status={profile.record_status} />
          )}
          {own && (
            <Link className="btn" to="/me/update">
              Update my information
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        <Section title="Contact">
          {profile.contact_details_visible ? (
            <Fields
              rows={[
                ["Email", profile.personal_email],
                ["IUB email", profile.institutional_email],
                ["Phone", profile.phone],
                [
                  "LinkedIn",
                  profile.linkedin_url ? (
                    <a href={profile.linkedin_url} target="_blank" rel="noreferrer">
                      View profile
                    </a>
                  ) : null,
                ],
              ]}
            />
          ) : (
            /* Not an error, and not empty fields — say why they're absent. */
            <p className="muted" style={{ margin: 0 }}>
              Contact details are restricted to administrators.
            </p>
          )}
        </Section>

        <Section title="Academic">
          <Fields
            rows={[
              ["Degree", profile.degree],
              ["Major", profile.major],
              ["Minor", profile.minor],
              ["Admitted", profile.admission_year],
              ["Graduated", profile.graduation_year],
              ["CGPA", academic?.cgpa?.toFixed(2) ?? null],
              ["Honours", academic?.academic_honors],
              ["Research interest", academic?.research_interest],
            ]}
          />
        </Section>

        <Section title="Internship">
          {academic?.internship_completed ? (
            <Fields
              rows={[
                ["Organisation", academic.internship_organization],
                ["Position", academic.internship_position],
                ["Industry", academic.internship_industry],
              ]}
            />
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No internship recorded.
            </p>
          )}
        </Section>

        <Section
          title="Current position"
          aside={job && <StatusPill status={job.employment_status} />}
        >
          {job && (job.company || job.job_title) ? (
            <Fields
              rows={[
                ["Employer", job.company],
                ["Role", job.job_title],
                ["Industry", job.industry],
                ["Function", job.job_function],
                [
                  "Location",
                  [job.city, job.country].filter(Boolean).join(", ") || null,
                ],
                ["Since", job.start_year],
              ]}
            />
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              {job
                ? `Currently ${job.employment_status.toLowerCase()}.`
                : "No employment recorded."}
            </p>
          )}
        </Section>

        <Section title="Previous roles">
          {profile.employment_history.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No previous roles recorded.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Organisation</th>
                    <th>Role</th>
                    <th>Industry</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.employment_history.map((entry) => (
                    <tr key={entry.employment_history_id}>
                      <td className="tnum">
                        {entry.start_year ?? "—"} – {entry.end_year ?? "Present"}
                      </td>
                      <td>{entry.company ?? <span className="muted">—</span>}</td>
                      <td>{entry.job_title ?? <span className="muted">—</span>}</td>
                      <td>{entry.industry ?? <span className="muted">—</span>}</td>
                      <td>
                        {[entry.city, entry.country].filter(Boolean).join(", ") || (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="card__head">
        <h2 className="card__title">{title}</h2>
        {aside}
      </div>
      <div className="card__body">{children}</div>
    </section>
  );
}

/** A missing optional value shows an em dash, not an error. */
function Fields({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "var(--space-4) var(--space-5)",
        margin: 0,
      }}
    >
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="field__label" style={{ marginBottom: "var(--space-1)" }}>
            {label}
          </dt>
          <dd style={{ margin: 0 }} className="tnum">
            {value === null || value === undefined || value === "" ? (
              <span className="muted">—</span>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
