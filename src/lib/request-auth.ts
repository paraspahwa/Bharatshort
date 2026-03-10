import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { Database } from './supabase'

type AuthMode = 'cookie' | 'bearer'

export type AuthenticatedRequestContext = {
  supabase: any
  user: User
  authMode: AuthMode
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return null
  }

  const [scheme, token] = authHeader.split(' ')
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null
  }

  return token.trim() || null
}

export async function resolveRequestAuth(
  request: NextRequest
): Promise<AuthenticatedRequestContext | null> {
  try {
    const bearerToken = getBearerToken(request)

    if (bearerToken) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !anonKey) {
        return null
      }

      const supabase = createClient<Database>(url, anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(bearerToken)

      if (error || !user) {
        return null
      }

      return {
        supabase,
        user,
        authMode: 'bearer',
      }
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({
      cookies: async () => cookieStore,
    })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return null
    }

    return {
      supabase,
      user: session.user,
      authMode: 'cookie',
    }
  } catch {
    return null
  }
}