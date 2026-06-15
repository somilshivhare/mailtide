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
