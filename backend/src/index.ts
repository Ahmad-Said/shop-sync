import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRouter from './routes/auth.js';
import eventsRouter from './routes/events.js';
import itemsRouter from './routes/items.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { pool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';

const app = express();
const httpServer = createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: corsOrigin, credentials: true },
});

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// Attach io to request for route handlers to emit events
app.use((req, _res, next) => {
  (req as any).io = io;
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/items', itemsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

registerSocketHandlers(io);

const PORT = process.env.PORT || 3001;

async function waitForDB(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected');
      return;
    } catch (err) {
      console.log(`DB not ready, retrying in ${delay}ms... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Could not connect to database');
}

waitForDB().then(() => {
  return runMigrations();
}).then(() => {
  httpServer.listen(PORT, () => {
    console.log(`ShopSync backend running on port ${PORT}`);
  });
}).catch(err => {
  console.error(err);
  process.exit(1);
});

export { io };
