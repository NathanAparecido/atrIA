import { supabase } from './supabase'
import { User, SignUpData } from '../types'

/**
 * Utils
 */
export function removeNull<T>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj as any).filter(([_, v]) => v !== null)
  ) as Partial<T>
}

export function cleanAuthUser(authUser: any) {
  return removeNull({
    id: authUser.id,
    email: authUser.email,
    created_at: authUser.created_at,
    updated_at: authUser.updated_at,
    last_sign_in_at: authUser.last_sign_in_at,
    email_confirmed_at: authUser.email_confirmed_at,
    app_metadata: authUser.app_metadata || {},
    user_metadata: authUser.user_metadata || {},
  })
}

/**
 * Session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data?.session ?? null
}

/**
 * Signup
 * Fonte única de criação de usuário
 * Metadata enviada corretamente para o Supabase Auth
 */
export async function signUp(signUpData: SignUpData) {
  const { email, password, firstName, phone, department } = signUpData

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
      data: {
        first_name: firstName,
        phone: phone || null,
        department,
        role: 'user',
      },
    },
  })

  if (error) throw error

  return data
}

/**
 * Sign in
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  if (data.user && !data.user.email_confirmed_at) {
    await supabase.auth.signOut()
    throw new Error(
      'Por favor, confirme seu email antes de fazer login.'
    )
  }

  return data
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Current user
 * Usa Auth como fonte primária
 * Não depende da tabela users
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error

  if (!data.user) return null

  return {
    id: data.user.id,
    email: data.user.email!,
    ...data.user.user_metadata,
  } as User
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })

  if (error) throw error
}

/**
 * Audit log
 * Continua válido como evento de domínio local
 */
export async function logAudit(userId: string, action: string) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action,
    })

  if (error) {
    console.error('Failed to log audit:', error)
  }
}
