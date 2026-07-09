import { supabase } from "@/lib/supabase"

export type TaxKind =
  | "income_federal"
  | "income_provincial"
  | "gst_hst"
  | "cpp_qpp"

export type TaxJurisdiction = {
  id: string
  country_code: string
  region_code: string
  region_name: string
  tax_year: number
  tax_kind: TaxKind
  effective_from: string
  effective_to: string | null
  source_url: string
  notes: string | null
}

export type TaxBracket = {
  id: string
  tax_jurisdiction_id: string
  bracket_type: TaxKind
  lower_bound: number
  upper_bound: number | null
  rate: number
  base_tax_amount: number
  sort_order: number
}

export type TaxThreshold = {
  id: string
  tax_jurisdiction_id: string
  threshold_type:
    | "small_supplier"
    | "mandatory_registration"
    | "basic_personal_amount"
  amount: number | null
  period_type: string
  applies_to: string
  notes: string | null
}

export type TaxCredit = {
  id: string
  tax_jurisdiction_id: string
  credit_type: string
  amount: number | null
  rate: number | null
  notes: string | null
}

export type CanadaTaxReference = {
  gstHstJurisdiction: TaxJurisdiction | null
  gstHstBrackets: TaxBracket[]
  gstHstThresholds: TaxThreshold[]
  federalIncomeJurisdiction: TaxJurisdiction | null
  federalIncomeBrackets: TaxBracket[]
  federalTaxCredits: TaxCredit[]
  provincialIncomeJurisdiction: TaxJurisdiction | null
  provincialIncomeBrackets: TaxBracket[]
}

export type TaxReferenceInput = {
  country: string
  region: string
  taxYear: number
}

function toError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error("Something went wrong")
}

function getSingleJurisdiction(
  jurisdictions: TaxJurisdiction[],
  taxKind: TaxKind
) {
  return (
    jurisdictions.find((jurisdiction) => jurisdiction.tax_kind === taxKind) ??
    null
  )
}

export function getGstHstRate(reference: CanadaTaxReference | null) {
  const bracket = reference?.gstHstBrackets.find(
    (bracket) => bracket.bracket_type === "gst_hst"
  )

  return bracket?.rate ?? null
}

export const taxReferenceService = {
  async getCanadaTaxReference({
    country,
    region,
    taxYear,
  }: TaxReferenceInput): Promise<CanadaTaxReference> {
    const { data: jurisdictionsData, error: jurisdictionsError } =
      await supabase
        .from("tax_jurisdictions")
        .select(
          "id,country_code,region_code,region_name,tax_year,tax_kind,effective_from,effective_to,source_url,notes"
        )
        .eq("country_code", country)
        .eq("tax_year", taxYear)
        .in("region_code", ["FED", region])
        .in("tax_kind", ["income_federal", "income_provincial", "gst_hst"])

    if (jurisdictionsError) {
      throw toError(jurisdictionsError)
    }

    const jurisdictions = (jurisdictionsData ?? []) as TaxJurisdiction[]
    const jurisdictionIds = jurisdictions.map((jurisdiction) => jurisdiction.id)

    if (jurisdictionIds.length === 0) {
      return {
        gstHstJurisdiction: null,
        gstHstBrackets: [],
        gstHstThresholds: [],
        federalIncomeJurisdiction: null,
        federalIncomeBrackets: [],
        federalTaxCredits: [],
        provincialIncomeJurisdiction: null,
        provincialIncomeBrackets: [],
      }
    }

    const [bracketsResult, thresholdsResult, creditsResult] = await Promise.all([
      supabase
        .from("tax_brackets")
        .select(
          "id,tax_jurisdiction_id,bracket_type,lower_bound,upper_bound,rate,base_tax_amount,sort_order"
        )
        .in("tax_jurisdiction_id", jurisdictionIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("tax_thresholds")
        .select(
          "id,tax_jurisdiction_id,threshold_type,amount,period_type,applies_to,notes"
        )
        .in("tax_jurisdiction_id", jurisdictionIds),
      supabase
        .from("tax_credits")
        .select("id,tax_jurisdiction_id,credit_type,amount,rate,notes")
        .in("tax_jurisdiction_id", jurisdictionIds),
    ])

    if (bracketsResult.error) {
      throw toError(bracketsResult.error)
    }

    if (thresholdsResult.error) {
      throw toError(thresholdsResult.error)
    }

    if (creditsResult.error) {
      throw toError(creditsResult.error)
    }

    const brackets = (bracketsResult.data ?? []) as TaxBracket[]
    const thresholds = (thresholdsResult.data ?? []) as TaxThreshold[]
    const credits = (creditsResult.data ?? []) as TaxCredit[]
    const gstHstJurisdiction = getSingleJurisdiction(jurisdictions, "gst_hst")
    const federalIncomeJurisdiction = getSingleJurisdiction(
      jurisdictions,
      "income_federal"
    )
    const provincialIncomeJurisdiction = getSingleJurisdiction(
      jurisdictions,
      "income_provincial"
    )

    return {
      gstHstJurisdiction,
      gstHstBrackets: gstHstJurisdiction
        ? brackets.filter(
            (bracket) => bracket.tax_jurisdiction_id === gstHstJurisdiction.id
          )
        : [],
      gstHstThresholds: gstHstJurisdiction
        ? thresholds.filter(
            (threshold) =>
              threshold.tax_jurisdiction_id === gstHstJurisdiction.id
          )
        : [],
      federalIncomeJurisdiction,
      federalIncomeBrackets: federalIncomeJurisdiction
        ? brackets.filter(
            (bracket) =>
              bracket.tax_jurisdiction_id === federalIncomeJurisdiction.id
          )
        : [],
      federalTaxCredits: federalIncomeJurisdiction
        ? credits.filter(
            (credit) =>
              credit.tax_jurisdiction_id === federalIncomeJurisdiction.id
          )
        : [],
      provincialIncomeJurisdiction,
      provincialIncomeBrackets: provincialIncomeJurisdiction
        ? brackets.filter(
            (bracket) =>
              bracket.tax_jurisdiction_id === provincialIncomeJurisdiction.id
          )
        : [],
    }
  },
}
