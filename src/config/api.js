// API Configuration
// This file centralizes all API endpoints and configuration
// UPDATED: All endpoints now use Python backend (single server architecture)

import { API_BASE } from '../lib/apiBase.js';

const PYTHON_API_BASE =
  (import.meta?.env?.VITE_API_URL || '').trim() ||
  (API_BASE || '').trim() ||
  'http://127.0.0.1:8000';

export const API_CONFIG = {
  PYTHON_API: PYTHON_API_BASE,
  DEFAULT_API: PYTHON_API_BASE,
};

// Specific endpoint builders
export const buildEndpoint = (base, path) => `${base}${path}`;

// Common endpoints - ALL NOW USE PYTHON BACKEND
export const ENDPOINTS = {
  // Application endpoints (Python backend)
  APPS: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/api/apps'),
  APP_BY_ID: (base = API_CONFIG.PYTHON_API, appId) => buildEndpoint(base, `/api/apps/${encodeURIComponent(appId)}`),

  // AI endpoints (NOW Python backend)
  AI_CHAT: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/api/ai-chat'),
  AI_ANALYZE_PDF: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/api/ai-analyze-pdf'),

  // Form endpoints (NOW Python backend)
  FORM_FIELDS: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/api/form-fields'),
  FILL_PDF: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/api/fill-pdf'),

  // County processing (Python backend)
  PROCESS_COUNTY: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/api/admin/process-county'),
  
  // Admin endpoints (Python backend)
  GET_COUNTIES: (base = API_CONFIG.PYTHON_API) => buildEndpoint(base, '/api/admin/counties'),
  DELETE_COUNTY: (base = API_CONFIG.PYTHON_API, countyId) => buildEndpoint(base, `/api/admin/county/${encodeURIComponent(countyId)}`),
  
  // PDF endpoints (Python backend)
  CREATE_ACROFORM: (base = API_CONFIG.PYTHON_API, appId, formId) => buildEndpoint(base, `/api/apps/${encodeURIComponent(appId)}/forms/${encodeURIComponent(formId)}/create-acroform`),
  GET_ACROFORM_DEFINITION: (base = API_CONFIG.PYTHON_API, appId, formId) => buildEndpoint(base, `/api/apps/${encodeURIComponent(appId)}/forms/${encodeURIComponent(formId)}/acroform-definition`),
  GET_ACROFORM_PDF: (base = API_CONFIG.PYTHON_API, appId, formId) => buildEndpoint(base, `/api/apps/${encodeURIComponent(appId)}/forms/${encodeURIComponent(formId)}/acroform-pdf`),
  GET_PDF: (base = API_CONFIG.PYTHON_API, appId, formId) => buildEndpoint(base, `/api/apps/${encodeURIComponent(appId)}/forms/${encodeURIComponent(formId)}/pdf`),
  FILL_PDF_FORM: (base = API_CONFIG.PYTHON_API, appId, formId) => buildEndpoint(base, `/api/apps/${encodeURIComponent(appId)}/forms/${encodeURIComponent(formId)}/fill`)
};

// Helper function to get the appropriate API base for different services
export const getApiBase = (service = 'default') => {
  // All services now use Python backend
  return API_CONFIG.PYTHON_API;
};

export default API_CONFIG;
