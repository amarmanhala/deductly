import { supabase } from "@/lib/supabase"

export type ExpenseCategory = {
  id: string
  name: string
  slug: string
  icon: string | null
  color: string | null
  is_default: boolean
}

function toError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error("Something went wrong")
}

export const categoryService = {
  async listExpenseCategories() {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("id,name,slug,icon,color,is_default")
      .order("name", { ascending: true })

    if (error) {
      throw toError(error)
    }

    return (data ?? []) as ExpenseCategory[]
  },
}
