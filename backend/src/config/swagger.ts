import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IndoorArena API Documentation',
      version: '1.0.0',
      description:
        'Indoor Sports Booking Platform API (Express, Prisma, PostgreSQL). Supports guest-based court booking in Karachi (PKT), hourly slot availability, cash on arrival payments, PDF pass generation with QR code, and admin dashboard management.',
      contact: {
        name: 'IndoorArena Support',
        email: 'contact@indoorarena.pk',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Development Server (v1)',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'admin_token',
          description: 'Admin JWT stored in httpOnly cookie',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Optional Authorization Bearer token',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
        Court: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            sport: { type: 'string', enum: ['CRICKET', 'FOOTBALL', 'PADEL'] },
            description: { type: 'string' },
            basePricePerHour: { type: 'number' },
            courtType: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            bookingCode: { type: 'string', example: 'IA-8K3F2Q' },
            courtId: { type: 'string' },
            customerName: { type: 'string' },
            customerPhone: { type: 'string', example: '+923001234567' },
            customerEmail: { type: 'string', nullable: true },
            sport: { type: 'string' },
            date: { type: 'string', format: 'date' },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            totalAmount: { type: 'number' },
            status: { type: 'string', enum: ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
            paymentStatus: { type: 'string', enum: ['UNPAID', 'PAID'] },
            paymentMethod: { type: 'string', example: 'CASH_ON_ARRIVAL' },
          },
        },
      },
    },
    tags: [
      { name: 'Courts', description: 'Public court discovery and details' },
      { name: 'Slots', description: 'Live slot availability & server-side price calculation' },
      { name: 'Bookings', description: 'Guest booking creation, lookup, cancellation, and PDF download' },
      { name: 'Auth', description: 'Admin authentication and session' },
      { name: 'Admin', description: 'Protected management endpoints for arena staff' },
      { name: 'Reports', description: 'Revenue and occupancy analytics & CSV exports' },
      { name: 'Settings', description: 'Venue settings and booking policies' },
    ],
  },
  apis: ['./src/routes/v1/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

