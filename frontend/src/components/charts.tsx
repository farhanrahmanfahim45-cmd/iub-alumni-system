/**
 * Analytics primitives.
 *
 * Recharts renders to SVG, so colours are supplied as literal values rather
 * than CSS variables. This palette mirrors the tokens in styles/global.css —
 * change both together.
 *
 * The UI/UX doc calls for horizontal ranked bars over pie charts wherever a
 * breakdown has more than a handful of categories: a pie with twenty
 * industries is unreadable, and these lists stay legible at any length.
 * A donut is reserved for the one genuinely binary split (internship
 * completed or not).
 */

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";

export const PALETTE = {
  navy: "#2e3192",
  purple: "#812990",
  orange: "#f7941d",
  positive: "#1e8e5a",
  neutral: "#5b6370",
  grid: "#e4e7ee",
  ink: "#1a1d24",
  muted: "#808995",
};

/** Categorical series colours, in the order they're assigned. */
const SERIES = [
  PALETTE.navy,
  PALETTE.purple,
  PALETTE.orange,
  PALETTE.positive,
  "#4b5bbd",
  "#a25aae",
  "#c98a3f",
  PALETTE.neutral,
];

const AXIS = {
  stroke: PALETTE.muted,
  fontSize: 12,
  fontFamily: "Inter, sans-serif",
};

const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 8,
    border: "1px solid #e4e7ee",
    boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
  },
};

/* -------------------------------------------------------------------- */
/* KPI                                                                   */
/* -------------------------------------------------------------------- */
export function KpiCard({
  label,
  value,
  detail,
  bar,
  tone = "navy",
}: {
  label: string;
  value: string | number;
  detail?: string;
  /** 0–1. Draws a completion bar under the number. */
  bar?: number | null;
  tone?: "navy" | "purple" | "orange" | "positive" | "neutral";
}) {
  return (
    <div className="kpi">
      <span className="kpi__label">{label}</span>
      <span className="kpi__value tnum">{value}</span>
      {bar !== null && bar !== undefined && (
        <span className="kpi__bar" aria-hidden="true">
          <span
            className={`kpi__bar-fill kpi__bar-fill--${tone}`}
            style={{ width: `${Math.min(100, Math.max(0, bar * 100))}%` }}
          />
        </span>
      )}
      {detail && <span className="kpi__detail">{detail}</span>}
    </div>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="kpi-row">{children}</div>;
}

/* -------------------------------------------------------------------- */
/* Panels                                                                */
/* -------------------------------------------------------------------- */
export function ChartCard({
  title,
  hint,
  children,
  span = 1,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  span?: 1 | 2;
}) {
  return (
    <section className="card" style={span === 2 ? { gridColumn: "span 2" } : undefined}>
      <div className="card__head">
        <div>
          <h2 className="card__title">{title}</h2>
          {hint && (
            <p className="muted" style={{ margin: "var(--space-1) 0 0" }}>
              {hint}
            </p>
          )}
        </div>
      </div>
      <div className="card__body">{children}</div>
    </section>
  );
}

export function NoData({ message = "No data for these filters." }: { message?: string }) {
  return (
    <p className="muted" style={{ margin: 0, padding: "var(--space-5) 0", textAlign: "center" }}>
      {message}
    </p>
  );
}

/* -------------------------------------------------------------------- */
/* Ranked bar list — the default for a breakdown                         */
/* -------------------------------------------------------------------- */
export function BarList({
  rows,
  labelKey,
  valueKey,
  limit,
  colorByIndex = false,
}: {
  rows: Record<string, string | number | null>[];
  labelKey: string;
  valueKey: string;
  limit?: number;
  colorByIndex?: boolean;
}) {
  if (rows.length === 0) return <NoData />;
  const shown = limit ? rows.slice(0, limit) : rows;
  const max = Math.max(...shown.map((r) => Number(r[valueKey] ?? 0)), 1);
  const total = rows.reduce((sum, r) => sum + Number(r[valueKey] ?? 0), 0);

  return (
    <ul className="barlist">
      {shown.map((row, i) => {
        const value = Number(row[valueKey] ?? 0);
        const share = total > 0 ? Math.round((value / total) * 100) : 0;
        return (
          <li className="barlist__row" key={String(row[labelKey]) + i}>
            <span className="barlist__label" title={String(row[labelKey] ?? "")}>
              {String(row[labelKey] ?? "—")}
            </span>
            <span className="barlist__track">
              <span
                className="barlist__fill"
                style={{
                  width: `${(value / max) * 100}%`,
                  background: colorByIndex ? SERIES[i % SERIES.length] : PALETTE.navy,
                }}
              />
            </span>
            <span className="barlist__value tnum">{value.toLocaleString()}</span>
            <span className="barlist__share tnum muted">{share}%</span>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------- */
/* Recharts wrappers                                                     */
/* -------------------------------------------------------------------- */
export function TrendChart({
  rows,
  xKey,
  series,
  height = 260,
}: {
  rows: Record<string, string | number | null>[];
  xKey: string;
  series: { key: string; name: string; color?: string }[];
  height?: number;
}) {
  if (rows.length === 0) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: PALETTE.grid }} tick={AXIS} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} allowDecimals={false} />
        <Tooltip {...TOOLTIP_STYLE} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? SERIES[i % SERIES.length]}
            strokeWidth={2}
            dot={{ r: 2.5 }}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ColumnChart({
  rows,
  xKey,
  valueKey,
  name,
  height = 260,
}: {
  rows: Record<string, string | number | null>[];
  xKey: string;
  valueKey: string;
  name: string;
  height?: number;
}) {
  if (rows.length === 0) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: PALETTE.grid }} tick={AXIS} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} allowDecimals={false} />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "#f6f7fb" }} />
        <Bar dataKey={valueKey} name={name} fill={PALETTE.navy} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Reserved for genuinely binary splits — see the note at the top. */
export function DonutChart({
  rows,
  labelKey,
  valueKey,
  height = 220,
}: {
  rows: Record<string, string | number | null>[];
  labelKey: string;
  valueKey: string;
  height?: number;
}) {
  if (rows.length === 0) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={rows}
          dataKey={valueKey}
          nameKey={labelKey}
          innerRadius="58%"
          outerRadius="82%"
          paddingAngle={2}
          stroke="none"
        >
          {rows.map((_, i) => (
            <Cell key={i} fill={i === 0 ? PALETTE.positive : PALETTE.neutral} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
