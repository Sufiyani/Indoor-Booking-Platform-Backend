import { describe, it, expect } from 'vitest';
import { slotsService } from '../src/services/slots.service';

describe('Slots Service - Pricing Calculation', () => {
  const sampleRules = [
    {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
      startTime: '18:00',
      endTime: '23:59',
      type: 'PERCENTAGE_SURCHARGE',
      value: 25.0, // 25% peak
      isActive: true,
    },
    {
      daysOfWeek: [5, 6, 0], // Weekend (Fri, Sat, Sun)
      startTime: '14:00',
      endTime: '18:00',
      type: 'FIXED_SURCHARGE',
      value: 500.0, // Rs. 500 surcharge
      isActive: true,
    },
  ];

  it('should calculate base price during off-peak morning hours', () => {
    const basePrice = 3000;
    const dayOfWeek = 2; // Tuesday
    const timeHHmm = '10:00';

    const result = slotsService.calculateSlotPrice(basePrice, dayOfWeek, timeHHmm, sampleRules);
    expect(result.finalPrice).toBe(3000);
    expect(result.surcharge).toBe(0);
    expect(result.isPeak).toBe(false);
  });

  it('should calculate evening peak surcharge (+25%) correctly', () => {
    const basePrice = 4000;
    const dayOfWeek = 3; // Wednesday
    const timeHHmm = '19:00';

    const result = slotsService.calculateSlotPrice(basePrice, dayOfWeek, timeHHmm, sampleRules);
    expect(result.isPeak).toBe(true);
    expect(result.surcharge).toBe(1000); // 25% of 4000
    expect(result.finalPrice).toBe(5000);
  });

  it('should calculate weekend fixed surcharge correctly', () => {
    const basePrice = 3500;
    const dayOfWeek = 6; // Saturday
    const timeHHmm = '15:00';

    const result = slotsService.calculateSlotPrice(basePrice, dayOfWeek, timeHHmm, sampleRules);
    expect(result.isPeak).toBe(true);
    expect(result.surcharge).toBe(500);
    expect(result.finalPrice).toBe(4000);
  });
});

