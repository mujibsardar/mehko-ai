#!/usr/bin/env node

import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Helper function to forward requests
async function forwardRequest(targetUrl, req, res) {
  try {
    const url = new URL(req.path, targetUrl);
    url.search = req.url.split('?')[1] || '';
    
    const options = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        ...req.headers
      }
    };

    if (req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url.toString(), options);
    const data = await response.text();
    
    res.status(response.status).set(response.headers.raw()).send(data);
  } catch (error) {
    console.error(`Error forwarding to ${targetUrl}:`, error.message);
    res.status(502).json({
      error: 'Backend unavailable',
      details: error.message
    });
  }
}

// AI endpoints (Node.js backend)
app.use('/api/ai-chat', async (req, res) => {
  await forwardRequest('http://localhost:3000', req, res);
});

app.use('/api/ai-analyze-pdf', async (req, res) => {
  await forwardRequest('http://localhost:3000', req, res);
});

app.use('/api/form-fields', async (req, res) => {
  await forwardRequest('http://localhost:3000', req, res);
});

app.use('/api/fill-pdf', async (req, res) => {
  await forwardRequest('http://localhost:3000', req, res);
});

// Application endpoints (Python backend)
app.use('/api/apps', async (req, res) => {
  await forwardRequest('http://127.0.0.1:8000', req, res);
});

// County processing (Python backend)
app.use('/api/process-county', async (req, res) => {
  await forwardRequest('http://127.0.0.1:8000', req, res);
});

// Serve static files from dist directory (for production)
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, _next) => {
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
