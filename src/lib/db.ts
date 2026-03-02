import { supabase } from './supabase';
import { Message, User, AuditLog, ChatSession } from '../types';

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as User[];
}

export async function getUserSessions(userId: string): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as ChatSession[];
}

export async function createSession(userId: string, title?: string): Promise<ChatSession> {
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
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function getSessionMessages(sessionId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Message[];
}

export async function getUserMessages(userId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Message[];
}

export async function saveMessage(userId: string, sessionId: string, message: string, response: string): Promise<Message> {
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
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as AuditLog[];
}

export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) throw error;
}
