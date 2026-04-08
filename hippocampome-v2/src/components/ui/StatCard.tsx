interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
}

export function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sublabel && (
        <p className="mt-1 text-sm text-gray-400">{sublabel}</p>
      )}
    </div>
  );
}
