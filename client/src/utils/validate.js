/**
 * Centralized validation helpers for Bodax SACCO forms.
 * Each validator returns an error string or '' (empty = valid).
 */

/* ── Primitive checks ───────────────────────────────────────── */

export function requiredField(value, label = 'This field') {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${label} is required`;
  }
  return '';
}

export function minLength(value, min, label = 'This field') {
  if (String(value).trim().length < min) {
    return `${label} must be at least ${min} characters`;
  }
  return '';
}

export function maxLength(value, max, label = 'This field') {
  if (String(value).trim().length > max) {
    return `${label} must be at most ${max} characters`;
  }
  return '';
}

/* ── Money / numbers ────────────────────────────────────────── */

export function positiveAmount(value, label = 'Amount') {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    return `${label} must be greater than zero`;
  }
  return '';
}

export function minAmount(value, min, label = 'Amount') {
  const num = Number(value);
  if (isNaN(num) || num < min) {
    return `${label} must be at least ${min.toLocaleString()}`;
  }
  return '';
}

export function maxAmount(value, max, label = 'Amount') {
  const num = Number(value);
  if (isNaN(num) || num > max) {
    return `${label} cannot exceed ${max.toLocaleString()}`;
  }
  return '';
}

export function positiveInteger(value, label = 'Value') {
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num < 1) {
    return `${label} must be a whole number greater than zero`;
  }
  return '';
}

export function percentRange(value, label = 'Rate') {
  const num = Number(value);
  if (isNaN(num) || num < 0 || num > 100) {
    return `${label} must be between 0 and 100`;
  }
  return '';
}

/* ── Dates ──────────────────────────────────────────────────── */

export function notFutureDate(value, label = 'Date') {
  if (!value) return '';
  const selected = new Date(value);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (selected > today) {
    return `${label} cannot be in the future`;
  }
  return '';
}

export function notPastDate(value, label = 'Date') {
  if (!value) return '';
  const selected = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selected < today) {
    return `${label} cannot be in the past`;
  }
  return '';
}

export function dateRequired(value, label = 'Date') {
  if (!value) return `${label} is required`;
  return '';
}

/* ── Ugandan phone number ──────────────────────────────────── */

// Accepts: 07XXXXXXXX, +2567XXXXXXXX, 2567XXXXXXXX
const UG_PHONE_RE = /^(?:\+?256|0)7\d{8}$/;

export function ugPhoneNumber(value, label = 'Phone number') {
  const cleaned = String(value).replace(/[\s-]/g, '');
  if (!cleaned) return `${label} is required`;
  if (!UG_PHONE_RE.test(cleaned)) {
    return `${label} must be a valid Ugandan number (e.g. 07XXXXXXXX)`;
  }
  return '';
}

/* ── National ID (Uganda) ──────────────────────────────────── */

// Uganda NIN format: CF or CM followed by alphanumeric characters (14 chars total)
const UG_NIN_RE = /^C[MF]\d{2}[A-Z0-9]{10}$/i;

export function ugNationalId(value, label = 'National ID') {
  const cleaned = String(value).trim();
  if (!cleaned) return ''; // optional field
  if (!UG_NIN_RE.test(cleaned)) {
    return `${label} format: CM/CF followed by 12 characters (e.g. CM12345678AB)`;
  }
  return '';
}

/* ── Names ──────────────────────────────────────────────────── */

const NAME_RE = /^[a-zA-Z\s'-]{2,80}$/;

export function fullName(value, label = 'Full name') {
  const trimmed = String(value).trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.split(/\s+/).length < 2) {
    return `${label} must include first and last name`;
  }
  if (!NAME_RE.test(trimmed)) {
    return `${label} should only contain letters, spaces, hyphens and apostrophes`;
  }
  return '';
}

/* ── Member number ──────────────────────────────────────────── */

const MEMBER_NUM_RE = /^[A-Z0-9/-]{2,20}$/i;

export function memberNumber(value, label = 'Member number') {
  const trimmed = String(value).trim();
  if (!trimmed) return `${label} is required`;
  if (!MEMBER_NUM_RE.test(trimmed)) {
    return `${label} should contain only letters, numbers, hyphens or slashes`;
  }
  return '';
}

/* ── Password strength ──────────────────────────────────────── */

export function passwordStrength(value, label = 'Password') {
  if (!value) return '';
  if (value.length < 6) return `${label} must be at least 6 characters`;
  if (value.length > 128) return `${label} is too long`;
  return '';
}

/* ── Form-level runner ─────────────────────────────────────── */

/**
 * Run a map of field → validator-result and return { errors, isValid }.
 * Usage:
 *   const { errors, isValid } = runValidation({
 *     amount: positiveAmount(form.amount, 'Amount'),
 *     member_id: requiredField(form.member_id, 'Member'),
 *   });
 */
export function runValidation(fieldMap) {
  const errors = {};
  let isValid = true;
  for (const [field, errorMsg] of Object.entries(fieldMap)) {
    if (errorMsg) {
      errors[field] = errorMsg;
      isValid = false;
    }
  }
  return { errors, isValid };
}
