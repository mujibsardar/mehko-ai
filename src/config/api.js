// API Configuration
// This file centralizes all API endpoints and configuration

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV; // Fixed to handle undefined NODE_ENV

// Base URLs - Temporarily using direct connections while API Gateway is fixed
export const API_CONFIG = {
  // Direct backend connections (temporary)
  PYTHON_API: isDevelopment ? 'http://127.0.0.1:8000' : '/api',
  NODE_API: isDevelopment ? 'http://localhost:3000' : '/api',

  // Default API (temporarily using Node.js for AI endpoints)
  DEFAULT_API: isDevelopment ? 'http://localhost:3000' : '/api'
};

// Specific endpoint builders
export const buildEndpoint = (base, path) => `${base}${path}`;

// Common endpoints
export const ENDPOINTS = {
  // Application endpoints (Python backend)
  APPS: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/api/apps'),
  APP_BY_ID: (base = API_CONFIG.PYTHON_API, appId) => buildEndpoint(base, `/api/apps/${encodeURIComponent(appId)}`),

  // AI endpoints (Node.js backend)
  AI_CHAT: (base = API_CONFIG.NODE_API) => buildEndpoint(base, '/api/ai-chat'),
  AI_ANALYZE_PDF: (base = API_CONFIG.NODE_API) => buildEndpoint(base, '/api/ai-analyze-pdf'),

  // Form endpoints (Node.js backend)
  FORM_FIELDS: (base = API_CONFIG.NODE_API) => buildEndpoint(base, '/api/form-fields'),
  FILL_PDF: (base = API_CONFIG.NODE_API) => buildEndpoint(base, '/api/fill-pdf'),

  // County processing (Python backend)
  PROCESS_COUNTY: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/api/process-county')
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
