import { getSubregionColor } from "@/lib/utils/subregion-colors";

interface SubregionBadgeProps {
  subregion: string;
  size?: "sm" | "md" | "lg";
}

export function SubregionBadge({ subregion, size = "md" }: SubregionBadgeProps) {
  const color = getSubregionColor(subregion);

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${color.bg} ${color.text} ${color.border} border ${sizeClasses[size]}`}
    >
      {subregion}
    </span>
  );
}
