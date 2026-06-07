export const COLORS = {
  navy: "#1B2A4A",
  cream: "#F7F3EB",
  red: "#C0392B",
  peach: "#C97858",
  creamDark: "#E8E0D4",
  navyMuted: "#3D4F6F",
} as const;

export const SENIOR_PERCENT = 70;
export const JUNIOR_PERCENT = 30;

export const RISK_THRESHOLDS = {
  low: 30,
  medium: 70,
} as const;

export const HEDGE_THRESHOLDS = {
  full: 70,
  partial: 40,
  stable: 30,
  unwind: 30,
} as const;
