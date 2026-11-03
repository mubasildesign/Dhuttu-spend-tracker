"use client";

import {
  categoryColor,
  categoryLabel,
  formatInr,
  methodColor,
  methodLabel,
  type PaymentMethod,
  type SpendCategory,
} from "@spend-tracker/shared";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Trend / compare colors — separate from brand UI accent */
const TREND = "#2E9BB5";
const WEEK_THIS = "#5B8DEF";
const WEEK_LAST = "#94A3B8";

type Cat = { category: SpendCategory; total: number };
type Day = { day: string; total: number };
type Method = { method: PaymentMethod | "unknown"; total: number };
type Week = { label: string; total: number };

function tipStyle() {
  return {
    border: "1px solid var(--line)",
    borderRadius: 12,
    background: "var(--surface)",
    color: "var(--ink)",
  };
}

export function CategoryDonut({ rows }: { rows: Cat[] }) {
  if (!rows.length) return <div className="empty">No category data yet</div>;
  const data = rows.map((r) => ({
    category: r.category,
    name: categoryLabel(r.category),
    value: Math.round(r.total),
    color: categoryColor(r.category),
  }));
  return (
    <div>
      <div className="chart-wrap" role="img" aria-label="Category share pie chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
              {data.map((d) => (
                <Cell key={d.category} fill={d.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatInr(Number(v ?? 0))} contentStyle={tipStyle()} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chips">
        {data.slice(0, 6).map((d) => (
          <span key={d.category} className="chip soft" style={{ color: "var(--ink)" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: d.color,
                display: "inline-block",
              }}
            />
            {d.name} · {formatInr(d.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CategoryBars({ rows }: { rows: Cat[] }) {
  if (!rows.length) return <div className="empty">No category data yet</div>;
  const data = rows.map((r) => ({
    category: r.category,
    name: categoryLabel(r.category),
    total: Math.round(r.total),
    color: categoryColor(r.category),
  }));
  return (
    <div className="chart-wrap tall" role="img" aria-label="Category comparison bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--line)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fill: "var(--ink)", fontSize: 11 }} />
          <Tooltip formatter={(v) => formatInr(Number(v ?? 0))} contentStyle={tipStyle()} />
          <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={14}>
            {data.map((d) => (
              <Cell key={d.category} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyArea({ rows }: { rows: Day[] }) {
  if (rows.every((r) => r.total === 0)) return <div className="empty">No daily spend yet</div>;
  return (
    <div className="chart-wrap" role="img" aria-label="Daily spend trend">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TREND} stopOpacity={0.35} />
              <stop offset="100%" stopColor={TREND} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 10 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} width={36} />
          <Tooltip formatter={(v) => formatInr(Number(v ?? 0))} contentStyle={tipStyle()} />
          <Area
            type="monotone"
            dataKey="total"
            stroke={TREND}
            fill="url(#spendFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MethodBars({ rows }: { rows: Method[] }) {
  if (!rows.length) return <div className="empty">No payment data yet</div>;
  const data = rows.map((r) => ({
    method: r.method,
    name: r.method === "unknown" ? "Unknown" : methodLabel(r.method),
    total: Math.round(r.total),
    color: methodColor(r.method),
  }));
  return (
    <div className="chart-wrap sm" role="img" aria-label="Payment method breakdown">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} width={36} />
          <Tooltip formatter={(v) => formatInr(Number(v ?? 0))} contentStyle={tipStyle()} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.method} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeekCompare({ rows }: { rows: Week[] }) {
  if (!rows.length) return <div className="empty">Need more days for week compare</div>;
  return (
    <div className="chart-wrap sm" role="img" aria-label="This week vs last week">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} width={36} />
          <Tooltip formatter={(v) => formatInr(Number(v ?? 0))} contentStyle={tipStyle()} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {rows.map((_, i) => (
              <Cell key={i} fill={i === 1 ? WEEK_THIS : WEEK_LAST} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
