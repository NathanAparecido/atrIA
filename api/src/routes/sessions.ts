import { Router, Response } from 'express';
import { query } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// ---------- GET /sessions ----------

router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const result = await query(
            `SELECT id, user_id, title, dify_conversation_id, created_at, updated_at
       FROM chat_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
            [req.user!.userId]
        );
        res.json({ sessions: result.rows });
    } catch (err) {
        console.error('[Sessions] List error:', err);
        res.status(500).json({ error: 'Erro ao carregar sessões' });
    }
});

// ---------- POST /sessions ----------

router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { title } = req.body;
        const result = await query(
            `INSERT INTO chat_sessions (user_id, title)
       VALUES ($1, $2)
       RETURNING id, user_id, title, dify_conversation_id, created_at, updated_at`,
            [req.user!.userId, title || 'Nova conversa']
        );
        res.status(201).json({ session: result.rows[0] });
    } catch (err) {
        console.error('[Sessions] Create error:', err);
        res.status(500).json({ error: 'Erro ao criar sessão' });
    }
});

// ---------- PATCH /sessions/:id ----------

router.patch('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { title, dify_conversation_id } = req.body;
        const sets: string[] = [];
        const vals: unknown[] = [];
        let idx = 1;

        if (title !== undefined) {
            sets.push(`title = $${idx++}`);
            vals.push(title);
        }
        if (dify_conversation_id !== undefined) {
            sets.push(`dify_conversation_id = $${idx++}`);
            vals.push(dify_conversation_id);
        }

        if (sets.length === 0) {
            res.status(400).json({ error: 'Nenhum campo para atualizar' });
            return;
        }

        vals.push(req.params.id, req.user!.userId);

        const result = await query(
            `UPDATE chat_sessions SET ${sets.join(', ')}
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING id, user_id, title, dify_conversation_id, created_at, updated_at`,
            vals
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Sessão não encontrada' });
            return;
        }

        res.json({ session: result.rows[0] });
    } catch (err) {
        console.error('[Sessions] Update error:', err);
        res.status(500).json({ error: 'Erro ao atualizar sessão' });
    }
});

// ---------- DELETE /sessions/:id ----------

router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const result = await query(
            'DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user!.userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Sessão não encontrada' });
            return;
        }

        res.json({ message: 'Sessão deletada' });
    } catch (err) {
        console.error('[Sessions] Delete error:', err);
        res.status(500).json({ error: 'Erro ao deletar sessão' });
    }
});

export default router;
