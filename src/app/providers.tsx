'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Session, User } from '@supabase/supabase-js'

type SupabaseContextType = {
  supabase: ReturnType<typeof createClientComponentClient> | null
  session: Session | null
  user: User | null
  credits: number | null
  refreshCredits: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function Providers({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [supabaseclient, setSupabaseClient] = useState<ReturnType<typeof createClientComponentClient> | null>(null)

  // Initialize Supabase client only in the browser
  useEffect(() => {
    const client = createClientComponentClient()
    setSupabaseClient(client)
  }, [])

  const refreshCredits = async () => {
    if (!user || !supabaseclient) return
    
    const { data, error } = await supabaseclient
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single()
    
    if (data && !error) {
      setCredits((data as any).credits)
    }
  }

  useEffect(() => {
    if (!supabaseclient) return

    supabaseclient.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabaseclient.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabaseclient])

  useEffect(() => {
    if (user) {
      refreshCredits()
    }
  }, [user, supabaseclient])

  return (
    <SupabaseContext.Provider value={{ supabase: supabaseclient, session, user, credits, refreshCredits }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a Providers component')
  }
  return context
}
