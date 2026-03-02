import { Router, Response } from 'express';
import { query } from '../db.js';
import { AuthRequest, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// ---------- POST /audit ---------- (any authenticated user)

router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { action } = req.body;

        if (!action?.trim()) {
            res.status(400).json({ error: 'action é obrigatório' });
            return;
        }

        await query(
            'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [req.user!.userId, action.trim(), req.ip, req.get('user-agent')]
        );

        res.status(201).json({ message: 'Audit log registrado' });
    } catch (err) {
        console.error('[Audit] Create error:', err);
        res.status(500).json({ error: 'Erro ao registrar log' });
    }
});

// ---------- GET /audit ---------- (admin only)

router.get('/', adminMiddleware, async (_req: AuthRequest, res: Response) => {
    try {
        const result = await query(
            `SELECT al.id, al.user_id, al.action, al.ip_address, al.created_at,
              u.email as user_email, u.first_name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 200`
        );
        res.json({ logs: result.rows });
    } catch (err) {
        console.error('[Audit] List error:', err);
        res.status(500).json({ error: 'Erro ao carregar logs' });
    }
});

export default router;
