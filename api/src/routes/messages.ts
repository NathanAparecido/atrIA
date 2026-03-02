import { Router, Response } from 'express';
import { query } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendChatMessage } from '../lib/dify.js';

const router = Router();

// ---------- GET /messages/:sessionId ----------

router.get('/:sessionId', async (req: AuthRequest<{ sessionId: string }>, res: Response) => {
    try {
        // Verify session ownership
        const sessionCheck = await query(
            'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
            [req.params.sessionId, req.user!.userId]
        );

        if (sessionCheck.rows.length === 0) {
            res.status(404).json({ error: 'Sessão não encontrada' });
            return;
        }

        const result = await query(
            `SELECT id, user_id, session_id, message, response, dify_message_id, created_at
       FROM messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
            [req.params.sessionId]
        );

        res.json({ messages: result.rows });
    } catch (err) {
        console.error('[Messages] List error:', err);
        res.status(500).json({ error: 'Erro ao carregar mensagens' });
    }
});

router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { session_id, message } = req.body;

        if (!session_id || !message?.trim()) {
            res.status(400).json({ error: 'session_id e message são obrigatórios' });
            return;
        }

        // Verify session ownership and get Dify Conversation ID
        const sessionCheck = await query(
            'SELECT id, dify_conversation_id FROM chat_sessions WHERE id = $1 AND user_id = $2',
            [session_id, req.user!.userId]
        );

        if (sessionCheck.rows.length === 0) {
            res.status(404).json({ error: 'Sessão não encontrada' });
            return;
        }

        const difyConversationId = sessionCheck.rows[0].dify_conversation_id;

        // 1. Insert user message
        const result = await query(
            `INSERT INTO messages (user_id, session_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, session_id, message, created_at`,
            [req.user!.userId, session_id, message.trim()]
        );

        const savedMessage = result.rows[0];

        // 2. Call Dify API
        let difyResponse;
        try {
            difyResponse = await sendChatMessage({
                query: message.trim(),
                user: req.user!.userId,
                conversation_id: difyConversationId || undefined,
            });

            // 3. Update message with Dify response
            await query(
                `UPDATE messages 
         SET response = $1, dify_message_id = $2
         WHERE id = $3`,
                [difyResponse.answer, difyResponse.message_id, savedMessage.id]
            );

            // 4. If it's a new conversation, update the session with the Dify Conversation ID
            if (!difyConversationId) {
                await query(
                    'UPDATE chat_sessions SET dify_conversation_id = $1 WHERE id = $2',
                    [difyResponse.conversation_id, session_id]
                );
            }

            // Update session timestamp
            await query(
                'UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1',
                [session_id]
            );

            res.status(201).json({
                message: {
                    ...savedMessage,
                    response: difyResponse.answer,
                    dify_message_id: difyResponse.message_id,
                }
            });

        } catch (difyErr) {
            console.error('[Messages] Dify error:', difyErr);
            // Even if Dify fails, we already saved the user message.
            // We return the user message with an error indication in response.
            const errMsg = 'Erro na comunicação com a IA';
            await query(
                'UPDATE messages SET response = $1 WHERE id = $2',
                [errMsg, savedMessage.id]
            );
            res.status(201).json({
                message: { ...savedMessage, response: errMsg },
                warning: 'IA indisponível no momento'
            });
        }

    } catch (err) {
        console.error('[Messages] Create error:', err);
        res.status(500).json({ error: 'Erro ao processar mensagem' });
    }
});

// ---------- PATCH /messages/:id ----------

router.patch('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { response, dify_message_id } = req.body;

        const sets: string[] = [];
        const vals: unknown[] = [];
        let idx = 1;

        if (response !== undefined) {
            sets.push(`response = $${idx++}`);
            vals.push(response);
        }
        if (dify_message_id !== undefined) {
            sets.push(`dify_message_id = $${idx++}`);
            vals.push(dify_message_id);
        }

        if (sets.length === 0) {
            res.status(400).json({ error: 'Nenhum campo para atualizar' });
            return;
        }

        vals.push(req.params.id, req.user!.userId);

        const result = await query(
            `UPDATE messages SET ${sets.join(', ')}
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING id, user_id, session_id, message, response, dify_message_id, created_at`,
            vals
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Mensagem não encontrada' });
            return;
        }

        res.json({ message: result.rows[0] });
    } catch (err) {
        console.error('[Messages] Update error:', err);
        res.status(500).json({ error: 'Erro ao atualizar mensagem' });
    }
});

export default router;
