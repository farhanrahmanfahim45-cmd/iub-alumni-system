/**
 * Alumni Directory (PRD §11). Faculty and admin.
 *
 * Contact details are deliberately absent from this table — the API doesn't
 * return them in list responses for any role (docs/security.md §4). Email is
 * still searchable; the value just never comes back.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError, buildQuery, getPage } from "../lib/api";
import type { DirectoryRow, PageMeta } from "../lib/types";
import {
  Avatar,
  EmptyState,
  ErrorNote,
  Pagination,
  SkeletonRows,
  StatusPill,
} from "../components/ui";

const DEGREES = ["BBA", "BSc", "B.Pharm", "BA", "BSS", "B.Eng", "LLB"];
const STATUSES = [
  "Employed",
  "Seeking Employment",
  "Further Studies",
  "Self-Employed",
];
const GRAD_YEARS = Array.from({ length: 15 }, (_, i) => 2027 - i);

interface Filters {
  name: string;
  degree: string;
  major: string;
  minor: string;
  graduation_year: string;
  employment_status: string;
  industry: string;
  country: string;
}

const EMPTY_FILTERS: Filters = {
  name: "",
  degree: "",
  major: "",
  minor: "",
  graduation_year: "",
  employment_status: "",
  industry: "",
  country: "",
};

const PAGE_SIZE = 25;

export function DirectoryPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, name: search }));
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(
    () =>
      buildQuery({
        ...filters,
        page,
        page_size: PAGE_SIZE,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
    [filters, page, sortBy, sortOrder],
  );

  // Guards against an earlier request resolving after a later one.
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    getPage<DirectoryRow>(`/api/alumni${query}`)
      .then((res) => {
        if (id !== requestId.current) return;
        setRows(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setError(
          err instanceof ApiError ? err.message : "Couldn't load the directory.",
        );
        setRows([]);
        setMeta(null);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query]);

  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);

  function toggleSort(column: string) {
    if (sortBy === column) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  }

  function clearAll() {
    setFilters(EMPTY_FILTERS);
    setSearch("");
    setPage(1);
  }

  const activeCount = Object.entries(filters).filter(
    ([key, value]) => value !== "" && key !== "name",
  ).length;

  const caret = sortOrder === "asc" ? "↑" : "↓";

  function sortableHeader(label: string, column: string) {
    return (
      <th
        className="sortable"
        onClick={() => toggleSort(column)}
        aria-sort={
          sortBy === column
            ? sortOrder === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        {label}
        {sortBy === column && <span className="sort-caret">{caret}</span>}
      </th>
    );
  }

  return (
    <>
      <div className="page__head">
        <div>
          <h1>Alumni directory</h1>
          <p className="page__count tnum">
            {meta
              ? `${meta.total_records.toLocaleString()} ${
                  meta.total_records === 1 ? "record" : "records"
                }`
              : "Loading…"}
          </p>
        </div>
        <div style={{ minWidth: 260, flex: "0 1 320px" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
            aria-label="Search alumni by name"
          />
        </div>
      </div>

      <div className="layout-split">
        <aside className="card" style={{ padding: "var(--space-4)" }}>
          <div className="filters__head">
            <span className="filters__title">Filters</span>
            {activeCount > 0 && (
              <span className="filters__count tnum">{activeCount}</span>
            )}
          </div>

          <Select
            label="Degree"
            value={filters.degree}
            options={DEGREES}
            onChange={(v) => setFilter("degree", v)}
          />
          <Select
            label="Graduation year"
            value={filters.graduation_year}
            options={GRAD_YEARS.map(String)}
            onChange={(v) => setFilter("graduation_year", v)}
          />
          <Select
            label="Employment status"
            value={filters.employment_status}
            options={STATUSES}
            onChange={(v) => setFilter("employment_status", v)}
          />
          <label className="field">
            <span className="field__label">Major</span>
            <input
              value={filters.major}
              onChange={(e) => setFilter("major", e.target.value)}
              placeholder="International Business"
            />
          </label>
          <label className="field">
            <span className="field__label">Country</span>
            <input
              value={filters.country}
              onChange={(e) => setFilter("country", e.target.value)}
              placeholder="Bangladesh"
            />
          </label>

          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={clearAll}
            disabled={activeCount === 0 && search === ""}
          >
            Clear filters
          </button>
        </aside>

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
                      {sortableHeader("Name", "name")}
                      {sortableHeader("Student ID", "student_id")}
                      {sortableHeader("Degree", "degree")}
                      <th>Major</th>
                      {sortableHeader("Graduated", "graduation_year")}
                      {sortableHeader("Employer", "company")}
                      <th>Status</th>
                    </tr>
                  </thead>

                  {loading ? (
                    <SkeletonRows rows={10} cols={7} />
                  ) : (
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.student_id}
                          className="clickable"
                          tabIndex={0}
                          onClick={() => navigate(`/alumni/${row.student_id}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              navigate(`/alumni/${row.student_id}`);
                            }
                          }}
                        >
                          <td>
                            <span className="cell-person">
                              <Avatar name={row.name} />
                              <span className="cell-name">{row.name}</span>
                            </span>
                          </td>
                          <td className="tnum">{row.student_id}</td>
                          <td>{row.degree}</td>
                          <td>{row.major}</td>
                          <td className="tnum">
                            {row.graduation_year ?? (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>
                            {row.company ?? <span className="muted">—</span>}
                          </td>
                          <td>
                            <StatusPill status={row.employment_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>

              {!loading && rows.length === 0 && (
                <EmptyState
                  title="No alumni match these filters"
                  body="Try widening the search, or clear the filters to start again."
                  action={
                    <button type="button" className="btn btn--ghost" onClick={clearAll}>
                      Clear filters
                    </button>
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
      </div>
    </>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
