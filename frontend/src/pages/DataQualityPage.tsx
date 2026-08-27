/**
 * Data quality (PRD §29). Admin only.
 *
 * A worklist, not a report. Every tile that can lead somewhere is a link, so
 * "3 potential duplicates" is the start of a task rather than a number to
 * write down and go hunting for.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ApiError, getData } from "../lib/api";
import type { DataQuality } from "../lib/types";
import { ErrorNote, SkeletonBlock } from "../components/ui";

interface Tile {
  key: keyof DataQuality;
  label: string;
  hint: string;
  to?: string;
  /** Non-zero is the normal state — don't flag it as a problem. */
  informational?: boolean;
}

const TILES: Tile[] = [
  {
    key: "pending_verification",
    label: "Waiting for review",
    hint: "Submissions from alumni that nobody has decided on yet.",
    to: "/verification",
  },
  {
    key: "incomplete_profiles",
    label: "Incomplete profiles",
    hint: "Missing a phone number, LinkedIn, year, or a linked record.",
    to: "/directory",
  },
  {
    key: "missing_employment_info",
    label: "No employment record",
    hint: "Active alumni with nothing recorded about what they're doing.",
    to: "/directory",
  },
  {
    key: "missing_cgpa",
    label: "No CGPA",
    hint: "Academic records with the CGPA left blank.",
  },
  {
    key: "potential_duplicates",
    label: "Possible duplicates",
    hint: "Two or more active records sharing a name.",
  },
  {
    key: "bba_without_internship",
    label: "BBA without internship",
    hint: "The internship is mandatory for the BBA, so this should be zero.",
  },
  {
    key: "unclaimed_profiles",
    label: "Unclaimed profiles",
    hint: "Alumni who haven't registered an account yet.",
    informational: true,
  },
  {
    key: "deactivated_records",
    label: "Deactivated records",
    hint: "Hidden from the directory and excluded from every dashboard figure.",
    informational: true,
  },
];

export function DataQualityPage() {
  const [data, setData] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getData<DataQuality>("/api/dashboard/data-quality")
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load this."),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonBlock height={320} />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return null;

  const needsAttention = TILES.filter(
    (t) => !t.informational && data[t.key] > 0,
  ).length;

  return (
    <>
      <div className="page__head">
        <div>
          <h1>Data quality</h1>
          <p className="page__count">
            {needsAttention === 0
              ? "Nothing needs attention right now."
              : `${needsAttention} ${needsAttention === 1 ? "area needs" : "areas need"} attention.`}
          </p>
        </div>
      </div>

      <div className="quality-grid">
        {TILES.map((tile) => {
          const value = data[tile.key];
          const flagged = !tile.informational && value > 0;
          const body = (
            <>
              <span className="quality__value tnum">{value.toLocaleString()}</span>
              <span className="quality__label">{tile.label}</span>
              <span className="quality__hint">{tile.hint}</span>
              {tile.to && value > 0 && (
                <span className="quality__cta">Review →</span>
              )}
            </>
          );

          const className = `quality${flagged ? " quality--flagged" : ""}`;

          return tile.to && value > 0 ? (
            <Link key={tile.key} to={tile.to} className={`${className} quality--link`}>
              {body}
            </Link>
          ) : (
            <div key={tile.key} className={className}>
              {body}
            </div>
          );
        })}
      </div>

      <p className="muted" style={{ marginTop: "var(--space-5)" }}>
        These checks run against the live database. The same rules are enforced
        on write, so a figure above zero means existing data to fix, not a gap
        that new entries can widen.
      </p>
    </>
  );
}
