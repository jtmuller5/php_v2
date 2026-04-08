/**
 * Convert an array of objects to CSV string.
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: (keyof T)[]
): string {
  if (data.length === 0) return "";

  const keys = columns ?? (Object.keys(data[0]) as (keyof T)[]);
  const header = keys.map(String).join(",");
  const rows = data.map((row) =>
    keys
      .map((key) => {
        const val = row[key];
        if (val == null) return "";
        const str = String(val);
        // Escape commas and quotes
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}

/**
 * Trigger a browser download of a string as a file.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = "text/csv"
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download simulation data as CSV.
 */
export function downloadSimulationCSV(
  t: Float64Array,
  v: Float64Array,
  filename = "simulation.csv"
) {
  const rows = ["time_ms,voltage_mV"];
  for (let i = 0; i < t.length; i++) {
    rows.push(`${t[i].toFixed(4)},${v[i].toFixed(4)}`);
  }
  downloadFile(rows.join("\n"), filename);
}
