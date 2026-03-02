import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authMiddleware, AuthRequest } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import sessionsRoutes from './routes/sessions.js';
import messagesRoutes from './routes/messages.js';
import usersRoutes from './routes/users.js';
import auditRoutes from './routes/audit.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// ---------- Security ----------

app.use(helmet({
    contentSecurityPolicy: false, // handled by nginx
    crossOriginEmbedderPolicy: false,
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));

// ---------- Rate Limiting ----------

const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

app.use(globalLimiter);

// ---------- Body Parser ----------

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------- Trust Proxy (behind nginx) ----------

app.set('trust proxy', 1);

// ---------- Health Check ----------

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'atria-api', timestamp: new Date().toISOString() });
});

// ---------- Public Routes ----------

app.use('/auth', authRoutes);

// ---------- Protected Routes ----------

app.use('/sessions', authMiddleware as express.RequestHandler, sessionsRoutes);
app.use('/messages', authMiddleware as express.RequestHandler, messagesRoutes);
app.use('/users', authMiddleware as express.RequestHandler, usersRoutes);
app.use('/audit', authMiddleware as express.RequestHandler, auditRoutes);

// ---------- 404 Handler ----------

app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// ---------- Error Handler ----------

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// ---------- Start ----------

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🚀 atrIA API running on http://0.0.0.0:${PORT}`);
    console.log(`  📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
