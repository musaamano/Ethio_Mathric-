/**
 * helpers.js
 * Pure utility functions used throughout the app.
 * Date formatting, score formatting, validation, misc helpers.
 */

// ── Date Formatting ────────────────────────────────────────

/**
 * Format a date string or Date object to a readable format.
 * @param {string|Date} date
 * @param {string} format - 'short' | 'long' | 'relative' | 'time'
 */
export function formatDate(date, format = 'short') {
  if (!date) return '—';
  const d = new Date(date);

  if (format === 'relative') {
    return timeAgo(d);
  }

  if (format === 'time') {
    return d.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
  }

  if (format === 'long') {
    return d.toLocaleDateString('en-ET', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  // short (default)
  return d.toLocaleDateString('en-ET', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/**
 * Human-readable relative time ("2 hours ago", "Yesterday", etc.)
 */
export function timeAgo(date) {
  const d    = new Date(date);
  const now  = new Date();
  const diff = Math.floor((now - d) / 1000); // seconds

  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return formatDate(date, 'short');
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format a subscription expiry date with warning if close
 */
export function formatExpiry(dateStr) {
  const date  = new Date(dateStr);
  const now   = new Date();
  const days  = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

  if (days < 0)  return { text: 'Expired', status: 'expired' };
  if (days === 0) return { text: 'Expires today', status: 'critical' };
  if (days <= 7)  return { text: `${days} days left`, status: 'warning' };
  return { text: formatDate(dateStr, 'long'), status: 'ok' };
}

// ── Score Formatting ───────────────────────────────────────

/**
 * Format score number to a coloured label
 * @returns { text: '86%', color: 'text-sage-600', bg: 'bg-mint-light', grade: 'A' }
 */
export function formatScore(score) {
  const n = parseFloat(score);
  if (isNaN(n)) return { text: 'N/A', color: 'text-gray-400', bg: 'bg-gray-100', grade: '-' };

  if (n >= 90) return { text: `${n.toFixed(1)}%`, color: 'text-sage-600',    bg: 'bg-mint-light',  grade: 'A+' };
  if (n >= 80) return { text: `${n.toFixed(1)}%`, color: 'text-primary-600', bg: 'bg-primary-50',  grade: 'A'  };
  if (n >= 70) return { text: `${n.toFixed(1)}%`, color: 'text-blue-600',    bg: 'bg-blue-50',     grade: 'B'  };
  if (n >= 60) return { text: `${n.toFixed(1)}%`, color: 'text-yellow-600',  bg: 'bg-yellow-50',   grade: 'C'  };
  if (n >= 50) return { text: `${n.toFixed(1)}%`, color: 'text-orange-600',  bg: 'bg-orange-50',   grade: 'D'  };
  return         { text: `${n.toFixed(1)}%`, color: 'text-red-600',     bg: 'bg-red-50',      grade: 'F'  };
}

/**
 * Get difficulty label and colour
 */
export function formatDifficulty(level) {
  const map = {
    easy:   { label: 'Easy',   color: 'text-sage-600',   bg: 'bg-mint-light' },
    medium: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50'  },
    hard:   { label: 'Hard',   color: 'text-red-500',    bg: 'bg-red-50'     },
  };
  return map[level] || { label: level, color: 'text-gray-500', bg: 'bg-gray-100' };
}

/**
 * Get exam importance badge
 */
export function formatImportance(level) {
  const map = {
    low:       { label: 'Low',       color: 'text-gray-500',   bg: 'bg-gray-100' },
    medium:    { label: 'Medium',    color: 'text-blue-600',   bg: 'bg-blue-50'  },
    high:      { label: 'High',      color: 'text-orange-600', bg: 'bg-orange-50'},
    very_high: { label: 'Very High', color: 'text-red-600',    bg: 'bg-red-50'   },
  };
  return map[level] || { label: level, color: 'text-gray-500', bg: 'bg-gray-100' };
}

// ── Number Helpers ─────────────────────────────────────────

/**
 * Format large numbers: 12000 → "12K", 1500000 → "1.5M"
 */
export function formatNumber(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/**
 * Ordinal: 1 → "1st", 2 → "2nd", 3 → "3rd"
 */
export function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── String Helpers ─────────────────────────────────────────

/**
 * Capitalise first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Full name from user object
 */
export function fullName(user) {
  if (!user) return '';
  return `${user.first_name || ''} ${user.last_name || ''}`.trim();
}

/**
 * Initials from name: "Selam Bekele" → "SB"
 */
export function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Truncate long text
 */
export function truncate(str, maxLength = 100) {
  if (!str) return '';
  return str.length <= maxLength ? str : str.slice(0, maxLength) + '...';
}

/**
 * Convert snake_case to Title Case: "natural_science" → "Natural Science"
 */
export function snakeToTitle(str) {
  if (!str) return '';
  return str.split('_').map(capitalize).join(' ');
}

// ── Validation Helpers ─────────────────────────────────────

export const validators = {
  required:    (v) => (v && v.toString().trim() !== '') || 'This field is required',
  email:       (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address',
  minLength:   (n) => (v) => (v && v.length >= n) || `Must be at least ${n} characters`,
  maxLength:   (n) => (v) => (!v || v.length <= n) || `Must be no more than ${n} characters`,
  strongPassword: (v) =>
    /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(v) ||
    'Password must be 8+ chars, include 1 uppercase and 1 number',
  phone:       (v) => !v || /^[0-9+\-\s]{7,15}$/.test(v) || 'Enter a valid phone number',
  matchPassword: (getValues) => (v) =>
    v === getValues('password') || 'Passwords do not match',
};

// ── Device ID ─────────────────────────────────────────────

/**
 * Get or generate a persistent browser device ID
 * Stored in localStorage so it survives page reloads
 */
export function getDeviceId() {
  const key = 'ema_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

// ── ETB currency ──────────────────────────────────────────

export function formatCurrency(amount) {
  return `${parseFloat(amount).toLocaleString('en-ET')} ETB`;
}

// ── Stream labels ─────────────────────────────────────────

export const STREAM_LABELS = {
  natural_science: 'Natural Science',
  social_science:  'Social Science',
};

export const STREAM_OPTIONS = [
  { value: 'natural_science', label: '🔬 Natural Science' },
  { value: 'social_science',  label: '📰 Social Science' },
];

export const ETHIOPIAN_REGIONS = [
  'Addis Ababa', 'Oromia', 'Amhara', 'SNNPR', 'Tigray',
  'Somali', 'Afar', 'Harari', 'Dire Dawa', 'Gambella', 'Benishangul-Gumuz',
];

export const REPORT_REASONS = [
  { value: 'wrong_answer', label: 'Wrong answer marked as correct' },
  { value: 'typo',         label: 'Typo or spelling error' },
  { value: 'unclear',      label: 'Question is unclear or confusing' },
  { value: 'image_issue',  label: 'Image not loading or wrong image' },
  { value: 'other',        label: 'Other issue' },
];
