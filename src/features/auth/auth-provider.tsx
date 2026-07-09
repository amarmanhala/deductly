import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Session } from "@supabase/supabase-js"

import {
  AuthContext,
  type AuthContextValue,
} from "@/features/auth/auth-context"
import {
  authService,
  type LoginInput,
  type SignUpInput,
} from "@/services/auth-service"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)

    if (nextSession?.user) {
      try {
        await authService.ensureProfile(nextSession.user)
      } catch (error) {
        console.error(error)
      }
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    authService
      .getSession()
      .then(async (currentSession) => {
        if (!isMounted) {
          return
        }

        await syncSession(currentSession)
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    const unsubscribe = authService.onSessionChange((nextSession) => {
      void syncSession(nextSession)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [syncSession])

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await authService.login(input)
      await syncSession(result.session)
    },
    [syncSession]
  )

  const continueWithGoogle = useCallback(async () => {
    await authService.continueWithGoogle()
  }, [])

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const result = await authService.signUp(input)
      await syncSession(result.session)

      return {
        needsEmailConfirmation: !result.session,
      }
    },
    [syncSession]
  )

  const logout = useCallback(async () => {
    await authService.logout()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      continueWithGoogle,
      login,
      signUp,
      logout,
    }),
    [continueWithGoogle, isLoading, login, logout, session, signUp]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
