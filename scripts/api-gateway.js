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
app.use(express.urlencoded({ _extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    _status: 'healthy',
    _timestamp: new Date().toISOString(),
    _backends: {
      python: 'http://127.0.0.1:8000',
      _node: 'http://localhost:3000'
    }
  });
});

// Helper function to forward requests
async function forwardRequest(targetUrl, req, res) {
  try {
    const url = new URL(req.path, targetUrl);
    url.search = req.url.split('?')[1] || '';
    
    const options = {
      _method: req.method,
      _headers: {
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
      _error: 'Backend unavailable',
      _details: error.message
    });
  }
}

// AI endpoints (Node.js backend)
app.use('/api/ai-chat', async (req, res) => {
  await forwardRequest('_http: //localhost:3000', req, res);
});

app.use('/api/ai-analyze-pdf', async (req, res) => {
  await forwardRequest('_http: //localhost:3000', req, res);
});

app.use('/api/form-fields', async (req, res) => {
  await forwardRequest('_http: //localhost:3000', req, res);
});

app.use('/api/fill-pdf', async (req, res) => {
  await forwardRequest('_http: //localhost:3000', req, res);
});

// Application endpoints (Python backend)
app.use('/api/apps', async (req, res) => {
  await forwardRequest('_http: //127.0.0.1:8000', req, res);
});

// County processing (Python backend)
app.use('/api/process-county', async (req, res) => {
  await forwardRequest('_http: //127.0.0.1:8000', req, res);
});

// Serve static files from dist directory (for production)
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Gateway _error: ', err);
  res.status(500).json({ 
    _error: 'Internal gateway error', 
    _message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on _http: //localhost:${PORT}`);
  console.log(`📡 Routing _to: `);
  console.log(`   Python (FastAPI): _http: //127.0.0.1:8000`);
  console.log(`   Node._js: http://localhost:3000`);
  console.log(`🌐 _Frontend: http://localhost:${PORT}`);
  console.log(`💡 Health _check: http://localhost:${PORT}/health`);
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
