'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Business = require('../models/Business');
const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');

describe('Appointment Endpoints', () => {
  let authToken;
  let userId;
  let businessId;
  let customerId;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/cadence_test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await Business.deleteMany({});
    await Appointment.deleteMany({});
    await Customer.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create a test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    userId = user._id;

    // Create a business for the user
    const business = await Business.create({
      name: 'Test Business',
      industry: 'salon_spa',
      ownerId: userId,
      services: [
        { name: 'Haircut', durationMinutes: 30, price: 50 },
      ],
      staff: [{ name: 'John Doe' }],
      openingHours: [
        { day: 0, isOpen: false, openTime: null, closeTime: null },
        { day: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 6, isOpen: false, openTime: null, closeTime: null },
      ],
      timezone: 'America/New_York',
    });
    businessId = business._id;

    // Link business to user
    user.businessId = businessId;
    await user.save();

    // Create a customer
    const customer = await Customer.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '123-456-7890',
    });
    customerId = customer._id;

    // Login to get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    const cookies = loginRes.headers['set-cookie'];
    authToken = cookies;
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
    await Business.deleteMany({});
    await Appointment.deleteMany({});
    await Customer.deleteMany({});
  });

  describe('POST /api/appointments', () => {
    it('should create an appointment successfully', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
      appointmentDate.setHours(10, 0, 0, 0);

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', authToken)
        .send({
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
          service: 'Haircut',
          date: appointmentDate.toISOString(),
          staffName: 'John Doe',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.appointment).toHaveProperty('id');
      expect(res.body.appointment.service).toBe('Haircut');
    });

    it('should reject appointment without authentication', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .send({
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
          service: 'Haircut',
          date: new Date().toISOString(),
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject appointment with invalid service name', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', authToken)
        .send({
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
          service: 'NonExistentService',
          date: new Date().toISOString(),
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject appointment with invalid date format', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', authToken)
        .send({
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
          service: 'Haircut',
          date: 'invalid-date',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/appointments', () => {
    beforeEach(async () => {
      // Create a test appointment
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
      appointmentDate.setHours(10, 0, 0, 0);

      await Appointment.create({
        businessId,
        customerId,
        service: 'Haircut',
        durationMinutes: 30,
        date: appointmentDate,
        status: 'pending',
        staffName: 'John Doe',
      });
    });

    it('should list appointments for authenticated user', async () => {
      const res = await request(app)
        .get('/api/appointments')
        .set('Cookie', authToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.appointments)).toBe(true);
      expect(res.body.appointments.length).toBeGreaterThan(0);
    });

    it('should filter appointments by status', async () => {
      const res = await request(app)
        .get('/api/appointments?status=pending')
        .set('Cookie', authToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.appointments.every(app => app.status === 'pending')).toBe(true);
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/appointments');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/appointments/:id', () => {
    let appointmentId;

    beforeEach(async () => {
      // Create a test appointment
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
      appointmentDate.setHours(10, 0, 0, 0);

      const appointment = await Appointment.create({
        businessId,
        customerId,
        service: 'Haircut',
        durationMinutes: 30,
        date: appointmentDate,
        status: 'pending',
        staffName: 'John Doe',
      });
      appointmentId = appointment._id;
    });

    it('should update appointment status', async () => {
      const res = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Cookie', authToken)
        .send({
          status: 'confirmed',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.appointment.status).toBe('confirmed');
    });

    it('should reject invalid status', async () => {
      const res = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Cookie', authToken)
        .send({
          status: 'invalid_status',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .send({
          status: 'confirmed',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    let appointmentId;

    beforeEach(async () => {
      // Create a test appointment
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
      appointmentDate.setHours(10, 0, 0, 0);

      const appointment = await Appointment.create({
        businessId,
        customerId,
        service: 'Haircut',
        durationMinutes: 30,
        date: appointmentDate,
        status: 'pending',
        staffName: 'John Doe',
      });
      appointmentId = appointment._id;
    });

    it('should cancel appointment', async () => {
      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Cookie', authToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.appointment.status).toBe('cancelled');
    });

    it('should reject cancellation without authentication', async () => {
      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
