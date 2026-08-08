/**
 * @fileoverview Test completi per gli endpoint /api/v1/bookings
 * MyZubsterGateway — Bounty #5 (Good First Issue)
 *
 * Copertura:
 *   GET  /api/v1/bookings/history/:userId  — cronologia con paginazione e filtri
 *   POST /api/v1/bookings                   — creazione con validazione
 *   PUT  /api/v1/bookings/:id/status        — cambio stato
 *   GET  /api/v1/bookings/:id               — dettaglio singolo
 *
 * Strategy: mock di auth.verifyToken + bookingService così i test sono
 * isolati, deterministici e non toccano MongoDB.
 */

const request = require('supertest');
const express = require('express');

// ── Mock auth middleware ──────────────────────────────────────────
jest.mock('../../middleware/auth', () => ({
  verifyToken: (req, res, next) => {
    // Simula un utente autenticato per i test
    if (!req.headers.authorization) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    req.user = { id: '507f1f77bcf86cd799439011', role: 'client' };
    next();
  },
}));

// ── Mock booking service ─────────────────────────────────────────
const mockBookingService = {
  getHistory: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  getById: jest.fn(),
};

jest.mock('../../services/booking.service', () => mockBookingService);

// ── Test app ─────────────────────────────────────────────────────
const bookingRoutes = require('../../api/v1/bookings');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/bookings', bookingRoutes);
  return app;
}

// ══════════════════════════════════════════════════════════════════
// Test Data
// ══════════════════════════════════════════════════════════════════

const VALID_USER_ID = '507f1f77bcf86cd799439011';
const VALID_BOOKING_ID = '507f191e810c19729de860ea';
const VALID_PROFESSIONAL_ID = '507f1f77bcf86cd799439022';
const VALID_SKILL_ID = '507f1f77bcf86cd799439033';

const sampleBooking = {
  _id: VALID_BOOKING_ID,
  clientId: VALID_USER_ID,
  professionalId: VALID_PROFESSIONAL_ID,
  skillId: VALID_SKILL_ID,
  date: new Date('2026-07-25T00:00:00.000Z'),
  timeSlot: '14:30-16:00',
  amount: 75.0,
  status: 'pending',
  completedAt: null,
  notes: 'Test booking',
  location: 'Milano - Via Roma 1',
  createdAt: new Date('2026-07-20T10:00:00.000Z'),
  updatedAt: new Date('2026-07-20T10:00:00.000Z'),
};

const sampleHistoryEntry = {
  id: VALID_BOOKING_ID,
  skillId: VALID_SKILL_ID,
  skillTitle: 'Riparazione PC',
  skillCategory: 'Tecnologia',
  clientId: VALID_USER_ID,
  clientName: 'Mario Rossi',
  clientAvatar: null,
  professionalId: VALID_PROFESSIONAL_ID,
  professionalName: 'Luigi Verdi',
  professionalAvatar: null,
  date: new Date('2026-07-25T00:00:00.000Z'),
  timeSlot: '14:30-16:00',
  amount: 75.0,
  status: 'pending',
  completedAt: null,
  createdAt: new Date('2026-07-20T10:00:00.000Z'),
};

// ══════════════════════════════════════════════════════════════════
// GET /api/v1/bookings/history/:userId
// ══════════════════════════════════════════════════════════════════

