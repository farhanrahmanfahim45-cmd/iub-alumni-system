/**
 * Dashboard 1 — Alumni & Academic Overview (PRD §16). Faculty and admin.
 *
 * Every number here is aggregated by PostgreSQL; this page renders what it
 * receives and counts nothing itself. Filters change the query, so the whole
 * page moves together and the figures stay consistent with each other.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, buildQuery, getData } from "../lib/api";
import type { OverviewDashboard } from "../lib/types";
import {
  BarList,
  ChartCard,
  ColumnChart,
  DonutChart,
  KpiCard,
  KpiRow,
  NoData,
} from "../components/charts";
import {
  FilterBar,
  NO_FILTERS,
  type DashboardFilters,
} from "../components/FilterBar";
import { ErrorNote, SkeletonBlock } from "../components/ui";

export function OverviewDashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(NO_FILTERS);
  const [data, setData] = useState<OverviewDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () =>
      buildQuery({
        graduation_year: filters.graduation_year,
        degree: filters.degree,
        major: filters.major,
        minor: filters.minor,
      }),
    [filters],
  );

  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    getData<OverviewDashboard>(`/api/dashboard/overview${query}`)
      .then((res) => id === requestId.current && setData(res))
      .catch(
        (err) =>
          id === requestId.current &&
          setError(
            err instanceof ApiError ? err.message : "Couldn't load the dashboard.",
          ),
      )
      .finally(() => id === requestId.current && setLoading(false));
  }, [query]);

  const setFilter = useCallback(
    (key: keyof DashboardFilters, value: string) =>
      setFilters((f) => ({ ...f, [key]: value })),
    [],
  );

  const kpis = data?.kpis;
  const charts = data?.charts ?? {};
  const total = kpis?.total_alumni ?? 0;

  return (
    <>
      <div className="page__head">
        <div>
          <h1>Academic overview</h1>
          <p className="page__count">
            Alumni of the Department of International Business, by degree, cohort
            and academic record.
          </p>
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilter}
        onClear={() => setFilters(NO_FILTERS)}
      />

      {error ? (
        <ErrorNote message={error} />
      ) : loading && !data ? (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          <SkeletonBlock height={112} />
          <SkeletonBlock height={300} />
        </div>
      ) : (
        <div className={loading ? "dash dash--refreshing" : "dash"}>
          <KpiRow>
            <KpiCard label="Alumni" value={total.toLocaleString()} />
            <KpiCard
              label="IB majors"
              value={(kpis?.ib_majors ?? 0).toLocaleString()}
              bar={total ? (kpis?.ib_majors ?? 0) / total : 0}
              detail={
                total
                  ? `${Math.round(((kpis?.ib_majors ?? 0) / total) * 100)}% of this group`
                  : undefined
              }
            />
            <KpiCard
              label="IB minors"
              value={(kpis?.ib_minors ?? 0).toLocaleString()}
              bar={total ? (kpis?.ib_minors ?? 0) / total : 0}
              tone="purple"
              detail={
                total
                  ? `${Math.round(((kpis?.ib_minors ?? 0) / total) * 100)}% of this group`
                  : undefined
              }
            />
            <KpiCard
              label="Average CGPA"
              value={kpis?.average_cgpa?.toFixed(2) ?? "—"}
              bar={kpis?.average_cgpa ? kpis.average_cgpa / 4 : null}
              tone="positive"
              detail="out of 4.00"
            />
            <KpiCard
              label="Internship completed"
              value={
                kpis?.internship_completion_rate !== null &&
                kpis?.internship_completion_rate !== undefined
                  ? `${Math.round(kpis.internship_completion_rate * 100)}%`
                  : "—"
              }
              bar={kpis?.internship_completion_rate ?? null}
              tone="orange"
            />
          </KpiRow>

          {total === 0 ? (
            <div className="card">
              <div className="card__body">
                <NoData message="No alumni match these filters. Clear one to widen the group." />
              </div>
            </div>
          ) : (
            <div className="dash__grid">
              <ChartCard
                title="Alumni by graduation year"
                hint="How many graduated in each cohort."
                span={2}
              >
                <ColumnChart
                  rows={charts.alumni_by_graduation_year ?? []}
                  xKey="year"
                  valueKey="count"
                  name="Alumni"
                />
              </ChartCard>

              <ChartCard title="Degrees" hint="Which degree each alumnus holds.">
                <BarList
                  rows={charts.degree_distribution ?? []}
                  labelKey="degree"
                  valueKey="count"
                  colorByIndex
                />
              </ChartCard>

              <ChartCard title="Internship" hint="Mandatory for the BBA.">
                <DonutChart
                  rows={charts.internship_completion ?? []}
                  labelKey="status"
                  valueKey="count"
                />
              </ChartCard>

              <ChartCard title="Majors" hint="Top ten by number of alumni.">
                <BarList
                  rows={charts.major_distribution ?? []}
                  labelKey="major"
                  valueKey="count"
                  limit={10}
                />
              </ChartCard>

              <ChartCard
                title="Minors"
                hint="Alumni with no minor aren't counted here."
              >
                <BarList
                  rows={charts.minor_distribution ?? []}
                  labelKey="minor"
                  valueKey="count"
                  limit={10}
                />
              </ChartCard>

              <ChartCard title="CGPA" hint="Grouped into bands.">
                <BarList
                  rows={charts.cgpa_distribution ?? []}
                  labelKey="bucket"
                  valueKey="count"
                />
              </ChartCard>

              <ChartCard
                title="Academic honours"
                hint="Only alumni who received one."
              >
                <BarList
                  rows={charts.academic_honors ?? []}
                  labelKey="honor"
                  valueKey="count"
                />
              </ChartCard>
            </div>
          )}
        </div>
      )}
    </>
  );
}
