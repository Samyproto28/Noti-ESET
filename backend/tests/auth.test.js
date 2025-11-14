import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Auth Tests Suite', () => {
  describe('Basic Jest Functionality Tests', () => {
    it('should pass a basic test', () => {
      expect(true).toBe(true);
    });

    it('should validate that jest works', () => {
      expect(typeof jest.fn).toBe('function');
    });
  });

  describe('API Authentication Tests', () => {
    const testEmail = 'testuser@example.com';
    const testPassword = 'TestPassword123';

    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('token');
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('token');
    });

    it('should not login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: testPassword
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should require password minimum length', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
