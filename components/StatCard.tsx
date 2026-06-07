import { COLORS } from "@/lib/constants";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  accent?: "navy" | "red" | "peach";
}

export function StatCard({ label, value, subtext, accent = "navy" }: StatCardProps) {
  const accentColor =
    accent === "red" ? COLORS.red : accent === "peach" ? COLORS.peach : COLORS.navy;

  return (
    <div className="border border-[var(--cream-dark)] bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--navy-muted)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold" style={{ color: accentColor }}>
        {value}
      </p>
      {subtext && (
        <p className="mt-1 text-sm text-[var(--navy-muted)]">{subtext}</p>
      )}
    </div>
  );
}
