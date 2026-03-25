'use client'
import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthStore {
  user:    User | null
  loading: boolean
  init:    () => Promise<void>
  signIn:  (email: string, password: string) => Promise<void>
  signUp:  (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:    null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, loading: false })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
    })
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(translateAuthError(error.message))
    if (data.user) set({ user: data.user })
  },

  signUp: async (email, password, firstName, lastName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    })
    if (error) throw new Error(translateAuthError(error.message))
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))

function translateAuthError(msg: string): string {
  if (msg.includes('Invalid login'))      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
  if (msg.includes('already registered')) return 'هذا البريد الإلكتروني مسجّل مسبقاً'
  if (msg.includes('Password should'))    return 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل'
  if (msg.includes('rate limit'))         return 'محاولات كثيرة، انتظر قليلاً ثم حاول مجدداً'
  return 'حدث خطأ، يرجى المحاولة مرة أخرى'
}
