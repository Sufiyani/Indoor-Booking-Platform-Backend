import { describe, it, expect } from 'vitest';
import { isValidPakistaniPhone, normalizePakistaniPhone, formatPakistaniPhoneForDisplay } from '../src/utils/phone';

describe('Pakistani Phone Number Utility', () => {
  it('should validate and normalize 03XX standard mobile format', () => {
    const input = '03001234567';
    expect(isValidPakistaniPhone(input)).toBe(true);
    expect(normalizePakistaniPhone(input)).toBe('+923001234567');
  });

  it('should validate and normalize formatted phone with dashes and spaces', () => {
    const input = '0321 - 9876543';
    expect(isValidPakistaniPhone(input)).toBe(true);
    expect(normalizePakistaniPhone(input)).toBe('+923219876543');
  });

  it('should validate numbers starting with +92', () => {
    const input = '+923334567890';
    expect(isValidPakistaniPhone(input)).toBe(true);
    expect(normalizePakistaniPhone(input)).toBe('+923334567890');
  });

  it('should validate numbers starting with 92 or 0092', () => {
    expect(normalizePakistaniPhone('923451234567')).toBe('+923451234567');
    expect(normalizePakistaniPhone('00923451234567')).toBe('+923451234567');
  });

  it('should reject invalid or non-Pakistani phone numbers', () => {
    expect(isValidPakistaniPhone('12345')).toBe(false);
    expect(isValidPakistaniPhone('02134567890')).toBe(false); // Karachi landline, not mobile
    expect(isValidPakistaniPhone('+14155552671')).toBe(false); // US phone
    expect(isValidPakistaniPhone('abcdefghijk')).toBe(false);
  });

  it('should format valid phone numbers for human display', () => {
    expect(formatPakistaniPhoneForDisplay('+923001234567')).toBe('0300 123 4567');
  });
});

