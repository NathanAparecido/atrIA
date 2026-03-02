/**
 * Atria API Client (Self-Hosted)
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('atria_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const response = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

export const api = {
    // Auth
    signIn: (data: any) => request('/auth/signin', { method: 'POST', body: JSON.stringify(data) }),
    signUp: (data: any) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    getMe: () => request('/auth/me'),

    // Sessions
    getSessions: () => request('/sessions'),
    createSession: (title?: string) => request('/sessions', { method: 'POST', body: JSON.stringify({ title }) }),
    updateSession: (id: string, data: any) => request(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteSession: (id: string) => request(`/sessions/${id}`, { method: 'DELETE' }),

    // Messages
    getMessages: (sessionId: string) => request(`/messages/${sessionId}`),
    sendMessage: (sessionId: string, message: string) => request('/messages', { method: 'POST', body: JSON.stringify({ session_id: sessionId, message }) }),
};
