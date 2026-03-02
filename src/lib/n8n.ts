const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

interface WebhookPayload {
  event: string;
  user_id: string;
  session_id: string;
  message_id?: string;
  message?: string;
  response?: string;
  timestamp: string;
}

export async function sendWebhook(payload: WebhookPayload): Promise<void> {
  if (!N8N_WEBHOOK_URL) {
    console.warn('N8N webhook URL not configured');
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Webhook sent (timeout reached, continuing async)');
    } else {
      console.error('N8N webhook error:', error);
    }
  }
}
