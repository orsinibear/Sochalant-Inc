"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { COLORS } from "@/lib/constants";
import type { SimulationPoint } from "@/lib/types";

interface SimulationPanelProps {
  data: SimulationPoint[];
  ilReduction: number;
  yieldImprovement: string;
}

export function SimulationPanel({ data, ilReduction, yieldImprovement }: SimulationPanelProps) {
  const finalUnprotected = data[data.length - 1]?.unprotected ?? 0;
  const finalSochalant = data[data.length - 1]?.sochalant ?? 0;

  return (
    <div id="simulation" className="border border-[var(--cream-dark)] bg-white p-6">
      <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--navy-muted)]">
        Performance Comparison
      </h2>
      <p className="mt-1 text-xs text-[var(--navy-muted)]">
        Illustrative 30-day projection — on-chain vault data shown above
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="border border-[var(--cream-dark)] p-3 text-center">
          <p className="text-xs text-[var(--navy-muted)]">IL Reduction</p>
          <p className="font-mono text-xl font-semibold" style={{ color: COLORS.red }}>
            {ilReduction}%
          </p>
        </div>
        <div className="border border-[var(--cream-dark)] p-3 text-center">
          <p className="text-xs text-[var(--navy-muted)]">Net Yield Improvement</p>
          <p className="font-mono text-xl font-semibold" style={{ color: COLORS.peach }}>
            +{yieldImprovement}%
          </p>
        </div>
        <div className="border border-[var(--cream-dark)] p-3 text-center">
          <p className="text-xs text-[var(--navy-muted)]">Final Value Delta</p>
          <p className="font-mono text-xl font-semibold text-[var(--navy)]">
            +${(finalSochalant - finalUnprotected).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke={COLORS.creamDark} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: COLORS.navyMuted }}
              axisLine={{ stroke: COLORS.creamDark }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: COLORS.navyMuted }}
              axisLine={{ stroke: COLORS.creamDark }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                border: `1px solid ${COLORS.creamDark}`,
                backgroundColor: "white",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="unprotected"
              name="Unprotected LP"
              stroke={COLORS.navyMuted}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="sochalant"
              name="Sochalant LP"
              stroke={COLORS.red}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 h-48">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--navy-muted)]">
          Daily Impermanent Loss
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(-14)}>
            <CartesianGrid stroke={COLORS.creamDark} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: COLORS.navyMuted }}
              axisLine={{ stroke: COLORS.creamDark }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: COLORS.navyMuted }}
              axisLine={{ stroke: COLORS.creamDark }}
            />
            <Tooltip
              contentStyle={{
                border: `1px solid ${COLORS.creamDark}`,
                backgroundColor: "white",
                fontSize: 12,
              }}
            />
            <Bar dataKey="ilUnprotected" name="Unprotected IL" fill={COLORS.navyMuted} />
            <Bar dataKey="ilSochalant" name="Sochalant IL" fill={COLORS.peach} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
