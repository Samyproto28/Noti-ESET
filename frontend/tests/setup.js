// Configuración global para las pruebas del frontend
import { jest } from '@jest/globals';

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock de sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock de fetch
global.fetch = jest.fn();

// Mock de window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    href: 'http://localhost:5500',
    origin: 'http://localhost:5500'
  },
  writable: true
});

// Mock de window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

// Mock de CustomEvent
global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
  }
};

// Mock de dispatchEvent
Object.defineProperty(EventTarget.prototype, 'dispatchEvent', {
  value: jest.fn(),
  writable: true
});

// Mock de alert
global.alert = jest.fn();

// Mock de confirm
global.confirm = jest.fn(() => true);

// Mock de prompt
global.prompt = jest.fn(() => 'test input');

// Configuración de timeout para tests asíncronos
jest.setTimeout(10000);

// Limpiar mocks después de cada prueba
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});