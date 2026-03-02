import { Router, Response } from 'express';
import { query } from '../db.js';
import { AuthRequest, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// All routes require admin
router.use(adminMiddleware);

// ---------- GET /users ----------

router.get('/', async (_req: AuthRequest, res: Response) => {
    try {
        const result = await query(
            `SELECT id, email, role, first_name, phone, department, email_confirmed, created_at
       FROM users
       ORDER BY created_at DESC`
        );
        res.json({ users: result.rows });
    } catch (err) {
        console.error('[Users] List error:', err);
        res.status(500).json({ error: 'Erro ao carregar usuários' });
    }
});

// ---------- PATCH /users/:id/role ----------

router.patch('/:id/role', async (req: AuthRequest, res: Response) => {
    try {
        const { role } = req.body;

        if (!role || !['admin', 'user'].includes(role)) {
            res.status(400).json({ error: 'Role deve ser "admin" ou "user"' });
            return;
        }

        // Cannot change own role
        if (req.params.id === req.user!.userId) {
            res.status(400).json({ error: 'Você não pode alterar seu próprio role' });
            return;
        }

        const result = await query(
            `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, email, role, first_name, department`,
            [role, req.params.id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        // Audit
        await query(
            'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
            [req.user!.userId, `Changed role of ${result.rows[0].email} to ${role}`, req.ip]
        );

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('[Users] Role change error:', err);
        res.status(500).json({ error: 'Erro ao alterar role' });
    }
});

// ---------- DELETE /users/:id ----------

router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        if (req.params.id === req.user!.userId) {
            res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
            return;
        }

        const result = await query(
            'DELETE FROM users WHERE id = $1 RETURNING id, email',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        await query(
            'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
            [req.user!.userId, `Deleted user ${result.rows[0].email}`, req.ip]
        );

        res.json({ message: 'Usuário deletado' });
    } catch (err) {
        console.error('[Users] Delete error:', err);
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
});

export default router;
