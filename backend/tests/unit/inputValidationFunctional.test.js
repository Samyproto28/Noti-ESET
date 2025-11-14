import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('Validación de Entrada - Pruebas Funcionales', () => {
  let app;

  beforeAll(async () => {
    // Crear app de prueba
    app = express();
    app.use(express.json());

    // Importar rutas reales con validación
    try {
      const authRoutesModule = await import('../src/routes/auth.routes.js');
      app.use('/api/auth', authRoutesModule.default);
    } catch (error) {
      console.warn('No se pudieron importar las rutas de autenticación, creando endpoints con validación básica');

      // Importar validadores
      const { validateRegister, validateLogin } = await import('../../src/validators/authValidators.js');

      // Crear endpoints con validación real
      app.post('/api/auth/register', validateRegister, (req, res) => {
        res.status(201).json({
          success: true,
          message: 'Usuario registrado',
          user: { email: req.body.email, name: req.body.name }
        });
      });

      app.post('/api/auth/login', validateLogin, (req, res) => {
        res.json({
          success: true,
          message: 'Login exitoso',
          token: 'mock-token'
        });
      });
    }
  });

  describe('Validación de Email en Registro', () => {
    it('DEBERÍA RECHAZAR emails inválidos', async () => {
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
            password: 'SecurePass123!',
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('DEBERÍA ACEPTAR emails válidos', async () => {
      const validEmails = [
        'usuario@dominio.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'user_name@sub.domain.com'
      ];

      for (const validEmail of validEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: validEmail,
            password: 'SecurePass123!',
            name: 'Test User'
          });

        // Si pasa la validación, debería recibir 201 o un error diferente
        expect([201, 400]).toContain(response.status);
        if (response.status === 400) {
          // Si hay error, no debería ser por el formato del email
          expect(response.body.error).not.toMatch(/email.*válido/i);
        }
      }
    });
  });

  describe('Validación de Contraseña en Registro', () => {
    it('DEBERÍA RECHAZAR passwords inseguros', async () => {
      const insecurePasswords = [
        '',
        'a',
        '123',
        'password',
        '123456',
        'qwerty',
        '111111',
        'aaaaaa',
        'short',
        'nouppercase1!',
        'NOLOWERCASE1!',
        'NoNumbers!',
        'NoSpecialChars1'
      ];

      for (const password of insecurePasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: password,
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('DEBERÍA ACEPTAR passwords seguros', async () => {
      const securePasswords = [
        'SecurePass123!',
        'MyP@ssw0rd2024',
        'Str0ng#Password',
        'C0mpl3x$P@ss'
      ];

      for (const password of securePasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: password,
            name: 'Test User'
          });

        // Si pasa la validación, debería recibir 201 o un error diferente
        expect([201, 400]).toContain(response.status);
        if (response.status === 400) {
          // Si hay error, no debería ser por el formato de la contraseña
          expect(response.body.error).not.toMatch(/contraseña.*debe/i);
        }
      }
    });
  });

  describe('Validación de Nombre', () => {
    it('DEBERÍA RECHAZAR nombres vacíos o muy cortos', async () => {
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
            password: 'SecurePass123!',
            name: name
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('DEBERÍA ACEPTAR nombres válidos', async () => {
      const validNames = [
        'Juan Pérez',
        'María García',
        'John Doe',
        'José María',
        'Ana María López'
      ];

      for (const name of validNames) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
            name: name
          });

        // Si pasa la validación, debería recibir 201 o un error diferente
        expect([201, 400]).toContain(response.status);
        if (response.status === 400) {
          // Si hay error, no debería ser por el formato del nombre
          expect(response.body.error).not.toMatch(/nombre.*debe/i);
        }
      }
    });
  });

  describe('Validación de Datos con Caracteres Peligrosos', () => {
    it('DEBERÍA SANITIZAR o RECHAZAR XSS payloads', async () => {
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
            password: 'SecurePass123!',
            name: payload
          });

        // Debería rechazarlo o sanitizarlo
        expect([400, 201]).toContain(response.status);
        if (response.status === 201) {
          // Si lo acepta, el nombre debería estar sanitizado
          expect(response.body.user.name).not.toContain('<script>');
          expect(response.body.user.name).not.toContain('javascript:');
        }
      }
    });
  });

  describe('Validación de Campos Requeridos', () => {
    it('DEBERÍA RECHAZAR requests sin campos requeridos', async () => {
      const incompleteData = [
        { email: 'test@example.com' }, // Falta password y name
        { password: 'SecurePass123!' }, // Falta email y name
        { name: 'Test User' }, // Falta email y password
        {} // Todos los campos faltan
      ];

      for (const data of incompleteData) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(data);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Validación de Login', () => {
    it('DEBERÍA RECHAZAR emails inválidos en login', async () => {
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

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('DEBERÍA RECHAZAR passwords vacíos en login', async () => {
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

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Validación de Tamaño de Datos', () => {
    it('DEBERÍA RECHAZAR inputs demasiado largos', async () => {
      const longString = 'a'.repeat(10000);
      const longEmail = 'a'.repeat(500) + '@example.com';

      const oversizedData = [
        { email: longEmail, password: 'SecurePass123!', name: 'Test' },
        { email: 'test@example.com', password: longString, name: 'Test' },
        { email: 'test@example.com', password: 'SecurePass123!', name: longString }
      ];

      for (const data of oversizedData) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(data);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});