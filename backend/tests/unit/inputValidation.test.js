import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock de Supabase
jest.mock('../../src/config/supabaseClient.js', () => ({
  default: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }
}));

// Mock de JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ userId: 'test-user' }))
}));

describe('Validación de Entrada - Seguridad', () => {
  let app;
  let mockAuthMiddleware;

  beforeAll(async () => {
    // Crear app de prueba
    app = express();
    app.use(express.json());

    // Mock del middleware de autenticación
    mockAuthMiddleware = (req, res, next) => {
      req.user = { id: 'test-user', email: 'test@example.com' };
      next();
    };

    // Importar y configurar las rutas de autenticación después de los mocks
    try {
      const authRoutes = await import('../../src/routes/auth.routes.js');
      app.use('/api/auth', authRoutes.default);
    } catch (error) {
      // Si no podemos importar las rutas, crearemos endpoints de prueba manualmente
      console.warn('No se pudieron importar las rutas de autenticación, creando endpoints de prueba');

      // Endpoint de registro sin validación (PROBLEMA A DETECTAR)
      app.post('/api/auth/register', async (req, res) => {
        const { email, password, name } = req.body;
        // Sin validación - VULNERABILIDAD
        res.status(201).json({ message: 'Usuario registrado', user: { email, name } });
      });

      // Endpoint de login sin validación (PROBLEMA A DETECTAR)
      app.post('/api/auth/login', async (req, res) => {
        const { email, password } = req.body;
        // Sin validación - VULNERABILIDAD
        res.json({ message: 'Login exitoso', token: 'mock-token' });
      });
    }
  });

  describe('Registro de Usuario - Vulnerabilidades de Validación', () => {
    it('DEBERÍA RECHAZAR emails inválidos - PERO FALLA (VULNERABILIDAD)', async () => {
      const invalidEmails = [
        'sin-arroba',
        '@sin-dominio',
        'correo@',
        'correo.dominio.com',
        'correo@dominio',
        'espacios@correo.com',
        'correo@dominio..com'
      ];

      for (const invalidEmail of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: invalidEmail,
            password: 'password123',
            name: 'Test User'
          });

        // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 200 por falta de validación
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('DEBERÍA RECHAZAR passwords inseguros - PERO FALLA (VULNERABILIDAD)', async () => {
      const insecurePasswords = [
        '',
        'a',
        '123',
        'password',
        '123456',
        'qwerty',
        '111111',
        'aaaaaa'
      ];

      for (const password of insecurePasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: password,
            name: 'Test User'
          });

        // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 201 por falta de validación
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('DEBERÍA RECHAZAR nombres vacíos o muy cortos - PERO FALLA (VULNERABILIDAD)', async () => {
      const invalidNames = [
        '',
        '   ',
        'A',
        'ab',
        'abc'
      ];

      for (const name of invalidNames) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'SecurePassword123!',
            name: name
          });

        // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 201 por falta de validación
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('DEBERÍA RECHAZAR datos con caracteres peligrosos - PERO FALLA (VULNERABILIDAD XSS)', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '${alert("XSS")}',
        '{{alert("XSS")}}'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'SecurePassword123!',
            name: payload
          });

        // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 201 por falta de validación
        expect(response.status).toBe(400);
      }
    });

    it('DEBERÍA RECHAZAR requests sin campos requeridos - PERO FALLA (VULNERABILIDAD)', async () => {
      const incompleteData = [
        { email: 'test@example.com' }, // Falta password y name
        { password: 'SecurePassword123!' }, // Falta email y name
        { name: 'Test User' }, // Falta email y password
        {} // Todos los campos faltan
      ];

      for (const data of incompleteData) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(data);

        // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 201 por falta de validación
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Login de Usuario - Vulnerabilidades de Validación', () => {
    it('DEBERÍA RECHAZAR emails inválidos en login - PERO FALLA (VULNERABILIDAD)', async () => {
      const invalidEmails = [
        'invalid-email',
        '',
        null,
        undefined,
        '    ',
        '@example.com',
        'user@'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: email,
            password: 'password123'
          });

        // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 200 por falta de validación
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('DEBERÍA RECHAZAR passwords vacíos en login - PERO FALLA (VULNERABILIDAD)', async () => {
      const invalidPasswords = [
        '',
        null,
        undefined,
        '   '
      ];

      for (const password of invalidPasswords) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: password
          });

        // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 200 por falta de validación
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Validación de Tamaño de Datos', () => {
    it('DEBERÍA RECHAZAR inputs demasiado largos - PERO FALLA (VULNERABILIDAD DoS)', async () => {
      const longString = 'a'.repeat(10000);
      const longEmail = 'a'.repeat(500) + '@example.com';

      const oversizedData = [
        { email: longEmail, password: 'password123', name: 'Test' },
        { email: 'test@example.com', password: longString, name: 'Test' },
        { email: 'test@example.com', password: 'password123', name: longString }
      ];

      for (const data of oversizedData) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(data);

        // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 201 por falta de validación
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Validación de Tipos de Datos', () => {
    it('DEBERÍA RECHAZAR tipos de datos incorrectos - PERO FALLA (VULNERABILIDAD)', async () => {
      const invalidTypes = [
        { email: 123, password: 'password123', name: 'Test' }, // email como número
        { email: 'test@example.com', password: true, name: 'Test' }, // password como boolean
        { email: 'test@example.com', password: 'password123', name: ['Test'] }, // name como array
        { email: null, password: 'password123', name: 'Test' }, // email como null
        { email: undefined, password: 'password123', name: 'Test' } // email como undefined
      ];

      for (const data of invalidTypes) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(data);

        // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 201 por falta de validación
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Validación de Caracteres Especiales', () => {
    it('DEBERÍA ESCAPEAR caracteres especiales - PERO FALLA (VULNERABILIDAD)', async () => {
      const specialChars = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        '${7*7}',
        '{{7*7}}',
        '<!--',
        '-->',
        '<?php',
        '?>',
        '%00',
        '%0a',
        '%0d'
      ];

      for (const char of specialChars) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: `test${char}@example.com`,
            password: `password${char}`
          });

        // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 200 por falta de validación
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Validación de Contenido', () => {
    it('DEBERÍA SANITIZAR HTML en inputs - PERO FALLA (VULNERABILIDAD XSS)', async () => {
      const htmlPayload = '<img src=x onerror=alert("XSS")>';

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: htmlPayload
        });

      // ESTA PRUEBA DEBERÍA FALLAR - Actualmente devuelve 201 por falta de validación
      expect(response.status).toBe(400);
    });

    it('DEBERÍA VALIDAR formato de email - PERO FALLA (VULNERABILIDAD)', async () => {
      const invalidEmailFormats = [
        'plaintext',
        'user@localhost',
        'user@123.456.789.012',
        'user@[123.123.123.123]',
        'user@123.123.123.123.123',
        '.user@example.com',
        'user.@example.com',
        'user..name@example.com'
      ];

      for (const email of invalidEmailFormats) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: email,
            password: 'SecurePassword123!',
            name: 'Test User'
          });

        // ESTA PRUEBA DEBERÍA FALLAR - Algunos emails podrían ser válidos localmente
        if (!email.includes('localhost')) {
          expect(response.status).toBe(400);
        }
      }
    });
  });

  describe('Validación de Rate Limiting (si existe)', () => {
    it('DEBERÍA IMPLEMENTAR rate limiting - PERO FALLA (VULNERABILIDAD)', async () => {
      // Enviar múltiples requests rápidamente
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'password123'
            })
        );
      }

      const responses = await Promise.all(requests);

      // ESTA PRUEBA DEBERÍA FALLAR - Sin rate limiting, todas las peticiones deberían ser 200
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThan(100);
    });
  });

  describe('Validación de Headers HTTP', () => {
    it('DEBERÍA VALIDAR Content-Type - PERO FALLA (VULNERABILIDAD)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'text/plain') // Content-Type incorrecto
        .send('invalid-data');

      // ESTA PRUEBA DEBERÍA FALLAR - Debería rechazar Content-Type incorrecto
      expect(response.status).toBe(415);
      expect(response.body).toHaveProperty('error');
    });

    it('DEBERÍA VALIDAR tamaño del payload - PERO FALLA (VULNERABILIDAD)', async () => {
      const largePayload = 'a'.repeat(1000000); // 1MB de datos

      const response = await request(app)
        .post('/api/auth/register')
        .send(largePayload);

      // ESTA PRUEBA DEBERÍA FALLAR - Debería rechazar payloads muy grandes
      expect(response.status).toBe(413);
      expect(response.body).toHaveProperty('error');
    });
  });
});