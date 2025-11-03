// Configuración global para los tests
import { jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Mock de Supabase para tests
jest.mock('../../src/config/supabaseClient.js', () => {
  return {
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }
  };
});

// Configuración global para los tests
global.console = {
  ...console,
  // Silenciar logs durante los tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Configuración de timeout para tests asíncronos
jest.setTimeout(10000);