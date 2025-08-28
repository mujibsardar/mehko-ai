#!/usr/bin/env node

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    backends: {
      python: 'http://127.0.0.1:8000',
      node: 'http://localhost:3000'
    }
  });
});

// Route Python backend calls (FastAPI)
app.use('/api/python', createProxyMiddleware({
  target: 'http://127.0.0.1:8000',
  changeOrigin: true,
  pathRewrite: { '^/api/python': '' },
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Python backend error:', err.message);
    res.status(502).json({ 
      error: 'Python backend unavailable', 
      details: err.message 
    });
  }
}));

// Route Node.js backend calls
app.use('/api/node', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: { '^/api/node': '' },
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Node.js backend error:', err.message);
    res.status(502).json({ 
      error: 'Node.js backend unavailable', 
      details: err.message 
    });
  }
}));

// Smart routing based on endpoint patterns
app.use('/api/ai-chat', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  logLevel: 'debug'
}));

app.use('/api/ai-analyze-pdf', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  logLevel: 'debug'
}));

app.use('/api/form-fields', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  logLevel: 'debug'
}));

app.use('/api/fill-pdf', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  logLevel: 'debug'
}));

// Application endpoints (Python backend)
app.use('/api/apps', createProxyMiddleware({
  target: 'http://127.0.0.1:8000',
  changeOrigin: true,
  logLevel: 'debug'
}));

// County processing (Python backend)
app.use('/api/process-county', createProxyMiddleware({
  target: 'http://127.0.0.1:8000',
  changeOrigin: true,
  logLevel: 'debug'
}));

// Serve static files from dist directory (for production)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ 
    error: 'Internal gateway error', 
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
  console.log(`📡 Routing to:`);
  console.log(`   Python (FastAPI): http://127.0.0.1:8000`);
  console.log(`   Node.js: http://localhost:3000`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
