export function format(value: number) {
  return new Intl.NumberFormat("es-CO").format(Math.round(value || 0));
}

export function secondsLabel(seconds?: number) {
  const safe = Math.max(0, Math.round(seconds ?? 0));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}m ${rest}s`;
}

export function percent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(0)}%`;
}
