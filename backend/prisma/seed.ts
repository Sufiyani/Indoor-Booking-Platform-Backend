import { PrismaClient, SportType, BookingStatus, PaymentStatus, PaymentMethod, PricingRuleType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, subDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { generateBookingCode } from '../src/utils/bookingCode';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting IndoorArena database seed...');

  // 1. Settings
  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      venueName: 'IndoorArena Sports Complex',
      address: 'Plot 42, Block 5, Clifton, Karachi, Pakistan',
      phone: '+92 300 1234567',
      email: 'contact@indoorarena.pk',
      cancellationWindowHours: 4,
      maxActiveBookingsPerPhone: 2,
      noShowBlockThreshold: 3,
      currency: 'PKR',
      timezone: 'Asia/Karachi',
    },
  });
  console.log('✅ Settings initialized:', settings.venueName);

  // 2. Admin User
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@indoorarena.pk' },
    update: {
      password: adminPasswordHash,
    },
    create: {
      email: 'admin@indoorarena.pk',
      password: adminPasswordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Admin created: ${admin.email} (Password: Admin@123)`);

  // 3. Amenities
  const amenitiesData = [
    { name: '1000W LED Floodlights', icon: 'Zap', description: 'Glare-free broadcast grade lighting for night matches' },
    { name: 'Air Cooled Lounges', icon: 'Wind', description: 'High-flow misting fans and air-conditioned spectator area' },
    { name: 'Changing Rooms & Showers', icon: 'Bath', description: 'Clean private changing cabins with hot/cold shower facility' },
    { name: 'Automated Bowling Machine', icon: 'Target', description: 'RoboArm & automated speed adjustment up to 145 kph' },
    { name: 'Free Secure Parking', icon: 'Car', description: 'CCTV monitored parking space for cars and bikes' },
    { name: 'Action Replay Cameras', icon: 'Video', description: 'HD match recording and instant video review' },
    { name: 'Chilled Energy Drinks', icon: 'Coffee', description: 'Sports cafe serving electrolytes, shakes, and energy drinks' },
    { name: 'Racket & Ball Rental', icon: 'ShoppingBag', description: 'Pro padel rackets, futsal balls, and taped tennis balls' },
    { name: 'Official Referee on Request', icon: 'UserCheck', description: 'Certified PCB / FIFA umpires and referees for tournaments' },
  ];

  const amenitiesMap: Record<string, string> = {};
  for (const item of amenitiesData) {
    const record = await prisma.amenity.upsert({
      where: { name: item.name },
      update: item,
      create: item,
    });
    amenitiesMap[record.name] = record.id;
  }
  console.log('✅ Amenities created:', Object.keys(amenitiesMap).length);

  // 4. Courts
  const courtsData = [
    {
      name: 'The Lords Net',
      slug: 'the-lords-net',
      sport: SportType.CRICKET,
      description: 'Professional indoor cricket turf featuring high-speed automated bowling machine, HD action-replay cameras, and high-density impact nets. Perfect for tape-ball and hardball practice matches.',
      basePricePerHour: 3500,
      capacity: 16,
      courtType: 'Pro Cricket Net & Pitch',
      images: [
        { url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop', isPrimary: true, caption: 'Pitch and nets under floodlights' },
        { url: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?q=80&w=1200&auto=format&fit=crop', isPrimary: false, caption: 'Automated bowling machine lane' },
      ],
      amenityNames: ['1000W LED Floodlights', 'Air Cooled Lounges', 'Automated Bowling Machine', 'Free Secure Parking', 'Action Replay Cameras'],
    },
    {
      name: 'Eden Box Arena',
      slug: 'eden-box-arena',
      sport: SportType.CRICKET,
      description: 'Spacious enclosed box cricket arena with seamless boundary netting, digital scoreboard, air coolers, and cushioned turf to prevent knee fatigue. High-demand for corporate and tournament matches.',
      basePricePerHour: 4000,
      capacity: 18,
      courtType: 'Box Cricket Turf',
      images: [
        { url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop', isPrimary: true, caption: 'Box arena overview' },
        { url: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?q=80&w=1200&auto=format&fit=crop', isPrimary: false, caption: 'Player dugouts & scoreboard' },
      ],
      amenityNames: ['1000W LED Floodlights', 'Air Cooled Lounges', 'Changing Rooms & Showers', 'Free Secure Parking', 'Official Referee on Request'],
    },
    {
      name: 'Camp Nou Futsal Turf',
      slug: 'camp-nou-futsal-turf',
      sport: SportType.FOOTBALL,
      description: 'FIFA-certified 50mm synthetic rubber-infill turf designed for 5v5 & 6v6 football. Equipped with 1000W glare-free LED floodlights, official futsal goals, and team dugouts.',
      basePricePerHour: 4500,
      capacity: 14,
      courtType: '5v5 Futsal Turf',
      images: [
        { url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop', isPrimary: true, caption: 'Full futsal turf view' },
        { url: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=1200&auto=format&fit=crop', isPrimary: false, caption: 'Goal area and scoreboard' },
      ],
      amenityNames: ['1000W LED Floodlights', 'Changing Rooms & Showers', 'Free Secure Parking', 'Chilled Energy Drinks', 'Racket & Ball Rental'],
    },
    {
      name: 'Bernabeu Mini Pitch',
      slug: 'bernabeu-mini-pitch',
      sport: SportType.FOOTBALL,
      description: 'Fast-paced 4v4 indoor futsal court with rebound sideboards, shock-absorbing underlay, and sound system for match commentary and hype music.',
      basePricePerHour: 3000,
      capacity: 10,
      courtType: 'Rebound Futsal Turf',
      images: [
        { url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=1200&auto=format&fit=crop', isPrimary: true, caption: 'Rebound boards and artificial grass' },
      ],
      amenityNames: ['1000W LED Floodlights', 'Air Cooled Lounges', 'Free Secure Parking', 'Chilled Energy Drinks'],
    },
    {
      name: 'Court Alpha Padel',
      slug: 'court-alpha-padel',
      sport: SportType.PADEL,
      description: 'State-of-the-art panoramic tempered-glass padel tennis court with Mondo Supercourt XN monofilament turf (World Padel Tour specification). Includes Babolat & Bullpadel racket rentals.',
      basePricePerHour: 5000,
      capacity: 4,
      courtType: 'Panoramic Glass Padel Court',
      images: [
        { url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200&auto=format&fit=crop', isPrimary: true, caption: 'Panoramic glass court' },
        { url: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?q=80&w=1200&auto=format&fit=crop', isPrimary: false, caption: 'Padel rackets and turf' },
      ],
      amenityNames: ['1000W LED Floodlights', 'Changing Rooms & Showers', 'Racket & Ball Rental', 'Chilled Energy Drinks', 'Free Secure Parking'],
    },
  ];

  const seededCourts: any[] = [];
  for (const c of courtsData) {
    const existing = await prisma.court.findUnique({ where: { slug: c.slug } });
    let court;
    if (existing) {
      court = await prisma.court.update({
        where: { id: existing.id },
        data: {
          name: c.name,
          sport: c.sport,
          description: c.description,
          basePricePerHour: c.basePricePerHour,
          capacity: c.capacity,
          courtType: c.courtType,
        },
      });
    } else {
      court = await prisma.court.create({
        data: {
          name: c.name,
          slug: c.slug,
          sport: c.sport,
          description: c.description,
          basePricePerHour: c.basePricePerHour,
          capacity: c.capacity,
          courtType: c.courtType,
          slotDurationMinutes: 60,
          bufferMinutes: 0,
          isActive: true,
        },
      });
    }

    // Images
    await prisma.courtImage.deleteMany({ where: { courtId: court.id } });
    for (let i = 0; i < c.images.length; i++) {
      const img = c.images[i];
      await prisma.courtImage.create({
        data: {
          courtId: court.id,
          url: img.url,
          caption: img.caption,
          isPrimary: img.isPrimary,
          displayOrder: i,
        },
      });
    }

    // Amenities
    await prisma.courtAmenity.deleteMany({ where: { courtId: court.id } });
    for (const amName of c.amenityNames) {
      const amenityId = amenitiesMap[amName];
      if (amenityId) {
        await prisma.courtAmenity.create({
          data: {
            courtId: court.id,
            amenityId,
          },
        });
      }
    }

    // Operating Hours (09:00 to 00:00 every day)
    await prisma.operatingHours.deleteMany({ where: { courtId: court.id } });
    for (let day = 0; day <= 6; day++) {
      await prisma.operatingHours.create({
        data: {
          courtId: court.id,
          dayOfWeek: day,
          openTime: '09:00',
          closeTime: '00:00', // Midnight
          isClosed: false,
        },
      });
    }

    seededCourts.push(court);
  }
  console.log('✅ Courts seeded with operating hours & amenities:', seededCourts.length);

  // 5. Pricing Rules
  await prisma.pricingRule.deleteMany();
  await prisma.pricingRule.create({
    data: {
      name: 'Evening Peak Hours (All Courts)',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
      startTime: '18:00',
      endTime: '23:59',
      type: PricingRuleType.PERCENTAGE_SURCHARGE,
      value: 25.0, // +25%
      isActive: true,
    },
  });

  await prisma.pricingRule.create({
    data: {
      name: 'Weekend Prime Hours',
      daysOfWeek: [0, 5, 6], // Fri, Sat, Sun
      startTime: '14:00',
      endTime: '18:00',
      type: PricingRuleType.PERCENTAGE_SURCHARGE,
      value: 15.0, // +15%
      isActive: true,
    },
  });
  console.log('✅ Pricing rules created');

  // 6. Customers & Blocked Phones
  const customer1 = await prisma.customer.upsert({
    where: { phone: '+923001234567' },
    update: {},
    create: {
      name: 'Hamza Tariq',
      phone: '+923001234567',
      email: 'hamza@example.com',
      totalBookings: 3,
      noShowCount: 0,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { phone: '+923219876543' },
    update: {},
    create: {
      name: 'Bilal Ahmed',
      phone: '+923219876543',
      email: 'bilal@example.com',
      totalBookings: 2,
      noShowCount: 1,
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { phone: '+923121112233' },
    update: {},
    create: {
      name: 'Shahmeer Raza',
      phone: '+923121112233',
      email: 'shahmeer@example.com',
      totalBookings: 3,
      noShowCount: 3,
      isBlocked: true,
      blockedReason: 'Exceeded maximum allowed no-shows (3 no-shows)',
      blockedAt: new Date(),
    },
  });

  await prisma.blockedPhone.upsert({
    where: { phone: '+923121112233' },
    update: {},
    create: {
      phone: '+923121112233',
      reason: 'Auto-blocked: 3 unexcused no-shows',
      blockedBy: 'SYSTEM_AUTO_BLOCK',
    },
  });
  console.log('✅ Customers and blocked phones seeded');

  // 7. Seed Sample Bookings (Past, Today, and Upcoming)
  const today = startOfDay(new Date());

  // Past Booking (Completed)
  const pastCourt = seededCourts[0];
  const pastStart = setMinutes(setHours(subDays(today, 1), 19), 0);
  const pastEnd = setMinutes(setHours(subDays(today, 1), 21), 0);
  const pastCode = generateBookingCode();

  await prisma.booking.upsert({
    where: { bookingCode: pastCode },
    update: {},
    create: {
      bookingCode: pastCode,
      courtId: pastCourt.id,
      customerId: customer1.id,
      customerName: customer1.name,
      customerPhone: customer1.phone,
      customerEmail: customer1.email,
      sport: pastCourt.sport,
      date: subDays(today, 1),
      startTime: pastStart,
      endTime: pastEnd,
      totalDurationMinutes: 120,
      totalAmount: 8750, // 3500 * 2 * 1.25 peak
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.CASH_ON_ARRIVAL,
      cancellationAllowedUntil: subDays(today, 1),
      bookingSlots: {
        create: [
          {
            courtId: pastCourt.id,
            startTime: pastStart,
            endTime: setMinutes(setHours(subDays(today, 1), 20), 0),
            price: 4375,
            status: BookingStatus.COMPLETED,
          },
          {
            courtId: pastCourt.id,
            startTime: setMinutes(setHours(subDays(today, 1), 20), 0),
            endTime: pastEnd,
            price: 4375,
            status: BookingStatus.COMPLETED,
          },
        ],
      },
    },
  });

  // Today's Booking (Confirmed)
  const futsalCourt = seededCourts[2];
  const todayStart = setMinutes(setHours(today, 20), 0);
  const todayEnd = setMinutes(setHours(today, 22), 0);
  const todayCode = 'IA-TODAY1';

  await prisma.booking.upsert({
    where: { bookingCode: todayCode },
    update: {},
    create: {
      bookingCode: todayCode,
      courtId: futsalCourt.id,
      customerId: customer2.id,
      customerName: customer2.name,
      customerPhone: customer2.phone,
      customerEmail: customer2.email,
      sport: futsalCourt.sport,
      date: today,
      startTime: todayStart,
      endTime: todayEnd,
      totalDurationMinutes: 120,
      totalAmount: 11250, // 4500 * 2 * 1.25 peak
      status: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.CASH_ON_ARRIVAL,
      cancellationAllowedUntil: setMinutes(setHours(today, 16), 0),
      bookingSlots: {
        create: [
          {
            courtId: futsalCourt.id,
            startTime: todayStart,
            endTime: setMinutes(setHours(today, 21), 0),
            price: 5625,
            status: BookingStatus.CONFIRMED,
          },
          {
            courtId: futsalCourt.id,
            startTime: setMinutes(setHours(today, 21), 0),
            endTime: todayEnd,
            price: 5625,
            status: BookingStatus.CONFIRMED,
          },
        ],
      },
    },
  });

  // Upcoming Tomorrow Booking (Confirmed)
  const padelCourt = seededCourts[4];
  const tomorrow = addDays(today, 1);
  const tomorrowStart = setMinutes(setHours(tomorrow, 18), 0);
  const tomorrowEnd = setMinutes(setHours(tomorrow, 19), 0);
  const tomorrowCode = 'IA-PADEL1';

  await prisma.booking.upsert({
    where: { bookingCode: tomorrowCode },
    update: {},
    create: {
      bookingCode: tomorrowCode,
      courtId: padelCourt.id,
      customerId: customer1.id,
      customerName: customer1.name,
      customerPhone: customer1.phone,
      customerEmail: customer1.email,
      sport: padelCourt.sport,
      date: tomorrow,
      startTime: tomorrowStart,
      endTime: tomorrowEnd,
      totalDurationMinutes: 60,
      totalAmount: 6250, // 5000 * 1.25 peak
      status: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.CASH_ON_ARRIVAL,
      cancellationAllowedUntil: setMinutes(setHours(tomorrow, 14), 0),
      bookingSlots: {
        create: [
          {
            courtId: padelCourt.id,
            startTime: tomorrowStart,
            endTime: tomorrowEnd,
            price: 6250,
            status: BookingStatus.CONFIRMED,
          },
        ],
      },
    },
  });

  // Maintenance block for court 1
  await prisma.slotBlock.deleteMany();
  await prisma.slotBlock.create({
    data: {
      courtId: pastCourt.id,
      startTime: setMinutes(setHours(addDays(today, 2), 10), 0),
      endTime: setMinutes(setHours(addDays(today, 2), 14), 0),
      reason: 'Turf Grooming & Bowling Machine Routine Calibration',
    },
  });

  console.log('✅ Sample bookings and slot blocks created successfully');
  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

