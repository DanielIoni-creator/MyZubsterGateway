const request = require('supertest');
const app = require('../server.test');

describe('Bookings API', () => {
  describe('GET /api/bookings', () => {
    it('should return 200 and an array of bookings', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/bookings', () => {
    const validBooking = {
      serviceId: '12345',
      userId: '67890',
      date: '2026-07-25',
      time: '14:30',
      notes: 'Test booking'
    };

    it('should create a new booking and return 201', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .send(validBooking)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.serviceId).toBe(validBooking.serviceId);
    });

    it('should return 400 if required fields are missing', async () => {
      const invalidBooking = { serviceId: '12345' };

      const response = await request(app)
        .post('/api/bookings')
        .send(invalidBooking)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('should return 200 and the booking details', async () => {
      const newBooking = {
        serviceId: '12345',
        userId: '67890',
        date: '2026-07-25',
        time: '14:30'
      };

      const createResponse = await request(app)
        .post('/api/bookings')
        .send(newBooking)
        .expect(201);

      const bookingId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', bookingId);
      expect(response.body.serviceId).toBe(newBooking.serviceId);
    });

    it('should return 404 if booking not found', async () => {
      const response = await request(app)
        .get('/api/bookings/999999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/bookings/:id', () => {
    it('should update the booking and return 200', async () => {
      const newBooking = {
        serviceId: '12345',
        userId: '67890',
        date: '2026-07-25',
        time: '14:30'
      };

      const createResponse = await request(app)
        .post('/api/bookings')
        .send(newBooking)
        .expect(201);

      const bookingId = createResponse.body.id;

      const updatedData = {
        date: '2026-07-26',
        time: '16:00',
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/bookings/${bookingId}`)
        .send(updatedData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', bookingId);
      expect(response.body.date).toBe(updatedData.date);
      expect(response.body.notes).toBe(updatedData.notes);
    });

    it('should return 404 if booking to update not found', async () => {
      const response = await request(app)
        .put('/api/bookings/999999')
        .send({ date: '2026-07-26' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/bookings/:id', () => {
    it('should delete the booking and return 204', async () => {
      const newBooking = {
        serviceId: '12345',
        userId: '67890',
        date: '2026-07-25',
        time: '14:30'
      };

      const createResponse = await request(app)
        .post('/api/bookings')
        .send(newBooking)
        .expect(201);

      const bookingId = createResponse.body.id;

      await request(app)
        .delete(`/api/bookings/${bookingId}`)
        .expect(204);
    });

    it('should return 404 if booking to delete not found', async () => {
      const response = await request(app)
        .delete('/api/bookings/999999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
