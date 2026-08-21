export function horizontalBar(
  label: string,
  value: number | null,
  options: { max?: number; width?: number; digits?: number } = {},
): string {
  const max = options.max ?? 80;
  const width = options.width ?? 18;
  const labelWidth = 8;
  if (value === null || !Number.isFinite(value)) {
    return `${label.padEnd(labelWidth)} ${"—".padEnd(width)} —`;
  }
  const clamped = Math.max(0, Math.min(max, value));
  const filled = Math.round((clamped / max) * width);
  const bar = `${"█".repeat(filled)}${"░".repeat(Math.max(0, width - filled))}`;
  const text = value >= 100 ? value.toFixed(0) : value.toFixed(options.digits ?? 1);
  return `${label.padEnd(labelWidth)} ${bar} ${text}`;
}
