import { describe, it, expect } from 'vitest';
import { generateBookingCode } from '../src/utils/bookingCode';

describe('Booking Code Generator', () => {
  it('should generate code starting with prefix IA-', () => {
    const code = generateBookingCode('IA');
    expect(code).toMatch(/^IA-[2-9A-HJ-NP-Z]{6}$/);
  });

  it('should generate distinct codes on consecutive calls', () => {
    const codes = new Set();
    for (let i = 0; i < 50; i++) {
      codes.add(generateBookingCode());
    }
    expect(codes.size).toBe(50);
  });

  it('should not contain ambiguous characters 0, O, 1, I', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateBookingCode();
      const codePart = code.split('-')[1];
      expect(codePart).not.toMatch(/[01OI]/);
    }
  });
});

