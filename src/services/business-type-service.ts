import { supabase } from "@/lib/supabase"

export type BusinessTypeOption = {
  id: string
  name: string
  image_url: string | null
  description: string | null
  brand_color: string | null
}

export const fallbackBusinessTypes: BusinessTypeOption[] = [
  {
    id: "fallback:uber",
    name: "Uber",
    image_url: null,
    description: "Rideshare and delivery platform for drivers and couriers.",
    brand_color: "#000000",
  },
  {
    id: "fallback:lyft",
    name: "Lyft",
    image_url: null,
    description: "Rideshare platform for independent drivers.",
    brand_color: "#FF00BF",
  },
  {
    id: "fallback:doordash",
    name: "DoorDash",
    image_url: null,
    description: "Food and convenience delivery platform for couriers.",
    brand_color: "#EB1700",
  },
  {
    id: "fallback:uber-eats",
    name: "Uber Eats",
    image_url: null,
    description: "Food delivery platform for couriers.",
    brand_color: "#06C167",
  },
  {
    id: "fallback:instacart",
    name: "Instacart",
    image_url: null,
    description: "Grocery shopping and delivery platform.",
    brand_color: "#43B02A",
  },
  {
    id: "fallback:skip-the-dishes",
    name: "SkipTheDishes",
    image_url: null,
    description: "Food delivery platform commonly used in Canada.",
    brand_color: "#FF8000",
  },
  {
    id: "fallback:amazon-flex",
    name: "Amazon Flex",
    image_url: null,
    description: "Package delivery platform for independent drivers.",
    brand_color: "#FF9900",
  },
  {
    id: "fallback:turo",
    name: "Turo",
    image_url: null,
    description: "Car sharing platform for vehicle hosts.",
    brand_color: "#593CFB",
  },
  {
    id: "fallback:freelancer",
    name: "Freelancer",
    image_url: null,
    description: "Independent contract, project, or client-based work.",
    brand_color: "#29B2FE",
  },
  {
    id: "fallback:other",
    name: "Other",
    image_url: null,
    description: "Any other gig, contract, or self-employment business type.",
    brand_color: "#6B7280",
  },
]

function toError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error("Something went wrong")
}

function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function normalizeBusinessTypeValue(
  value: string | null | undefined,
  options: BusinessTypeOption[] = fallbackBusinessTypes
) {
  if (!value) {
    return options[0]?.name ?? "Other"
  }

  const normalizedValue = normalizeComparable(value)
  const match = options.find(
    (option) => normalizeComparable(option.name) === normalizedValue
  )

  return match?.name ?? value
}

export const businessTypeService = {
  async listBusinessTypes() {
    const { data, error } = await supabase
      .from("business-types")
      .select("id,name,image_url,description,brand_color")
      .order("name", { ascending: true })

    if (error) {
      throw toError(error)
    }

    return (data ?? []) as BusinessTypeOption[]
  },
}
