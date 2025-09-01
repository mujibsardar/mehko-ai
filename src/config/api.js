// API Configuration
// This file centralizes all API endpoints and configuration

import { API_BASE } from '../lib/apiBase.js';

const PYTHON_API_BASE =
  (import.meta?.env?.VITE_PYTHON_API || '').trim() ||
  (API_BASE || '').trim() ||
  'http://127.0.0.1:8000';

const NODE_API_BASE =
  (import.meta?.env?.VITE_NODE_API || '').trim() ||
  (API_BASE || '').trim() ||
  'http://127.0.0.1:3001';

export const API_CONFIG = {
  PYTHON_API: PYTHON_API_BASE,
  NODE_API: NODE_API_BASE,
  DEFAULT_API: PYTHON_API_BASE,
};

// Specific endpoint builders
export const buildEndpoint = (base, path) => `${base}${path}`;

// Common endpoints
export const ENDPOINTS = {
  // Application endpoints (Python backend)
  APPS: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/apps'),
  APP_BY_ID: (base = API_CONFIG.PYTHON_API, appId) => buildEndpoint(base, `/apps/${encodeURIComponent(appId)}`),

  // AI endpoints (Node.js backend)
  AI_CHAT: (base = API_CONFIG.NODE_API) => buildEndpoint(base, '/api/ai-chat'),
  AI_ANALYZE_PDF: (base = API_CONFIG.NODE_API) => buildEndpoint(base, '/api/ai-analyze-pdf'),

  // Form endpoints (Node.js backend)
  FORM_FIELDS: (base = API_CONFIG.NODE_API) => buildEndpoint(base, '/api/form-fields'),
  FILL_PDF: (base = API_CONFIG.NODE_API) => buildEndpoint(base, '/api/fill-pdf'),

  // County processing (Python backend)
  PROCESS_COUNTY: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/apps/process-county')
};

// Helper function to get the appropriate API base for different services
export const getApiBase = (service = 'default') => {
  switch (service) {
    case 'python':
      return API_CONFIG.PYTHON_API;
    case 'node':
      return API_CONFIG.NODE_API;
    default:
      return API_CONFIG.DEFAULT_API;
  }
};

export default API_CONFIG;