describe('GET /api/v1/bookings/history/:userId', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  it('should return 200 with bookings array and pagination', async () => {
    mockBookingService.getHistory.mockResolvedValue({
      data: [sampleHistoryEntry],
      pagination: { total: 1, page: 1, limit: 10 },
    });

    const res = await request(app)
      .get(`/api/v1/bookings/history/${VALID_USER_ID}`)
      .set('Authorization', 'Bearer fake-token')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(10);

    expect(mockBookingService.getHistory).toHaveBeenCalledWith(
      VALID_USER_ID,
      { page: '1', limit: '10', status: undefined, category: undefined }
    );
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/history/${VALID_USER_ID}`)
      .expect(401)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No token provided');
    expect(mockBookingService.getHistory).not.toHaveBeenCalled();
  });

  it('should forward pagination query params', async () => {
    mockBookingService.getHistory.mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 2, limit: 5 },
    });

    await request(app)
      .get(`/api/v1/bookings/history/${VALID_USER_ID}?page=2&limit=5`)
      .set('Authorization', 'Bearer fake-token')
      .expect(200);

    expect(mockBookingService.getHistory).toHaveBeenCalledWith(
      VALID_USER_ID,
      { page: '2', limit: '5', status: undefined, category: undefined }
    );
  });

  it('should filter by status query param', async () => {
    mockBookingService.getHistory.mockResolvedValue({
      data: [sampleHistoryEntry],
      pagination: { total: 1, page: 1, limit: 10 },
    });

    await request(app)
      .get(`/api/v1/bookings/history/${VALID_USER_ID}?status=completed`)
      .set('Authorization', 'Bearer fake-token')
      .expect(200);

    expect(mockBookingService.getHistory).toHaveBeenCalledWith(
      VALID_USER_ID,
      { page: '1', limit: '10', status: 'completed', category: undefined }
    );
  });

  it('should filter by category query param', async () => {
    mockBookingService.getHistory.mockResolvedValue({
      data: [sampleHistoryEntry],
      pagination: { total: 1, page: 1, limit: 10 },
    });

    await request(app)
      .get(`/api/v1/bookings/history/${VALID_USER_ID}?category=Tecnologia`)
      .set('Authorization', 'Bearer fake-token')
      .expect(200);

    expect(mockBookingService.getHistory).toHaveBeenCalledWith(
      VALID_USER_ID,
      { page: '1', limit: '10', status: undefined, category: 'Tecnologia' }
    );
  });

  it('should combine status and category filters', async () => {
    mockBookingService.getHistory.mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 10 },
    });

    await request(app)
      .get(`/api/v1/bookings/history/${VALID_USER_ID}?status=confirmed&category=Salute`)
      .set('Authorization', 'Bearer fake-token')
      .expect(200);

    expect(mockBookingService.getHistory).toHaveBeenCalledWith(
      VALID_USER_ID,
      { page: '1', limit: '10', status: 'confirmed', category: 'Salute' }
    );
  });

  it('should return empty array when user has no bookings', async () => {
    mockBookingService.getHistory.mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 10 },
    });

    const res = await request(app)
      .get(`/api/v1/bookings/history/${VALID_USER_ID}`)
      .set('Authorization', 'Bearer fake-token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('should return 500 on service error', async () => {
    mockBookingService.getHistory.mockRejectedValue(new Error('Database connection failed'));

    const res = await request(app)
      .get(`/api/v1/bookings/history/${VALID_USER_ID}`)
      .set('Authorization', 'Bearer fake-token')
      .expect(500)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Database connection failed');
  });
});

// ══════════════════════════════════════════════════════════════════
// POST /api/v1/bookings
// ══════════════════════════════════════════════════════════════════

describe('POST /api/v1/bookings', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  it('should create a booking and return 201 with the created object', async () => {
    mockBookingService.create.mockResolvedValue(sampleBooking);

    const payload = {
      professionalId: VALID_PROFESSIONAL_ID,
      skillId: VALID_SKILL_ID,
      date: '2026-07-25',
      timeSlot: '14:30-16:00',
      amount: 75.0,
      notes: 'Test booking',
      location: 'Milano - Via Roma 1',
    };

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer fake-token')
      .send(payload)
      .expect(201)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data._id).toBe(VALID_BOOKING_ID);
    expect(res.body.data.status).toBe('pending');

    // Si assicura che clientId sia stato iniettato da auth middleware
    expect(mockBookingService.create).toHaveBeenCalledWith(payload, VALID_USER_ID);
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .send({
        professionalId: VALID_PROFESSIONAL_ID,
        skillId: VALID_SKILL_ID,
        date: '2026-07-25',
        timeSlot: '14:30-16:00',
        amount: 75.0,
      })
      .expect(401)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No token provided');
    expect(mockBookingService.create).not.toHaveBeenCalled();
  });

  it('should return 400 on service validation error', async () => {
    mockBookingService.create.mockRejectedValue(new Error('professionalId is required'));

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer fake-token')
      .send({ amount: 75 })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('professionalId is required');
  });

  it('should return 400 when required fields are missing (Mongoose validation)', async () => {
    mockBookingService.create.mockRejectedValue(
      new Error('Booking validation failed: date: Path `date` is required.')
    );

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer fake-token')
      .send({
        professionalId: VALID_PROFESSIONAL_ID,
        skillId: VALID_SKILL_ID,
        timeSlot: '14:30-16:00',
        amount: 75.0,
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('date');
  });

  it('should create booking with minimum required fields', async () => {
    const minimalBooking = {
      _id: VALID_BOOKING_ID,
      clientId: VALID_USER_ID,
      professionalId: VALID_PROFESSIONAL_ID,
      skillId: VALID_SKILL_ID,
      date: new Date('2026-07-25'),
      timeSlot: '14:30-16:00',
      amount: 100,
      status: 'pending',
    };

    mockBookingService.create.mockResolvedValue(minimalBooking);

    const payload = {
      professionalId: VALID_PROFESSIONAL_ID,
      skillId: VALID_SKILL_ID,
      date: '2026-07-25',
      timeSlot: '14:30-16:00',
      amount: 100,
    };

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer fake-token')
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pending');
    expect(mockBookingService.create).toHaveBeenCalledWith(payload, VALID_USER_ID);
  });

  it('should handle booking with all optional fields', async () => {
    const fullBooking = { ...sampleBooking, location: 'Roma - Piazza Navona', completedAt: null };
    mockBookingService.create.mockResolvedValue(fullBooking);

    const payload = {
      professionalId: VALID_PROFESSIONAL_ID,
      skillId: VALID_SKILL_ID,
      date: '2026-07-25',
      timeSlot: '14:30-16:00',
      amount: 75.0,
      notes: 'Test booking',
      location: 'Roma - Piazza Navona',
    };

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer fake-token')
      .send(payload)
      .expect(201);

    expect(res.body.data.location).toBe('Roma - Piazza Navona');
    expect(res.body.data.notes).toBe('Test booking');
  });
});

// ══════════════════════════════════════════════════════════════════
// PUT /api/v1/bookings/:id/status
// ══════════════════════════════════════════════════════════════════

describe('PUT /api/v1/bookings/:id/status', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  it('should update status to "confirmed" and return 200', async () => {
    const updatedBooking = { ...sampleBooking, status: 'confirmed' };
    mockBookingService.updateStatus.mockResolvedValue(updatedBooking);

    const res = await request(app)
      .put(`/api/v1/bookings/${VALID_BOOKING_ID}/status`)
      .set('Authorization', 'Bearer fake-token')
      .send({ status: 'confirmed' })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('confirmed');
    expect(mockBookingService.updateStatus).toHaveBeenCalledWith(
      VALID_BOOKING_ID,
      'confirmed',
      VALID_USER_ID
    );
  });

  it('should update status to "in_progress"', async () => {
    const updatedBooking = { ...sampleBooking, status: 'in_progress' };
    mockBookingService.updateStatus.mockResolvedValue(updatedBooking);

    const res = await request(app)
      .put(`/api/v1/bookings/${VALID_BOOKING_ID}/status`)
      .set('Authorization', 'Bearer fake-token')
      .send({ status: 'in_progress' })
      .expect(200);

    expect(res.body.data.status).toBe('in_progress');
  });

  it('should update status to "completed"', async () => {
    const updatedBooking = {
      ...sampleBooking,
      status: 'completed',
      completedAt: new Date('2026-07-25T16:00:00.000Z'),
    };
    mockBookingService.updateStatus.mockResolvedValue(updatedBooking);

    const res = await request(app)
      .put(`/api/v1/bookings/${VALID_BOOKING_ID}/status`)
      .set('Authorization', 'Bearer fake-token')
      .send({ status: 'completed' })
      .expect(200);

    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.completedAt).toBeDefined();
  });

  it('should update status to "cancelled"', async () => {
    const updatedBooking = { ...sampleBooking, status: 'cancelled' };
    mockBookingService.updateStatus.mockResolvedValue(updatedBooking);

    const res = await request(app)
      .put(`/api/v1/bookings/${VALID_BOOKING_ID}/status`)
      .set('Authorization', 'Bearer fake-token')
      .send({ status: 'cancelled' })
      .expect(200);

    expect(res.body.data.status).toBe('cancelled');
  });

  it('should return 400 when booking is not found', async () => {
    mockBookingService.updateStatus.mockRejectedValue(new Error('Booking not found'));

    const res = await request(app)
      .put(`/api/v1/bookings/aaaaaaaaaaaaaaaaaaaaaaaa/status`)
      .set('Authorization', 'Bearer fake-token')
      .send({ status: 'confirmed' })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Booking not found');
  });

  it('should return 400 when user is not authorized', async () => {
    mockBookingService.updateStatus.mockRejectedValue(new Error('Unauthorized'));

    const res = await request(app)
      .put(`/api/v1/bookings/${VALID_BOOKING_ID}/status`)
      .set('Authorization', 'Bearer fake-token')
      .send({ status: 'completed' })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app)
      .put(`/api/v1/bookings/${VALID_BOOKING_ID}/status`)
      .send({ status: 'confirmed' })
      .expect(401)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No token provided');
    expect(mockBookingService.updateStatus).not.toHaveBeenCalled();
  });

  it('should return 400 when status body is missing', async () => {
    // La route non valida esplicitamente il body → il service riceve `undefined`
    mockBookingService.updateStatus.mockRejectedValue(new Error('Status is required'));

    const res = await request(app)
      .put(`/api/v1/bookings/${VALID_BOOKING_ID}/status`)
      .set('Authorization', 'Bearer fake-token')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Status is required');
  });

  it('should update status with extra fields in body (ignored)', async () => {
    const updatedBooking = { ...sampleBooking, status: 'confirmed' };
    mockBookingService.updateStatus.mockResolvedValue(updatedBooking);

    const res = await request(app)
      .put(`/api/v1/bookings/${VALID_BOOKING_ID}/status`)
      .set('Authorization', 'Bearer fake-token')
      .send({ status: 'confirmed', notes: 'should be ignored', extraField: 42 })
      .expect(200);

    expect(res.body.success).toBe(true);
    // La route passa solo `status` al service
    expect(mockBookingService.updateStatus).toHaveBeenCalledWith(
      VALID_BOOKING_ID,
      'confirmed',
      VALID_USER_ID
    );
  });
});

// ══════════════════════════════════════════════════════════════════
// GET /api/v1/bookings/:id
// ══════════════════════════════════════════════════════════════════

describe('GET /api/v1/bookings/:id', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  it('should return 200 with the booking details', async () => {
    mockBookingService.getById.mockResolvedValue(sampleBooking);

    const res = await request(app)
      .get(`/api/v1/bookings/${VALID_BOOKING_ID}`)
      .set('Authorization', 'Bearer fake-token')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data._id).toBe(VALID_BOOKING_ID);
    expect(res.body.data.status).toBe('pending');
    expect(mockBookingService.getById).toHaveBeenCalledWith(VALID_BOOKING_ID);
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/${VALID_BOOKING_ID}`)
      .expect(401)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No token provided');
    expect(mockBookingService.getById).not.toHaveBeenCalled();
  });

  it('should return 404 when booking is not found', async () => {
    mockBookingService.getById.mockRejectedValue(new Error('Booking not found'));

    const res = await request(app)
      .get('/api/v1/bookings/aaaaaaaaaaaaaaaaaaaaaaaa')
      .set('Authorization', 'Bearer fake-token')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Booking not found');
  });
});
