import nodemailer from 'nodemailer';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export async function sendEmail(options: EmailOptions): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn('[Email] SMTP not configured, skipping email to:', options.to);
        return;
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM || 'atrIA <noreply@atria.local>',
        to: options.to,
        subject: options.subject,
        html: options.html,
    });

    console.log('[Email] Sent to:', options.to);
}
