import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Asia/Karachi';

/**
 * Converts a UTC Date to Karachi Date (represented as Date object in local values or formatted string)
 */
export function toKarachiTime(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(d, DEFAULT_TIMEZONE);
}

/**
 * Converts a local Karachi date string (e.g. "2026-10-29 18:00") to UTC Date
 */
export function fromKarachiToUtc(dateStr: string): Date {
  return fromZonedTime(dateStr, DEFAULT_TIMEZONE);
}

/**
 * Formats a UTC date for display in PKT (e.g. "29 Oct 2026, 06:00 PM PKT")
 */
export function formatInPkt(date: Date | string, formatPattern = 'dd MMM yyyy, hh:mm a'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const zoned = toZonedTime(d, DEFAULT_TIMEZONE);
  return format(zoned, formatPattern);
}

/**
 * Formats time only in PKT (e.g. "06:00 PM")
 */
export function formatTimeInPkt(date: Date | string): string {
  return formatInPkt(date, 'hh:mm a');
}

/**
 * Formats date only in PKT (e.g. "Thu, 29 Oct 2026")
 */
export function formatDateInPkt(date: Date | string): string {
  return formatInPkt(date, 'EEE, dd MMM yyyy');
}

