import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { runDatabaseMigrations } from './db/migrations.js';
import { refreshPolicyCache } from './services/engine/pipeline.js';
import { gatewayRouter } from './routes/gateway.js';
import { telemetryRouter } from './routes/telemetry.js';
import { policiesRouter } from './routes/policies.js';
import { fraudRouter } from './routes/fraud.js';

const app = express();

// Hardened CORS and middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-ID']
}));

app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    gateway: 'TrustGate (Enclave) v1.0.0',
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime()
  });
});

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../dist');

// Mount Routes
app.use('/api/v1/gateway', gatewayRouter);
app.use('/api/v1/telemetry', telemetryRouter);
app.use('/api/v1/policies', policiesRouter);
app.use('/api/v1/fraud', fraudRouter);

// Serve Static Frontend Assets (Production & Standalone)
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[TrustGate Server Error]:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Bootstrapping
async function bootstrap() {
  try {
    await runDatabaseMigrations();
    await refreshPolicyCache();

    const server = app.listen(config.PORT, () => {
      console.log(`=======================================================`);
      console.log(`🛡️  TrustGate (Enclave) Security Gateway is ONLINE`);
      console.log(`🌐  Listening on: http://localhost:${config.PORT}`);
      console.log(`⚡  Gateway Ingestion: POST /api/v1/gateway/chat`);
      console.log(`📡  Live Telemetry Stream: GET /api/v1/telemetry/stream`);
      console.log(`⚙️  Active Policy Matrix: GET /api/v1/policies`);
      console.log(`=======================================================`);
    });

    const shutdown = () => {
      console.log('\n[TrustGate] Shutting down gracefully...');
      server.close(() => {
        console.log('[TrustGate] Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Fatal bootstrapping error:', err);
    process.exit(1);
  }
}

bootstrap();
