/**
 * Dashboard 2 — Career Landscape (PRD §17). Faculty and admin.
 *
 * The filter options for industry and country are read from the first
 * unfiltered response rather than hardcoded, so the lists always match
 * what's actually in the data.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, buildQuery, getData } from "../lib/api";
import type { CareerDashboard } from "../lib/types";
import {
  BarList,
  ChartCard,
  KpiCard,
  KpiRow,
  NoData,
  TrendChart,
} from "../components/charts";
import {
  FilterBar,
  NO_FILTERS,
  type DashboardFilters,
} from "../components/FilterBar";
import { ErrorNote, SkeletonBlock } from "../components/ui";

export function CareerDashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(NO_FILTERS);
  const [data, setData] = useState<CareerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<{ industries: string[]; countries: string[] }>({
    industries: [],
    countries: [],
  });

  const query = useMemo(() => buildQuery({ ...filters, top_n: 10 }), [filters]);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    getData<CareerDashboard>(`/api/dashboard/career${query}`)
      .then((res) => {
        if (id !== requestId.current) return;
        setData(res);
        // Populate the dropdowns once, from the unfiltered view.
        setOptions((prev) =>
          prev.industries.length > 0
            ? prev
            : {
                industries: (res.charts.employment_by_industry ?? [])
                  .map((r) => String(r.industry))
                  .sort(),
                countries: (res.charts.employment_by_country ?? [])
                  .map((r) => String(r.country))
                  .sort(),
              },
        );
      })
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
          <h1>Career landscape</h1>
          <p className="page__count">
            Where alumni are working, in what industries, and where in the world.
          </p>
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilter}
        onClear={() => setFilters(NO_FILTERS)}
        showCareer
        industries={options.industries}
        countries={options.countries}
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
            <KpiCard
              label="Employed"
              value={(kpis?.employed ?? 0).toLocaleString()}
              bar={total ? (kpis?.employed ?? 0) / total : 0}
              tone="positive"
              detail={
                total
                  ? `${Math.round(((kpis?.employed ?? 0) / total) * 100)}% of this group`
                  : undefined
              }
            />
            <KpiCard
              label="Self-employed"
              value={(kpis?.self_employed ?? 0).toLocaleString()}
              bar={total ? (kpis?.self_employed ?? 0) / total : 0}
              tone="positive"
            />
            <KpiCard
              label="Further studies"
              value={(kpis?.further_studies ?? 0).toLocaleString()}
              bar={total ? (kpis?.further_studies ?? 0) / total : 0}
              tone="purple"
            />
            <KpiCard
              label="Seeking work"
              value={(kpis?.seeking_employment ?? 0).toLocaleString()}
              bar={total ? (kpis?.seeking_employment ?? 0) / total : 0}
              tone="orange"
            />
            <KpiCard
              label="In work"
              value={
                kpis?.employment_rate !== null && kpis?.employment_rate !== undefined
                  ? `${Math.round(kpis.employment_rate * 100)}%`
                  : "—"
              }
              bar={kpis?.employment_rate ?? null}
              detail="employed or self-employed"
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
                title="Employment by cohort"
                hint="How many of each graduating year are employed."
                span={2}
              >
                <TrendChart
                  rows={charts.employment_by_graduation_year ?? []}
                  xKey="year"
                  series={[
                    { key: "total", name: "Alumni" },
                    { key: "employed", name: "Employed", color: "#1e8e5a" },
                  ]}
                />
              </ChartCard>

              <ChartCard title="Industries" hint="Top ten by number of alumni.">
                <BarList
                  rows={charts.employment_by_industry ?? []}
                  labelKey="industry"
                  valueKey="count"
                  limit={10}
                />
              </ChartCard>

              <ChartCard title="Top employers" hint="Where the most alumni work.">
                <BarList
                  rows={charts.top_employers ?? []}
                  labelKey="company"
                  valueKey="count"
                />
              </ChartCard>

              <ChartCard title="Job functions" hint="The kind of work they do.">
                <BarList
                  rows={charts.employment_by_job_function ?? []}
                  labelKey="job_function"
                  valueKey="count"
                  colorByIndex
                />
              </ChartCard>

              <ChartCard title="Countries" hint="Where alumni are based.">
                <BarList
                  rows={charts.employment_by_country ?? []}
                  labelKey="country"
                  valueKey="count"
                  limit={10}
                />
              </ChartCard>

              <ChartCard
                title="Roles held"
                hint="Current position plus any previous ones on record."
                span={2}
              >
                <BarList
                  rows={(charts.career_progression ?? []).map((r) => ({
                    ...r,
                    label:
                      Number(r.roles_held) === 1
                        ? "1 role"
                        : `${r.roles_held} roles`,
                  }))}
                  labelKey="label"
                  valueKey="alumni"
                />
              </ChartCard>
            </div>
          )}
        </div>
      )}
    </>
  );
}
