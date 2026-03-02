import { supabase } from './supabase';
import { api } from './api';
import { Message, User, AuditLog, ChatSession } from '../types';

const IS_SELF_HOSTED = import.meta.env.VITE_SELF_HOSTED === 'true';

export async function getAllUsers(): Promise<User[]> {
  if (IS_SELF_HOSTED) {
    // Note: This might need a specific route in custom API if used by admin
    return [];
  }
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as User[];
}

export async function getUserSessions(userId: string): Promise<ChatSession[]> {
  if (IS_SELF_HOSTED) {
    return api.getSessions();
  }
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as ChatSession[];
}

export async function createSession(userId: string, title?: string): Promise<ChatSession> {
  if (IS_SELF_HOSTED) {
    return api.createSession(title);
  }
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      title: title || 'Nova conversa',
    })
    .select()
    .single();

  if (error) throw error;
  return data as ChatSession;
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (IS_SELF_HOSTED) {
    return api.deleteSession(sessionId);
  }
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  if (IS_SELF_HOSTED) {
    return api.updateSession(sessionId, { title });
  }
  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function getSessionMessages(sessionId: string): Promise<Message[]> {
  if (IS_SELF_HOSTED) {
    return api.getMessages(sessionId);
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Message[];
}

export async function getUserMessages(userId: string): Promise<Message[]> {
  if (IS_SELF_HOSTED) {
    // This is less common in Chat UI, but could be implemented
    return [];
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Message[];
}

export async function saveMessage(userId: string, sessionId: string, message: string, response: string): Promise<Message> {
  if (IS_SELF_HOSTED) {
    // In Self-Hosted, sendMessage handles both recording and AI response
    return api.sendMessage(sessionId, message);
  }
  const { data, error } = await supabase
    .from('messages')
    .insert({
      user_id: userId,
      session_id: sessionId,
      message,
      response,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

export async function savePendingMessage(userId: string, sessionId: string, message: string): Promise<Message> {
  if (IS_SELF_HOSTED) {
    // We'll let the api.sendMessage handle the full cycle
    // or we can create a placeholder if UI needs it immediately
    return { id: 'pending', session_id: sessionId, user_id: userId, message, created_at: new Date().toISOString() } as any;
  }
  const { data, error } = await supabase
    .from('messages')
    .insert({
      user_id: userId,
      session_id: sessionId,
      message,
      response: null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  if (IS_SELF_HOSTED) {
    return []; // Implement audit route in API if needed
  }
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as AuditLog[];
}

export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  if (IS_SELF_HOSTED) {
    return; // Implement admin routes in API if needed
  }
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) throw error;
}
