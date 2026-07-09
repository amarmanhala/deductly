import { supabase } from "@/lib/supabase"

import type { CanadaTaxReference } from "./tax-reference-service"
import { taxReferenceService } from "./tax-reference-service"

export type Profile = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  country: string | null
  currency: string | null
  business_type: string | null
  timezone: string | null
  created_at: string
  updated_at: string
}

export type UserSettings = {
  user_id: string
  default_currency: string | null
  default_business_percentage: number
  theme: string | null
  language: string | null
  created_at: string
  updated_at: string
}

export type UserTaxSettings = {
  user_id: string
  country: string
  region: string
  tax_name: string
  tax_rate: number
  tax_year: number
  federal_income_tax_jurisdiction_id: string | null
  provincial_income_tax_jurisdiction_id: string | null
  gst_hst_jurisdiction_id: string | null
  created_at: string
  updated_at: string
}

export type ProfileDetails = {
  profile: Profile | null
  settings: UserSettings | null
  taxSettings: UserTaxSettings | null
  taxReference: CanadaTaxReference | null
}

export type UpdateProfileInput = {
  userId: string
  fullName: string
  email: string | null
  country: string | null
  currency: string | null
  businessType: string | null
  theme: string | null
  defaultBusinessPercentage?: number
  language?: string | null
}

function toError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error("Something went wrong")
}

export const profileService = {
  async getProfileDetails(userId: string): Promise<ProfileDetails> {
    const [profileResult, settingsResult, taxSettingsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,full_name,email,avatar_url,country,currency,business_type,timezone,created_at,updated_at"
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_settings")
        .select(
          "user_id,default_currency,default_business_percentage,theme,language,created_at,updated_at"
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_tax_settings")
        .select(
          "user_id,country,region,tax_name,tax_rate,tax_year,federal_income_tax_jurisdiction_id,provincial_income_tax_jurisdiction_id,gst_hst_jurisdiction_id,created_at,updated_at"
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ])

    if (profileResult.error) {
      throw toError(profileResult.error)
    }

    if (settingsResult.error) {
      throw toError(settingsResult.error)
    }

    if (taxSettingsResult.error) {
      throw toError(taxSettingsResult.error)
    }

    const taxSettings = taxSettingsResult.data as UserTaxSettings | null
    const taxReference = taxSettings
      ? await taxReferenceService
          .getCanadaTaxReference({
            country: taxSettings.country,
            region: taxSettings.region,
            taxYear: taxSettings.tax_year,
          })
          .catch(() => null)
      : null

    return {
      profile: profileResult.data,
      settings: settingsResult.data,
      taxSettings,
      taxReference,
    }
  },

  async updateProfile(input: UpdateProfileInput): Promise<ProfileDetails> {
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: input.fullName,
        business_type: input.businessType,
      },
    })

    if (authError) {
      throw toError(authError)
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: input.userId,
        full_name: input.fullName,
        email: input.email,
        country: input.country,
        currency: input.currency,
        business_type: input.businessType,
      },
      { onConflict: "id" }
    )

    if (profileError) {
      throw toError(profileError)
    }

    const { error: settingsError } = await supabase.from("user_settings").upsert(
      {
        user_id: input.userId,
        default_currency: input.currency,
        default_business_percentage: input.defaultBusinessPercentage ?? 100,
        theme: input.theme,
        language: input.language ?? null,
      },
      { onConflict: "user_id" }
    )

    if (settingsError) {
      throw toError(settingsError)
    }

    return this.getProfileDetails(input.userId)
  },
}
