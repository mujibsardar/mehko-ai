// API Configuration
// This file centralizes all API endpoints and configuration

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Base URLs - Now using unified API Gateway
export const API_CONFIG = {
  // Unified API Gateway (handles routing to both backends)
  GATEWAY_API: isDevelopment ? 'http://localhost:3001' : '/api',
  
  // Legacy direct access (for debugging if needed)
  PYTHON_API: isDevelopment ? 'http://127.0.0.1:8000' : '/api',
  NODE_API: isDevelopment ? 'http://localhost:3000' : '/api',
  
  // Default API (now uses gateway)
  DEFAULT_API: isDevelopment ? 'http://localhost:3001' : '/api'
};

// Specific endpoint builders
export const buildEndpoint = (base, path) => `${base}${path}`;

// Common endpoints
export const ENDPOINTS = {
  // Application endpoints
  APPS: (base = API_CONFIG.DEFAULT_API) => buildEndpoint(base, '/apps'),
  APP_BY_ID: (base = API_CONFIG.DEFAULT_API, appId) => buildEndpoint(base, `/apps/${encodeURIComponent(appId)}`),
  
  // AI endpoints
  AI_CHAT: (base = API_CONFIG.DEFAULT_API) => buildEndpoint(base, '/api/ai-chat'),
  AI_ANALYZE_PDF: (base = API_CONFIG.DEFAULT_API) => buildEndpoint(base, '/api/ai-analyze-pdf'),
  
  // Form endpoints
  FORM_FIELDS: (base = API_CONFIG.DEFAULT_API) => buildEndpoint(base, '/api/form-fields'),
  FILL_PDF: (base = API_CONFIG.DEFAULT_API) => buildEndpoint(base, '/api/fill-pdf'),
  
  // County processing
  PROCESS_COUNTY: (base = API_CONFIG.DEFAULT_API) => buildEndpoint(base, '/process-county')
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
