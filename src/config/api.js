// API Configuration
// This file centralizes all API endpoints and configuration

import { API_BASE } from '../lib/apiBase.js';

// Base URLs - Using the centralized API base configuration
export const API_CONFIG = {
  // Use the centralized API base for all endpoints
  PYTHON_API: API_BASE,
  NODE_API: API_BASE,
  DEFAULT_API: API_BASE
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
