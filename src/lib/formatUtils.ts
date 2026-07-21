export function formatCurrency(amount: number, locale = 'en-IN', currency = 'INR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatXP(xp: number): string {
  return new Intl.NumberFormat('en-US').format(xp) + ' XP';
}

export function formatPercentage(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

export function formatFocusTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatHours(hours: number, decimals = 1): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
  }).format(hours) + 'h';
}

export function formatNumber(count: number): string {
  return new Intl.NumberFormat('en-US').format(count);
}
