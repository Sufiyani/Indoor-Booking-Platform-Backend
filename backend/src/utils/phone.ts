/**
 * Pakistani Phone Number Utility
 * Standard format: +923XXXXXXXXX (13 chars total, +92 followed by 3 and 9 digits)
 */

export function normalizePakistaniPhone(input: string): string {
  // Strip whitespace, dashes, parens
  let cleaned = input.trim().replace(/[\s\-()]/g, '');

  if (cleaned.startsWith('+92')) {
    // keep as is
  } else if (cleaned.startsWith('0092')) {
    cleaned = '+' + cleaned.slice(2);
  } else if (cleaned.startsWith('92')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    cleaned = '+92' + cleaned.slice(1);
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = '+92' + cleaned;
  }

  return cleaned;
}

export function isValidPakistaniPhone(input: string): boolean {
  if (!input) return false;
  const normalized = normalizePakistaniPhone(input);
  // Match +92 followed by 3, and then 9 digits (total 13 chars)
  const pkPhoneRegex = /^\+923[0-9]{9}$/;
  return pkPhoneRegex.test(normalized);
}

export function formatPakistaniPhoneForDisplay(phone: string): string {
  const norm = normalizePakistaniPhone(phone);
  if (!norm.startsWith('+923') || norm.length !== 13) return phone;
  // +92 300 1234567 or 0300 1234567
  const part1 = norm.slice(3, 6);
  const part2 = norm.slice(6);
  return `03${part1.slice(1)} ${part2.slice(0, 3)} ${part2.slice(3)}`;
}

