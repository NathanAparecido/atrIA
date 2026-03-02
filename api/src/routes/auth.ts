import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db.js';
import { AuthRequest, generateToken } from '../middleware/auth.js';
import { z } from 'zod';
import { sendEmail } from '../email.js';

const router = Router();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// ---------- Validation Schemas ----------

const signUpSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string()
        .min(8, 'Mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Necessário pelo menos uma maiúscula')
        .regex(/[a-z]/, 'Necessário pelo menos uma minúscula')
        .regex(/[0-9]/, 'Necessário pelo menos um número')
        .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Necessário pelo menos um caractere especial'),
    firstName: z.string().min(1, 'Nome obrigatório').max(100),
    phone: z.string().min(10, 'Telefone inválido').max(20),
    department: z.enum([
        'n2', 'noc', 'financeiro', 'tecnico_campo',
        'infra', 'n3', 'comercial', 'gerencia', 'diretoria',
    ]),
});

const signInSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha obrigatória'),
});

const resetRequestSchema = z.object({
    email: z.string().email('Email inválido'),
});

const resetPasswordSchema = z.object({
    token: z.string().min(1),
    password: z.string()
        .min(8, 'Mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Necessário pelo menos uma maiúscula')
        .regex(/[a-z]/, 'Necessário pelo menos uma minúscula')
        .regex(/[0-9]/, 'Necessário pelo menos um número')
        .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Necessário pelo menos um caractere especial'),
});

// ---------- POST /auth/signup ----------

router.post('/signup', async (req: AuthRequest, res: Response) => {
    try {
        const data = signUpSchema.parse(req.body);

        // Check if user exists
        const existing = await query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
        if (existing.rows.length > 0) {
            res.status(409).json({ error: 'Este email já está cadastrado' });
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

        // Generate confirmation token
        const confirmationToken = crypto.randomBytes(32).toString('hex');

        // Insert user
        const result = await query(
            `INSERT INTO users (email, password_hash, first_name, phone, department, confirmation_token)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, role, first_name, phone, department, created_at`,
            [data.email.toLowerCase(), passwordHash, data.firstName, data.phone, data.department, confirmationToken]
        );

        const user = result.rows[0];

        // Send confirmation email
        try {
            await sendEmail({
                to: user.email,
                subject: 'atrIA — Confirme seu email',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4F46E5;">Bem-vindo ao atrIA, ${data.firstName}!</h1>
            <p>Clique no botão abaixo para confirmar seu email e ativar sua conta:</p>
            <a href="${process.env.APP_URL || 'http://localhost'}/api/auth/confirm?token=${confirmationToken}"
               style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Confirmar Email
            </a>
            <p style="color: #666; font-size: 14px;">Se você não criou esta conta, ignore este email.</p>
          </div>
        `,
            });
        } catch (emailErr) {
            console.error('[Auth] Failed to send confirmation email:', emailErr);
        }

        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [user.id, 'signup', req.ip, req.get('user-agent')]
        );

        res.status(201).json({
            message: 'Conta criada! Confirme seu email para ativar.',
            user: { id: user.id, email: user.email },
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors[0].message });
            return;
        }
        console.error('[Auth] Signup error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ---------- GET /auth/confirm ----------

router.get('/confirm', async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            res.status(400).json({ error: 'Token inválido' });
            return;
        }

        const result = await query(
            `UPDATE users SET email_confirmed = TRUE, confirmation_token = NULL
       WHERE confirmation_token = $1 AND email_confirmed = FALSE
       RETURNING id, email`,
            [token]
        );

        if (result.rows.length === 0) {
            res.status(400).json({ error: 'Token inválido ou email já confirmado' });
            return;
        }

        // Redirect to login page
        res.redirect('/?confirmed=true');
    } catch (err) {
        console.error('[Auth] Confirm error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ---------- POST /auth/signin ----------

router.post('/signin', async (req: AuthRequest, res: Response) => {
    try {
        const data = signInSchema.parse(req.body);

        const result = await query(
            'SELECT id, email, password_hash, role, first_name, phone, department, email_confirmed, created_at FROM users WHERE email = $1',
            [data.email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Email ou senha incorretos' });
            return;
        }

        const user = result.rows[0];

        // Check email confirmation
        if (!user.email_confirmed) {
            res.status(403).json({ error: 'Por favor, confirme seu email antes de fazer login.' });
            return;
        }

        // Verify password
        const isValid = await bcrypt.compare(data.password, user.password_hash);
        if (!isValid) {
            // Audit failed login
            await query(
                'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
                [user.id, 'login_failed', req.ip, req.get('user-agent')]
            );
            res.status(401).json({ error: 'Email ou senha incorretos' });
            return;
        }

        // Generate JWT
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            department: user.department,
        });

        // Audit
        await query(
            'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [user.id, 'login_success', req.ip, req.get('user-agent')]
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                phone: user.phone,
                department: user.department,
                created_at: user.created_at,
            },
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors[0].message });
            return;
        }
        console.error('[Auth] Signin error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ---------- GET /auth/me ----------

router.get('/me', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }

        const result = await query(
            'SELECT id, email, role, first_name, phone, department, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('[Auth] Me error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ---------- POST /auth/reset-password-request ----------

router.post('/reset-password-request', async (req: AuthRequest, res: Response) => {
    try {
        const data = resetRequestSchema.parse(req.body);

        const result = await query('SELECT id, email, first_name FROM users WHERE email = $1', [data.email.toLowerCase()]);

        // Always return success to prevent email enumeration
        if (result.rows.length === 0) {
            res.json({ message: 'Se o email existir, enviaremos um link de recuperação.' });
            return;
        }

        const user = result.rows[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [resetToken, expires, user.id]
        );

        try {
            await sendEmail({
                to: user.email,
                subject: 'atrIA — Redefinir Senha',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4F46E5;">Olá, ${user.first_name}!</h1>
            <p>Você solicitou a redefinição de senha. Clique no botão abaixo:</p>
            <a href="${process.env.APP_URL || 'http://localhost'}/login?reset_token=${resetToken}"
               style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Redefinir Senha
            </a>
            <p style="color: #666; font-size: 14px;">Este link expira em 1 hora.</p>
          </div>
        `,
            });
        } catch (emailErr) {
            console.error('[Auth] Failed to send reset email:', emailErr);
        }

        res.json({ message: 'Se o email existir, enviaremos um link de recuperação.' });
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors[0].message });
            return;
        }
        console.error('[Auth] Reset request error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ---------- POST /auth/reset-password ----------

router.post('/reset-password', async (req: AuthRequest, res: Response) => {
    try {
        const data = resetPasswordSchema.parse(req.body);

        const result = await query(
            'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [data.token]
        );

        if (result.rows.length === 0) {
            res.status(400).json({ error: 'Token inválido ou expirado' });
            return;
        }

        const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

        await query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
            [passwordHash, result.rows[0].id]
        );

        await query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [result.rows[0].id, 'password_reset']
        );

        res.json({ message: 'Senha redefinida com sucesso!' });
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors[0].message });
            return;
        }
        console.error('[Auth] Reset password error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
