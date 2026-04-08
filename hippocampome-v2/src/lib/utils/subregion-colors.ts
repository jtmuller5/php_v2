export const SUBREGION_COLORS = {
  DG: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-300",
    hex: "#10b981",
    label: "Dentate Gyrus",
  },
  CA3: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
    hex: "#3b82f6",
    label: "CA3",
  },
  CA2: {
    bg: "bg-violet-100",
    text: "text-violet-800",
    border: "border-violet-300",
    hex: "#8b5cf6",
    label: "CA2",
  },
  CA1: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
    hex: "#f59e0b",
    label: "CA1",
  },
  Sub: {
    bg: "bg-rose-100",
    text: "text-rose-800",
    border: "border-rose-300",
    hex: "#f43f5e",
    label: "Subiculum",
  },
  EC: {
    bg: "bg-cyan-100",
    text: "text-cyan-800",
    border: "border-cyan-300",
    hex: "#06b6d4",
    label: "Entorhinal Cortex",
  },
} as const;

export type SubregionId = keyof typeof SUBREGION_COLORS;

export function getSubregionColor(id: string) {
  return (
    SUBREGION_COLORS[id as SubregionId] ?? {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
      hex: "#6b7280",
      label: id,
    }
  );
}
