import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines tailwind CSS classes dynamically and resolves conflicts.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string in a premium, clean way.
 */
export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formats rates/percentages nicely.
 */
export function formatPercent(value) {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
}

/**
 * Safely extracts an error message string from Axios error responses.
 */
export function getErrorMessage(err, fallback = 'Something went wrong.') {
  const data = err.response?.data;
  if (!data) return fallback;
  if (typeof data.error === 'string') return data.error;
  if (data.message && typeof data.message === 'string') return data.message;
  return fallback;
}
