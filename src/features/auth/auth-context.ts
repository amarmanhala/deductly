import { createContext, useContext } from "react"
import type { Session, User } from "@supabase/supabase-js"

import type { LoginInput, SignUpInput } from "@/services/auth-service"

export type AuthSignUpResult = {
  needsEmailConfirmation: boolean
}

export type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean
  continueWithGoogle: () => Promise<void>
  login: (input: LoginInput) => Promise<void>
  signUp: (input: SignUpInput) => Promise<AuthSignUpResult>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
