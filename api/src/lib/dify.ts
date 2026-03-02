/**
 * Dify API Client Utility
 */

const DIFY_API_URL = process.env.DIFY_API_URL || 'http://localhost:5001/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY || '';

export interface DifyChatRequest {
    query: string;
    user: string;
    conversation_id?: string;
    inputs?: Record<string, any>;
    response_mode?: 'streaming' | 'blocking';
}

export interface DifyChatResponse {
    event: string;
    message_id: string;
    conversation_id: string;
    mode: string;
    answer: string;
    metadata: Record<string, any>;
    created_at: number;
}

export async function sendChatMessage(params: DifyChatRequest): Promise<DifyChatResponse> {
    if (!DIFY_API_KEY) {
        throw new Error('DIFY_API_KEY not configured');
    }

    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DIFY_API_KEY}`,
        },
        body: JSON.stringify({
            ...params,
            response_mode: 'blocking', // Default to blocking for now
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Dify API error (${response.status}): ${errorData.message || response.statusText}`);
    }

    return response.json() as Promise<DifyChatResponse>;
}
