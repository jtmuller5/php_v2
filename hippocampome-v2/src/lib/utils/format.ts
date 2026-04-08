/**
 * Format a number with appropriate precision for display.
 */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "—";
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(decimals);
}

/**
 * Format a PubMed ID as a link-friendly string.
 */
export function formatPmid(pmid: number | null): string {
  if (!pmid) return "—";
  return `PMID: ${pmid}`;
}

/**
 * Format neuron type name for display: "DG Granule" -> "DG: Granule"
 */
export function formatNeuronName(
  subregion: string,
  nickname: string
): string {
  return `${subregion}: ${nickname}`;
}

/**
 * Format excitatory/inhibitory as a short label.
 */
export function formatExcitInhib(
  type: "excitatory" | "inhibitory" | "unknown"
): string {
  switch (type) {
    case "excitatory":
      return "Excitatory";
    case "inhibitory":
      return "Inhibitory";
    default:
      return "Unknown";
  }
}

/**
 * Format a population count with bounds.
 */
export function formatPopulation(
  count: number | null,
  lower: number | null,
  upper: number | null
): string {
  if (count == null) return "—";
  const formatted = count.toLocaleString();
  if (lower != null && upper != null) {
    return `${formatted} (${lower.toLocaleString()}–${upper.toLocaleString()})`;
  }
  return formatted;
}
