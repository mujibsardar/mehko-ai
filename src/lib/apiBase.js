// API Base Configuration
// This ensures API calls go to the correct backend in different environments

export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (location.hostname === 'localhost' ? 'http://localhost' : 'https://api.mehko.ai');

// Helper function to build API URLs
export const buildApiUrl = (path) => {
  // Ensure path starts with /api
  const apiPath = path.startsWith('/api') ? path : `/api${path}`;
  return `${API_BASE}${apiPath}`;
};

// Test function to verify API base configuration
export const testApiBase = () => {
  console.log('🔧 API Base Configuration Test:');
  console.log('  • VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('  • Hostname:', location.hostname);
  console.log('  • API_BASE:', API_BASE);
  console.log('  • Test URL:', buildApiUrl('/test'));
  
  return {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    hostname: location.hostname,
    API_BASE: API_BASE,
    testUrl: buildApiUrl('/test')
  };
};

// Debug logging in development
if (import.meta.env.DEV) {
  console.log('API Configuration:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    hostname: location.hostname,
    API_BASE: API_BASE
  });
}
