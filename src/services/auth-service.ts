import type { Session, User } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"

export type AuthResult = {
  session: Session | null
  user: User | null
}

export type LoginInput = {
  email: string
  password: string
}

export type SignUpInput = LoginInput & {
  fullName: string
  businessType: string
}

type ProfileInput = {
  fullName?: string
  email?: string
  businessType?: string
}

function toError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error("Something went wrong")
}

async function upsertProfile(user: User, input: ProfileInput = {}) {
  const fullName =
    input.fullName ??
    (typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : undefined)
  const businessType =
    input.businessType ??
    (typeof user.user_metadata.business_type === "string"
      ? user.user_metadata.business_type
      : undefined)

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      email: input.email ?? user.email,
      business_type: businessType,
    },
    { onConflict: "id" }
  )

  if (error) {
    throw toError(error)
  }

  const { error: taxSettingsError } = await supabase
    .from("user_tax_settings")
    .upsert(
      {
        user_id: user.id,
        country: "CA",
        region: "ON",
        tax_name: "HST",
        tax_rate: 0.13,
        tax_year: 2026,
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    )

  if (taxSettingsError) {
    throw toError(taxSettingsError)
  }
}

export const authService = {
  async continueWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      throw toError(error)
    }
  },

  async exchangeOAuthCode(code: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      throw toError(error)
    }

    if (data.user) {
      await upsertProfile(data.user)
    }

    return {
      session: data.session,
      user: data.user,
    }
  },

  async setOAuthSession(input: {
    accessToken: string
    refreshToken: string
  }): Promise<AuthResult> {
    const { data, error } = await supabase.auth.setSession({
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
    })

    if (error) {
      throw toError(error)
    }

    if (data.user) {
      await upsertProfile(data.user)
    }

    return {
      session: data.session,
      user: data.user,
    }
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    })

    if (error) {
      throw toError(error)
    }

    if (data.user) {
      await upsertProfile(data.user)
    }

    return {
      session: data.session,
      user: data.user,
    }
  },

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          business_type: input.businessType,
        },
      },
    })

    if (error) {
      throw toError(error)
    }

    if (data.session && data.user) {
      await upsertProfile(data.user, input)
    }

    return {
      session: data.session,
      user: data.user,
    }
  },

  async logout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw toError(error)
    }
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      throw toError(error)
    }

    return data.session
  },

  async ensureProfile(user: User) {
    await upsertProfile(user)
  },

  onSessionChange(callback: (session: Session | null) => void) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session)
    })

    return () => subscription.unsubscribe()
  },
}
