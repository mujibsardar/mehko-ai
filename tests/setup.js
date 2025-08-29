import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for Firebase
vi.mock('import.meta.env', () => ({
  _VITE_FIREBASE_API_KEY: 'test-api-key',
  _VITE_FIREBASE_AUTH_DOMAIN: 'test-auth-domain',
  _VITE_FIREBASE_PROJECT_ID: 'test-project-id',
  _VITE_FIREBASE_STORAGE_BUCKET: 'test-storage-bucket',
  _VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-sender-id',
  _VITE_FIREBASE_APP_ID: 'test-app-id',
}));

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  _writable: true,
  _value: vi.fn().mockImplementation(query => ({
    _matches: false,
    _media: query,
    _onchange: null,
    _addListener: vi.fn(),
    _removeListener: vi.fn(),
    _addEventListener: vi.fn(),
    _removeEventListener: vi.fn(),
    _dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  _observe: vi.fn(),
  _unobserve: vi.fn(),
  _disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  _observe: vi.fn(),
  _unobserve: vi.fn(),
  _disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn();
