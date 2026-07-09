import { supabase } from "@/lib/supabase"

type CreateTransactionInput = {
  userId: string
  type: "expense" | "income"
  amount: number
  merchant: string
  currency?: string
  categoryId?: string | null
  receiptId?: string | null
  platformId?: string | null
  sourceType?: string | null
  amountBeforeTax?: number | null
  taxAmount?: number | null
  amountAfterTax?: number | null
  platformFee?: number | null
  netAmount?: number | null
  expenseTaxRecoverable?: boolean
  deductibleAmount?: number | null
  taxCreditAmount?: number | null
  transactionDate: string
}

type CreateExpenseInput = Omit<CreateTransactionInput, "type">

type UpdateTransactionInput = {
  userId: string
  transactionId: string
  type: "expense" | "income"
  amount: number
  merchant: string
  currency?: string
  categoryId?: string | null
  receiptId?: string | null
  platformId?: string | null
  sourceType?: string | null
  amountBeforeTax?: number | null
  taxAmount?: number | null
  amountAfterTax?: number | null
  platformFee?: number | null
  netAmount?: number | null
  expenseTaxRecoverable?: boolean
  deductibleAmount?: number | null
  taxCreditAmount?: number | null
  transactionDate: string
}

export type Transaction = {
  id: string
  type: "expense" | "income"
  amount: number
  currency: string
  category_id: string | null
  receipt_id: string | null
  platform_id: string | null
  source_type: string | null
  amount_before_tax: number | null
  tax_amount: number | null
  amount_after_tax: number | null
  platform_fee: number
  net_amount: number | null
  expense_tax_recoverable: boolean
  deductible_amount: number | null
  tax_credit_amount: number | null
  transaction_date: string
  merchant: string | null
  description: string | null
  payment_method: string | null
  business_percentage: number
  tax_deductible: boolean
  created_at: string
}

function toError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error("Something went wrong")
}

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const transactionSelect =
  "id,type,amount,currency,category_id,receipt_id,platform_id,source_type,amount_before_tax,tax_amount,amount_after_tax,platform_fee,net_amount,expense_tax_recoverable,deductible_amount,tax_credit_amount,transaction_date,merchant,description,payment_method,business_percentage,tax_deductible,created_at"

export const transactionService = {
  async listTransactions(userId: string) {
    const { data, error } = await supabase
      .from("transactions")
      .select(transactionSelect)
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      throw toError(error)
    }

    return (data ?? []) as Transaction[]
  },

  async createTransaction({
    userId,
    type,
    amount,
    merchant,
    currency = "CAD",
    categoryId = null,
    receiptId = null,
    platformId = null,
    sourceType = null,
    amountBeforeTax = null,
    taxAmount = null,
    amountAfterTax = null,
    platformFee = null,
    netAmount = null,
    expenseTaxRecoverable = true,
    deductibleAmount = null,
    taxCreditAmount = null,
    transactionDate,
  }: CreateTransactionInput) {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type,
        amount,
        currency,
        category_id: type === "expense" ? categoryId : null,
        receipt_id: receiptId,
        platform_id: platformId,
        source_type: sourceType ?? (type === "income" ? "fare" : null),
        amount_before_tax:
          amountBeforeTax ?? (type === "income" ? amount : null),
        tax_amount: taxAmount,
        amount_after_tax:
          amountAfterTax ?? (type === "expense" ? amount : null),
        platform_fee: platformFee ?? 0,
        net_amount: netAmount,
        expense_tax_recoverable: expenseTaxRecoverable,
        deductible_amount:
          deductibleAmount ?? (type === "expense" ? amount : null),
        tax_credit_amount: taxCreditAmount,
        transaction_date: transactionDate || getTodayDate(),
        merchant,
        business_percentage: 100,
        tax_deductible: type === "expense",
        is_deleted: false,
      })
      .select(transactionSelect)
      .single()

    if (error) {
      throw toError(error)
    }

    return data
  },

  async createExpense(input: CreateExpenseInput) {
    return this.createTransaction({ ...input, type: "expense" })
  },

  async createIncome(input: CreateExpenseInput) {
    return this.createTransaction({ ...input, type: "income" })
  },

  async updateTransaction({
    userId,
    transactionId,
    type,
    amount,
    merchant,
    currency = "CAD",
    categoryId = null,
    receiptId = null,
    platformId = null,
    sourceType = null,
    amountBeforeTax = null,
    taxAmount = null,
    amountAfterTax = null,
    platformFee = null,
    netAmount = null,
    expenseTaxRecoverable = true,
    deductibleAmount = null,
    taxCreditAmount = null,
    transactionDate,
  }: UpdateTransactionInput) {
    const { data, error } = await supabase
      .from("transactions")
      .update({
        type,
        amount,
        currency,
        category_id: type === "expense" ? categoryId : null,
        receipt_id: receiptId,
        platform_id: platformId,
        source_type: sourceType ?? (type === "income" ? "fare" : null),
        amount_before_tax:
          amountBeforeTax ?? (type === "income" ? amount : null),
        tax_amount: taxAmount,
        amount_after_tax:
          amountAfterTax ?? (type === "expense" ? amount : null),
        platform_fee: platformFee ?? 0,
        net_amount: netAmount,
        expense_tax_recoverable: expenseTaxRecoverable,
        deductible_amount:
          deductibleAmount ?? (type === "expense" ? amount : null),
        tax_credit_amount: taxCreditAmount,
        transaction_date: transactionDate,
        merchant,
        business_percentage: 100,
        tax_deductible: type === "expense",
      })
      .eq("id", transactionId)
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .select(transactionSelect)
      .single()

    if (error) {
      throw toError(error)
    }

    return data
  },

  async deleteTransaction({
    userId,
    transactionId,
  }: {
    userId: string
    transactionId: string
  }) {
    const { data, error } = await supabase
      .from("transactions")
      .update({ is_deleted: true })
      .eq("id", transactionId)
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .select(transactionSelect)
      .single()

    if (error) {
      throw toError(error)
    }

    return data
  },
}
