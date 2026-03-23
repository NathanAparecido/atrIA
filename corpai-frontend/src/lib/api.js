/**
 * CorpAI Frontend — API Client
 * Todas as chamadas ao backend passam por aqui.
 */

const API_BASE = '/api';

// ─── Helpers ──────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('corpai_access_token');
}

function getRefreshToken() {
  return localStorage.getItem('corpai_refresh_token');
}

function setTokens(accessToken, refreshToken) {
  localStorage.setItem('corpai_access_token', accessToken);
  localStorage.setItem('corpai_refresh_token', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('corpai_access_token');
  localStorage.removeItem('corpai_refresh_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Tentar refresh se 401
  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      return fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  return response;
}

async function refreshAccessToken() {
  try {
    const resp = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: getRefreshToken() }),
    });

    if (resp.ok) {
      const data = await resp.json();
      setTokens(data.access_token, data.refresh_token);
      return true;
    }
  } catch (e) {
    console.error('Erro ao renovar token:', e);
  }

  clearTokens();
  return false;
}

// ─── Auth ─────────────────────────────────────────────────
export async function login(username, password) {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'Erro ao fazer login');
  }

  const data = await resp.json();
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (e) {
    // Ignora erros no logout
  }
  clearTokens();
}

export async function getMe() {
  const resp = await request('/users/me');
  if (!resp.ok) throw new Error('Não autenticado');
  return resp.json();
}

// ─── Chat ─────────────────────────────────────────────────
export async function enviarMensagem(mensagem, conversationId, onChunk, onDone) {
  const token = getToken();
  const body = { mensagem };
  if (conversationId) body.conversation_id = conversationId;

  const response = await fetch(`${API_BASE}/chat/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Erro ao enviar mensagem');
  }

  // Ler SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let convId = conversationId;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'info') {
            convId = data.conversation_id;
          } else if (data.type === 'chunk') {
            onChunk(data.content);
          } else if (data.type === 'done') {
            onDone(data.conversation_id);
          } else if (data.type === 'error') {
            onChunk(data.content);
          }
        } catch (e) {
          // Ignora linhas inválidas
        }
      }
    }
  }

  return convId;
}

export async function listarConversas() {
  const resp = await request('/chat/conversations');
  if (!resp.ok) throw new Error('Erro ao listar conversas');
  return resp.json();
}

export async function obterConversa(conversationId) {
  const resp = await request(`/chat/conversations/${conversationId}`);
  if (!resp.ok) throw new Error('Erro ao obter conversa');
  return resp.json();
}

export async function deletarConversa(conversationId) {
  const resp = await request(`/chat/conversations/${conversationId}`, {
    method: 'DELETE',
  });
  if (!resp.ok) throw new Error('Erro ao deletar conversa');
  return resp.json();
}

// ─── Documentos ───────────────────────────────────────────
export async function uploadDocumento(file, onProgress) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || 'Erro no upload'));
        } catch {
          reject(new Error('Erro no upload do documento'));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Erro de conexão')));
    xhr.open('POST', `${API_BASE}/documents/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

export async function listarDocumentos() {
  const resp = await request('/documents/');
  if (!resp.ok) throw new Error('Erro ao listar documentos');
  return resp.json();
}

export async function deletarDocumento(documentId) {
  const resp = await request(`/documents/${documentId}`, {
    method: 'DELETE',
  });
  if (!resp.ok) throw new Error('Erro ao deletar documento');
  return resp.json();
}

// ─── Usuários (Admin) ─────────────────────────────────────
export async function listarUsuarios() {
  const resp = await request('/users/');
  if (!resp.ok) throw new Error('Erro ao listar usuários');
  return resp.json();
}

export async function criarUsuario(data) {
  const resp = await request('/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'Erro ao criar usuário');
  }
  return resp.json();
}

export async function editarUsuario(userId, data) {
  const resp = await request(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'Erro ao editar usuário');
  }
  return resp.json();
}

export async function deletarUsuario(userId) {
  const resp = await request(`/users/${userId}`, {
    method: 'DELETE',
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'Erro ao deletar usuário');
  }
  return resp.json();
}

export async function listarSetores() {
  const resp = await request('/users/setores');
  if (!resp.ok) throw new Error('Erro ao listar setores');
  return resp.json();
}

// ─── Health ───────────────────────────────────────────────
export async function healthCheck() {
  const resp = await request('/health');
  if (!resp.ok) throw new Error('Erro no health check');
  return resp.json();
}

export { getToken, clearTokens };
