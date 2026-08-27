/**
 * The dashboard filter bar.
 *
 * Pinned directly above the charts rather than tucked in a sidebar, because
 * the PRD requires every visual to react to it — that relationship should be
 * visible, not discovered.
 */

const DEGREES = ["BBA", "BSc", "B.Pharm", "BA", "BSS", "B.Eng", "LLB"];
const GRAD_YEARS = Array.from({ length: 15 }, (_, i) => String(2027 - i));
const STATUSES = [
  "Employed",
  "Seeking Employment",
  "Further Studies",
  "Self-Employed",
];

export interface DashboardFilters {
  graduation_year: string;
  degree: string;
  major: string;
  minor: string;
  employment_status: string;
  industry: string;
  country: string;
}

export const NO_FILTERS: DashboardFilters = {
  graduation_year: "",
  degree: "",
  major: "",
  minor: "",
  employment_status: "",
  industry: "",
  country: "",
};

export function activeFilterCount(filters: DashboardFilters): number {
  return Object.values(filters).filter((v) => v !== "").length;
}

export function FilterBar({
  filters,
  onChange,
  onClear,
  showCareer = false,
  industries = [],
  countries = [],
}: {
  filters: DashboardFilters;
  onChange: (key: keyof DashboardFilters, value: string) => void;
  onClear: () => void;
  showCareer?: boolean;
  industries?: string[];
  countries?: string[];
}) {
  const count = activeFilterCount(filters);

  return (
    <div className="filterbar">
      <Pick
        label="Graduation year"
        value={filters.graduation_year}
        options={GRAD_YEARS}
        onChange={(v) => onChange("graduation_year", v)}
      />
      <Pick
        label="Degree"
        value={filters.degree}
        options={DEGREES}
        onChange={(v) => onChange("degree", v)}
      />
      <Pick
        label="Major"
        value={filters.major}
        options={["International Business"]}
        onChange={(v) => onChange("major", v)}
      />
      <Pick
        label="Minor"
        value={filters.minor}
        options={["International Business"]}
        onChange={(v) => onChange("minor", v)}
      />

      {showCareer && (
        <>
          <Pick
            label="Status"
            value={filters.employment_status}
            options={STATUSES}
            onChange={(v) => onChange("employment_status", v)}
          />
          <Pick
            label="Industry"
            value={filters.industry}
            options={industries}
            onChange={(v) => onChange("industry", v)}
          />
          <Pick
            label="Country"
            value={filters.country}
            options={countries}
            onChange={(v) => onChange("country", v)}
          />
        </>
      )}

      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={onClear}
        disabled={count === 0}
      >
        Clear{count > 0 ? ` (${count})` : ""}
      </button>
    </div>
  );
}

function Pick({
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
    <label className="filterbar__field">
      <span className="field__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
