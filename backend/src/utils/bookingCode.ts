import crypto from 'crypto';

// Characters excluding ambiguous 0, O, 1, I
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates human readable booking code like IA-8K3F2Q
 */
export function generateBookingCode(prefix = 'IA'): string {
  const bytes = crypto.randomBytes(6);
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += CHARS[bytes[i] % CHARS.length];
  }
  return `${prefix}-${result}`;
}

