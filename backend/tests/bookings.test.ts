import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { addDays, setHours, setMinutes, startOfDay, format } from 'date-fns';

describe('Bookings API & Concurrency Protection', () => {
  let testCourt: any;

  beforeAll(async () => {
    testCourt = await prisma.court.findFirst({
      where: { isActive: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should successfully book an available slot', async () => {
    const futureDate = addDays(startOfDay(new Date()), 7);
    const dateStr = format(futureDate, 'yyyy-MM-dd');
    const slotStart = setMinutes(setHours(futureDate, 10), 0);

    const payload = {
      courtId: testCourt.id,
      date: dateStr,
      slotStartTimes: [slotStart.toISOString()],
      customerName: 'Test Athlete',
      customerPhone: '0300 1234999',
      customerEmail: 'test.athlete@example.com',
      notes: 'Please keep tape balls ready',
    };

    const res = await request(app).post('/api/v1/bookings').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingCode).toMatch(/^IA-/);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.paymentMethod).toBe('CASH_ON_ARRIVAL');
  });

  it('should prevent double booking: reject booking the exact same slot', async () => {
    const futureDate = addDays(startOfDay(new Date()), 8);
    const dateStr = format(futureDate, 'yyyy-MM-dd');
    const slotStart = setMinutes(setHours(futureDate, 14), 0);

    const payload1 = {
      courtId: testCourt.id,
      date: dateStr,
      slotStartTimes: [slotStart.toISOString()],
      customerName: 'User One',
      customerPhone: '0321 1111222',
      customerEmail: 'user1@example.com',
    };

    const payload2 = {
      courtId: testCourt.id,
      date: dateStr,
      slotStartTimes: [slotStart.toISOString()],
      customerName: 'User Two',
      customerPhone: '0333 3333444',
      customerEmail: 'user2@example.com',
    };

    // First booking succeeds
    const res1 = await request(app).post('/api/v1/bookings').send(payload1);
    expect(res1.status).toBe(201);

    // Second booking attempting same slot MUST fail with 409 Conflict
    const res2 = await request(app).post('/api/v1/bookings').send(payload2);
    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
    expect(res2.body.message).toContain('just booked');
  });

  it('should reject invalid phone numbers', async () => {
    const futureDate = addDays(startOfDay(new Date()), 9);
    const dateStr = format(futureDate, 'yyyy-MM-dd');
    const slotStart = setMinutes(setHours(futureDate, 15), 0);

    const payload = {
      courtId: testCourt.id,
      date: dateStr,
      slotStartTimes: [slotStart.toISOString()],
      customerName: 'Bad Phone User',
      customerPhone: '12345',
    };

    const res = await request(app).post('/api/v1/bookings').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject booking when phone has reached maximum active bookings', async () => {
    const testPhone = '0345 9999888';
    const futureDate = addDays(startOfDay(new Date()), 10);
    const dateStr = format(futureDate, 'yyyy-MM-dd');

    // Create 1st booking
    const slot1 = setMinutes(setHours(futureDate, 10), 0);
    await request(app).post('/api/v1/bookings').send({
      courtId: testCourt.id,
      date: dateStr,
      slotStartTimes: [slot1.toISOString()],
      customerName: 'Limit Test',
      customerPhone: testPhone,
    });

    // Create 2nd booking
    const slot2 = setMinutes(setHours(futureDate, 11), 0);
    await request(app).post('/api/v1/bookings').send({
      courtId: testCourt.id,
      date: dateStr,
      slotStartTimes: [slot2.toISOString()],
      customerName: 'Limit Test',
      customerPhone: testPhone,
    });

    // 3rd booking must be rejected because maxActive is 2
    const slot3 = setMinutes(setHours(futureDate, 12), 0);
    const res3 = await request(app).post('/api/v1/bookings').send({
      courtId: testCourt.id,
      date: dateStr,
      slotStartTimes: [slot3.toISOString()],
      customerName: 'Limit Test',
      customerPhone: testPhone,
    });

    expect(res3.status).toBe(400);
    expect(res3.body.message).toContain('Booking limit reached');
  });
});

