// dotenv is loaded via `node -r dotenv/config` in package.json scripts
// so process.env is populated before any ES module is evaluated.
import express from 'express';
import cors from 'cors';
import raidRoutes from './routes/raid.js';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import reportsRoutes from './routes/reports.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// CORS — allow any localhost port (dev) and the deployed client URL
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (curl, Postman, server-to-server)
      // and any localhost port so Vite's port-hopping never breaks dev
      if (!origin || origin.includes('localhost') || origin === process.env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      }
    },
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check — used by Render's health probe and uptime monitors
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/raid', raidRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportsRoutes);

// ---------------------------------------------------------------------------
// 404 handler for unknown routes
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ---------------------------------------------------------------------------
// Global error handler — must be last
// ---------------------------------------------------------------------------
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] LTC RAID server running on port ${PORT}`);
});
