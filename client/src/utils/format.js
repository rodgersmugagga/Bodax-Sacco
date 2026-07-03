export function money(value) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function shortDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium' }).format(new Date(value));
}

/** Strip commas from a user-typed amount string so "50,000" becomes "50000" */
export function stripCommas(value) {
  if (typeof value === 'string') return value.replace(/,/g, '');
  return String(value);
}

/** Format a number with commas for display while typing */
export function formatAmountInput(value) {
  if (!value) return '';
  const cleaned = value.replace(/[^0-9,]/g, '');
  // Remove existing commas, then re-add every 3 digits from right
  const digits = cleaned.replace(/,/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

/** Format a date as dd/mm/yyyy for display */
export function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value));
}
