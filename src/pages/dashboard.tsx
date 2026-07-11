import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  ArrowUp,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CalendarIcon,
  BadgeDollarSign,
  Hammer,
  Fuel,
  Landmark,
  PiggyBank,
  Package,
  Receipt as ReceiptIcon,
  Road,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SquareParking,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth } from "@/features/auth/auth-context"
import { getCurrencySymbol } from "@/lib/currency"
import { cn } from "@/lib/utils"
import {
  businessTypeService,
  fallbackBusinessTypes,
  normalizeBusinessTypeValue,
  type BusinessTypeOption,
} from "@/services/business-type-service"
import {
  categoryService,
  type ExpenseCategory,
} from "@/services/category-service"
import { profileService } from "@/services/profile-service"
import { receiptService, type Receipt } from "@/services/receipt-service"
import { getGstHstRate } from "@/services/tax-reference-service"
import {
  transactionService,
  type Transaction,
} from "@/services/transaction-service"

type TransactionMode = "expense" | "income"

const maxTransactionAmount = 99_999_999.99
const fallbackTaxRate = 0.13

const fallbackExpenseCategories: ExpenseCategory[] = [
  {
    id: "fallback:fuel",
    name: "Fuel",
    slug: "fuel",
    icon: "fuel",
    color: null,
    is_default: true,
  },
  {
    id: "fallback:parking",
    name: "Parking",
    slug: "parking",
    icon: "square-parking",
    color: null,
    is_default: true,
  },
  {
    id: "fallback:insurance",
    name: "Insurance",
    slug: "insurance",
    icon: "shield",
    color: null,
    is_default: true,
  },
  {
    id: "fallback:maintenance",
    name: "Maintenance",
    slug: "maintenance",
    icon: "hammer",
    color: null,
    is_default: true,
  },
  {
    id: "fallback:phone",
    name: "Phone",
    slug: "phone",
    icon: "smartphone",
    color: null,
    is_default: true,
  },
  {
    id: "fallback:car-wash",
    name: "Car Wash",
    slug: "car-wash",
    icon: "sparkles",
    color: null,
    is_default: true,
  },
  {
    id: "fallback:supplies",
    name: "Supplies",
    slug: "supplies",
    icon: "package",
    color: null,
    is_default: true,
  },
  {
    id: "fallback:meals",
    name: "Meals",
    slug: "meals",
    icon: "utensils-crossed",
    color: null,
    is_default: true,
  },
  {
    id: "fallback:tolls",
    name: "Tolls",
    slug: "tolls",
    icon: "road",
    color: null,
    is_default: true,
  },
  {
    id: "fallback:other",
    name: "Other",
    slug: "other",
    icon: "receipt",
    color: null,
    is_default: true,
  },
]

const expenseCategoryIcons: Record<string, ComponentType<{ className?: string }>> =
  {
    fuel: Fuel,
    parking: SquareParking,
    "square-parking": SquareParking,
    insurance: Shield,
    shield: Shield,
    "shield-check": ShieldCheck,
    maintenance: Hammer,
    hammer: Hammer,
    wrench: Hammer,
    "settings-2": Hammer,
    phone: Smartphone,
    smartphone: Smartphone,
    "car-wash": Sparkles,
    sparkles: Sparkles,
    supplies: Package,
    package: Package,
    meals: UtensilsCrossed,
    "utensils-crossed": UtensilsCrossed,
    utensils: Utensils,
    tolls: Road,
    road: Road,
    other: ReceiptIcon,
    "badge-dollar-sign": BadgeDollarSign,
    receipt: ReceiptIcon,
    "circle-ellipsis": ReceiptIcon,
  }

function getExpenseCategoryIcon(
  icon: string | null | undefined,
  slug?: string | null
) {
  const normalizedIcon = icon?.toLowerCase()
  const normalizedSlug = slug?.toLowerCase()
  const resolvedKey = normalizedIcon || normalizedSlug

  if (!resolvedKey) {
    return ReceiptIcon
  }

  return expenseCategoryIcons[resolvedKey] ?? ReceiptIcon
}

function ExpenseCategoryIcon({
  icon,
  slug,
}: {
  icon: string | null
  slug: string
}) {
  const Icon = getExpenseCategoryIcon(icon, slug)

  return createElement(Icon, { className: "size-4" })
}

function getExpenseCategoryLookupKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function findExpenseCategoryForTransaction(
  transaction: Transaction,
  categories: ExpenseCategory[],
  categoryById: Map<string, ExpenseCategory>
) {
  if (transaction.category_id) {
    const category = categoryById.get(transaction.category_id)
    if (category) {
      return category
    }
  }

  const normalizedTransactionName = getExpenseCategoryLookupKey(
    getTransactionName(transaction)
  )

  return categories.find((category) => {
    return (
      getExpenseCategoryLookupKey(category.slug) === normalizedTransactionName ||
      getExpenseCategoryLookupKey(category.name) === normalizedTransactionName
    )
  })
}

function dateToInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getTodayDate() {
  return dateToInputValue(new Date())
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return undefined
  }

  return new Date(year, month - 1, day)
}

function formatMoney(amount: number, currency = "CAD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function getTransactionAmount(transaction: Transaction) {
  const amount = Number(transaction.amount)

  return Number.isFinite(amount) ? amount : 0
}

function getOptionalAmount(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  const amount = Number(value)

  return Number.isFinite(amount) ? amount : null
}

function getIncomeReceived(transaction: Transaction) {
  const netAmount = getOptionalAmount(transaction.net_amount)

  return netAmount !== null ? netAmount : getTransactionAmount(transaction)
}

function getIncomeSource(transaction: Transaction) {
  return transaction.merchant?.trim() || "Other"
}

function normalizeSource(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getSourceBrandColor(
  source: string,
  businessTypes: BusinessTypeOption[]
) {
  const normalizedSource = normalizeSource(source)
  const match = businessTypes.find(
    (option) => normalizeSource(option.name) === normalizedSource
  )

  return match?.brand_color || "#6B7280"
}

function formatTransactionCurrency(transaction: Transaction) {
  return formatMoney(Number(transaction.amount), transaction.currency)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function formatDatePickerLabel(value: string) {
  if (value === getTodayDate()) {
    return "Today"
  }

  return formatDate(value)
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function getTransactionName(transaction: Transaction) {
  return transaction.merchant || transaction.description || "Untitled"
}

function getTransactionFormError(error: unknown) {
  if (
    error instanceof Error &&
    (error.message.includes("numeric field overflow") ||
      error.message.includes("precision 10, scale 2"))
  ) {
    return "Amount is too large. Enter an amount below 100,000,000."
  }

  return error instanceof Error ? error.message : "Unable to save transaction."
}

function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort((first, second) => {
    const dateComparison = second.transaction_date.localeCompare(
      first.transaction_date
    )

    if (dateComparison !== 0) {
      return dateComparison
    }

    return (
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime()
    )
  })
}

function mergeTransaction(
  transactions: Transaction[],
  transaction: Transaction
) {
  const transactionById = new Map(
    transactions.map((current) => [current.id, current])
  )

  transactionById.set(transaction.id, transaction)

  return sortTransactions(Array.from(transactionById.values()))
}

function createOptimisticTransaction(
  transaction: Partial<Transaction>,
  input: {
    type: Transaction["type"]
    amount: number
    merchant: string
    currency: string
    categoryId: string | null
    receiptId: string | null
    amountBeforeTax: number | null
    taxAmount: number | null
    amountAfterTax: number | null
    netAmount: number | null
    deductibleAmount: number | null
    taxCreditAmount: number | null
    transactionDate: string
  }
): Transaction {
  return {
    id: transaction.id ?? `optimistic:${crypto.randomUUID()}`,
    type: transaction.type ?? input.type,
    amount: Number(transaction.amount ?? input.amount),
    currency: transaction.currency ?? input.currency,
    category_id:
      transaction.category_id ??
      (input.type === "expense" ? input.categoryId : null),
    receipt_id: transaction.receipt_id ?? input.receiptId,
    platform_id: transaction.platform_id ?? null,
    source_type:
      transaction.source_type ?? (input.type === "income" ? "fare" : null),
    amount_before_tax:
      transaction.amount_before_tax ??
      input.amountBeforeTax ??
      (input.type === "income" ? input.amount : null),
    tax_amount: transaction.tax_amount ?? input.taxAmount,
    amount_after_tax:
      transaction.amount_after_tax ??
      input.amountAfterTax ??
      (input.type === "expense" ? input.amount : null),
    platform_fee: transaction.platform_fee ?? 0,
    net_amount: transaction.net_amount ?? input.netAmount,
    expense_tax_recoverable: transaction.expense_tax_recoverable ?? true,
    deductible_amount:
      transaction.deductible_amount ??
      input.deductibleAmount ??
      (input.type === "expense" ? input.amount : null),
    tax_credit_amount: transaction.tax_credit_amount ?? input.taxCreditAmount,
    transaction_date: transaction.transaction_date ?? input.transactionDate,
    merchant: transaction.merchant ?? input.merchant,
    description: transaction.description ?? null,
    payment_method: transaction.payment_method ?? null,
    business_percentage: transaction.business_percentage ?? 100,
    tax_deductible:
      transaction.tax_deductible ?? (input.type === "expense"),
    created_at: transaction.created_at ?? new Date().toISOString(),
  }
}

function groupTransactionsByDate(transactions: Transaction[]) {
  return transactions.reduce<Array<{ date: string; transactions: Transaction[] }>>(
    (groups, transaction) => {
      const currentGroup = groups[groups.length - 1]

      if (currentGroup?.date === transaction.transaction_date) {
        currentGroup.transactions.push(transaction)
        return groups
      }

      groups.push({
        date: transaction.transaction_date,
        transactions: [transaction],
      })

      return groups
    },
    []
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const [dialogMode, setDialogMode] = useState<TransactionMode | null>(null)
  const [amount, setAmount] = useState("")
  const [merchant, setMerchant] = useState("")
  const [transactionDate, setTransactionDate] = useState(getTodayDate)
  const [currency, setCurrency] = useState("CAD")
  const [businessTypes, setBusinessTypes] =
    useState<BusinessTypeOption[]>(fallbackBusinessTypes)
  const [defaultBusiness, setDefaultBusiness] = useState(
    fallbackBusinessTypes[0].name
  )
  const [business, setBusiness] = useState(fallbackBusinessTypes[0].name)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    fallbackExpenseCategories[0].id
  )
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReceiptUploading, setIsReceiptUploading] = useState(false)
  const [isReceiptDeleting, setIsReceiptDeleting] = useState(false)
  const [uploadedReceipt, setUploadedReceipt] = useState<Receipt | null>(null)
  const receiptUploadRequestIdRef = useRef(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [taxRate, setTaxRate] = useState(fallbackTaxRate)
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false)
  const [highlightedTransactionId, setHighlightedTransactionId] = useState<
    string | null
  >(null)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [error, setError] = useState("")

  const parsedAmount = Number(amount)
  const hasAmount = Number.isFinite(parsedAmount) && parsedAmount > 0
  const hasValidAmount = hasAmount && parsedAmount <= maxTransactionAmount
  const hasMerchant = merchant.trim().length > 0
  const hasUploadedReceipt = Boolean(uploadedReceipt)
  const isReceiptOnlySave = hasUploadedReceipt && !amount.trim() && !hasMerchant
  const canSubmit =
    ((hasValidAmount &&
      hasMerchant &&
      Boolean(transactionDate) &&
      Boolean(business)) ||
      hasUploadedReceipt) &&
    !isReceiptUploading &&
    !isReceiptDeleting &&
    !isSubmitting
  const transactionLabel = dialogMode === "income" ? "earning" : "expense"
  const recentTransactions = transactions.slice(0, 6)
  const recentTransactionGroups = groupTransactionsByDate(recentTransactions)
  const currencySymbol = getCurrencySymbol(currency)
  const categoryOptions =
    categories.length > 0 ? categories : fallbackExpenseCategories
  const categoryById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]))
  }, [categories])
  const selectedDbCategoryId = categories.some(
    (category) => category.id === selectedCategoryId
  )
    ? selectedCategoryId
    : null

  const todayIncome = useMemo(() => {
    return transactions.reduce((total, transaction) => {
      if (
        transaction.type !== "income" ||
        transaction.transaction_date !== getTodayDate()
      ) {
        return total
      }

      return total + getIncomeReceived(transaction)
    }, 0)
  }, [transactions])
  const incomeSourceRows = useMemo(() => {
    return Array.from(
      transactions
        .reduce((sources, transaction) => {
          if (
            transaction.type !== "income" ||
            transaction.transaction_date !== getTodayDate()
          ) {
            return sources
          }

          const source = getIncomeSource(transaction)
          const current = sources.get(source) ?? 0

          sources.set(source, current + getIncomeReceived(transaction))
          return sources
        }, new Map<string, number>())
        .entries()
    )
      .map(([source, amount]) => ({
        source,
        amount,
        brandColor: getSourceBrandColor(source, businessTypes),
      }))
      .sort((left, right) => right.amount - left.amount)
  }, [businessTypes, transactions])

  useEffect(() => {
    let isMounted = true

    async function loadDashboardData() {
      if (!user) {
        setIsLoadingTransactions(false)
        return
      }

      setIsLoadingTransactions(true)

      try {
        const categoryRequest = categoryService
          .listExpenseCategories()
          .catch(() => [])
        const businessTypesRequest = businessTypeService
          .listBusinessTypes()
          .catch(() => fallbackBusinessTypes)
        const [
          nextTransactions,
          profileDetails,
          nextCategories,
          nextBusinessTypes,
        ] = await Promise.all([
            transactionService.listTransactions(user.id),
            profileService.getProfileDetails(user.id),
            categoryRequest,
            businessTypesRequest,
          ])

        if (isMounted) {
          const nextBusinessOptions =
            nextBusinessTypes.length > 0
              ? nextBusinessTypes
              : fallbackBusinessTypes
          setTransactions(sortTransactions(nextTransactions))
          setCategories(nextCategories)
          setBusinessTypes(nextBusinessOptions)
          setSelectedCategoryId(
            (current) =>
              !current || current.startsWith("fallback:")
                ? nextCategories[0]?.id || fallbackExpenseCategories[0].id
                : current
          )
          const nextBusiness = normalizeBusinessTypeValue(
            profileDetails.profile?.business_type ??
              user.user_metadata.business_type,
            nextBusinessOptions
          )
          setDefaultBusiness(nextBusiness)
          setCurrency(
            profileDetails.profile?.currency ??
              profileDetails.settings?.default_currency ??
              "CAD"
          )
          setTaxRate(
            getGstHstRate(profileDetails.taxReference) ??
              profileDetails.taxSettings?.tax_rate ??
              fallbackTaxRate
          )
          setBusiness(nextBusiness)
        }
      } catch {
        if (isMounted) {
          setTransactions([])
          setCategories([])
          setBusinessTypes(fallbackBusinessTypes)
          const nextBusiness = normalizeBusinessTypeValue(
            user.user_metadata.business_type,
            fallbackBusinessTypes
          )
          setDefaultBusiness(nextBusiness)
          setCurrency("CAD")
          setTaxRate(fallbackTaxRate)
          setBusiness(nextBusiness)
        }
      } finally {
        if (isMounted) {
          setIsLoadingTransactions(false)
        }
      }
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [user])

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const nextBusiness = normalizeBusinessTypeValue(
        (event as CustomEvent<{ businessType?: string | null }>).detail
          ?.businessType,
        businessTypes
      )
      const nextCurrency = (
        event as CustomEvent<{
          businessType?: string | null
          currency?: string | null
        }>
      ).detail?.currency

      setDefaultBusiness(nextBusiness)
      setCurrency(nextCurrency || "CAD")

      if (!dialogMode) {
        setBusiness(nextBusiness)
      }
    }

    window.addEventListener("profile-updated", handleProfileUpdated)

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated)
    }
  }, [businessTypes, dialogMode])

  useEffect(() => {
    if (!highlightedTransactionId) {
      return
    }

    const timeout = window.setTimeout(() => {
      setHighlightedTransactionId(null)
    }, 1800)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [highlightedTransactionId])

  function resetTransactionForm() {
    setAmount("")
    setMerchant("")
    setTransactionDate(getTodayDate())
    setBusiness(defaultBusiness)
    setSelectedCategoryId(
      categoryOptions[0]?.id || fallbackExpenseCategories[0].id
    )
    setIsDatePickerOpen(false)
    receiptUploadRequestIdRef.current += 1
    setIsReceiptUploading(false)
    setIsReceiptDeleting(false)
    setUploadedReceipt(null)
    setError("")
  }

  function openTransactionDialog(mode: TransactionMode) {
    resetTransactionForm()
    setDialogMode(mode)
  }

  function handleTransactionCardKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    mode: TransactionMode
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return
    }

    event.preventDefault()
    openTransactionDialog(mode)
  }

  async function handleTransactionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (isReceiptOnlySave) {
      toast.success("Receipts uploaded successfully")
      resetTransactionForm()
      setDialogMode(null)
      return
    }

    if (!canSubmit || !user || !dialogMode) {
      if (hasAmount && !hasValidAmount) {
        setError("Amount is too large. Enter an amount below 100,000,000.")
      } else if (hasUploadedReceipt) {
        setError(
          `Add a valid amount and ${
            dialogMode === "income" ? "source" : "merchant"
          }, or clear the fields to save only the receipt.`
        )
      }

      return
    }

    setIsSubmitting(true)

    try {
      const incomeTaxAmount =
        dialogMode === "income" ? Number((parsedAmount * taxRate).toFixed(2)) : null
      const incomeAfterTaxAmount =
        dialogMode === "income" && incomeTaxAmount !== null
          ? Number((parsedAmount + incomeTaxAmount).toFixed(2))
          : null
      const expenseTaxCreditAmount =
        dialogMode === "expense"
          ? Number((parsedAmount * taxRate).toFixed(2))
          : null
      const input = {
        userId: user.id,
        amount: parsedAmount,
        merchant: merchant.trim(),
        currency,
        categoryId: dialogMode === "expense" ? selectedDbCategoryId : null,
        receiptId: uploadedReceipt?.id ?? null,
        amountBeforeTax: dialogMode === "income" ? parsedAmount : null,
        taxAmount: incomeTaxAmount,
        amountAfterTax: incomeAfterTaxAmount,
        netAmount: incomeAfterTaxAmount,
        deductibleAmount: dialogMode === "expense" ? parsedAmount : null,
        taxCreditAmount: expenseTaxCreditAmount,
        transactionDate,
      }

      const transaction =
        dialogMode === "income"
          ? await transactionService.createIncome(input)
          : await transactionService.createExpense(input)
      const savedTransaction = createOptimisticTransaction(
        transaction as Partial<Transaction>,
        {
          type: dialogMode,
          amount: parsedAmount,
          merchant: merchant.trim(),
          currency,
          categoryId: dialogMode === "expense" ? selectedDbCategoryId : null,
          receiptId: uploadedReceipt?.id ?? null,
          amountBeforeTax: dialogMode === "income" ? parsedAmount : null,
          taxAmount: incomeTaxAmount,
          amountAfterTax: incomeAfterTaxAmount,
          netAmount: incomeAfterTaxAmount,
          deductibleAmount: dialogMode === "expense" ? parsedAmount : null,
          taxCreditAmount: expenseTaxCreditAmount,
          transactionDate,
        }
      )

      setTransactions((current) =>
        mergeTransaction(current, savedTransaction)
      )
      const nextTransactions = await transactionService.listTransactions(user.id)
      setTransactions(mergeTransaction(nextTransactions, savedTransaction))
      setHighlightedTransactionId(savedTransaction.id)
      resetTransactionForm()
      setDialogMode(null)
    } catch (error) {
      setError(getTransactionFormError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleAmountChange(value: string) {
    setError("")

    if (!/^\d*\.?\d*$/.test(value)) {
      return
    }

    setAmount(value)
  }

  async function handleReceiptChange(file: File | undefined) {
    setError("")

    if (!file) {
      return
    }

    if (!user) {
      setError("Sign in to upload receipts.")
      return
    }

    const requestId = receiptUploadRequestIdRef.current + 1
    receiptUploadRequestIdRef.current = requestId
    setIsReceiptUploading(true)

    try {
      const receipt = await receiptService.uploadReceipt({
        userId: user.id,
        file,
      })
      if (receiptUploadRequestIdRef.current === requestId) {
        setUploadedReceipt(receipt)
      }
    } catch (error) {
      if (receiptUploadRequestIdRef.current === requestId) {
        setError(
          error instanceof Error ? error.message : "Unable to upload receipt."
        )
      }
    } finally {
      if (receiptUploadRequestIdRef.current === requestId) {
        setIsReceiptUploading(false)
      }
    }
  }

  async function handleDeleteUploadedReceipt() {
    if (!uploadedReceipt || !user || isReceiptDeleting) {
      return
    }

    setError("")
    setIsReceiptDeleting(true)

    try {
      await receiptService.deleteReceipt({
        userId: user.id,
        receipt: uploadedReceipt,
      })
      setUploadedReceipt(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete receipt.")
    } finally {
      setIsReceiptDeleting(false)
    }
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 lg:px-6">
        <section className="grid grid-cols-[repeat(4,minmax(12rem,1fr))] gap-3 overflow-x-auto px-px py-4">
          <Card
            className="min-h-24 cursor-pointer shadow-none transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            size="sm"
            role="button"
            tabIndex={0}
            onClick={() => openTransactionDialog("expense")}
            onKeyDown={(event) =>
              handleTransactionCardKeyDown(event, "expense")
            }
          >
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-2">
              <BanknoteArrowDown size={32} />
              <span className="text-center text-sm font-medium">
                Add expense
              </span>
            </CardContent>
          </Card>

          <Card
            className="min-h-24 cursor-pointer shadow-none transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            size="sm"
            role="button"
            tabIndex={0}
            onClick={() => openTransactionDialog("income")}
            onKeyDown={(event) => handleTransactionCardKeyDown(event, "income")}
          >
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-2">
              <BanknoteArrowUp size={32} />
              <span className="text-center text-sm font-medium">
                Add earning
              </span>
            </CardContent>
          </Card>

          <Card className="min-h-24 bg-muted/50 shadow-none" size="sm">
            <CardHeader className="pb-0">
              <CardDescription className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setIsIncomeDialogOpen(true)}
                >
                  view sources
                </button>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-end gap-1 pt-2">
              <p className="text-xl font-semibold tabular-nums">
                {formatMoney(todayIncome)}
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="flex min-w-0 items-center gap-2">
                  <PiggyBank className="shrink-0" />
                  <span className="truncate">Money received</span>
                </span>
              </div>
            </CardContent>
          </Card>

          <Card
            className="min-h-24 bg-blue-200 text-blue-950 shadow-none dark:bg-blue-950/50 dark:text-blue-50"
            size="sm"
          >
            <CardContent className="grid h-full gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex flex-col gap-2">
                <div>
                  <h2 className="text-base font-medium">Profit & Tax</h2>
                  <p className="text-sm text-blue-950/70 dark:text-blue-100/75">
                    Earnings, spending, and tax money to keep aside.
                  </p>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto w-fit px-0 text-blue-950 hover:text-blue-950/80 dark:text-blue-100 dark:hover:text-blue-50"
                  render={<Link to="/dashboard/my-profit" />}
                >
                  See all
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
              <div className="relative hidden size-12 items-center justify-center sm:flex">
                <Landmark className="text-blue-950/70 dark:text-blue-100/75" />
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="shadow-none ring-0">
            <CardContent>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-medium">
                    Recent Transactions
                  </h2>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  render={<Link to="/dashboard/transactions" />}
                >
                  See all
                </Button>
              </div>

              {isLoadingTransactions ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Loading activity...
                </p>
              ) : recentTransactions.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No recent transactions.
                </p>
              ) : (
                <div className="flex flex-col">
                  {recentTransactionGroups.map((group) => (
                    <div key={group.date} className="flex flex-col">
                      <p className="py-1.5 text-xs font-medium text-muted-foreground">
                        {formatDate(group.date)}
                      </p>
                      {group.transactions.map((transaction) => {
                        const isIncome = transaction.type === "income"
                        const category = findExpenseCategoryForTransaction(
                          transaction,
                          categoryOptions,
                          categoryById
                        )
                        const ExpenseIcon = category
                          ? getExpenseCategoryIcon(category.icon, category.slug)
                          : ReceiptIcon

                        return (
                          <div
                            key={transaction.id}
                            className={cn(
                              "-mx-2 grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md border-b px-2 py-3 transition-colors duration-700 last:border-b-0",
                              highlightedTransactionId === transaction.id &&
                                "animate-pulse bg-green-100"
                            )}
                          >
                            <div className="flex justify-center">
                              {isIncome ? <ArrowUp /> : <ExpenseIcon />}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {getTransactionName(transaction)}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {transaction.created_at
                                  ? formatTime(transaction.created_at)
                                  : transaction.type}
                              </p>
                            </div>
                            <p
                              className={cn(
                                "text-sm tabular-nums",
                                isIncome
                                  ? "text-muted-foreground"
                                  : "text-foreground"
                              )}
                            >
                              {isIncome ? "" : "-"}
                              {formatTransactionCurrency(transaction)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

      </main>

      <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Today’s Money Received</DialogTitle>
            <DialogDescription>
              What came in today from each earning source.
            </DialogDescription>
          </DialogHeader>

          {incomeSourceRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No earnings added today.
            </p>
          ) : (
            <div className="divide-y">
              {incomeSourceRows.map((source) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span
                    className="font-medium"
                    style={{ color: source.brandColor }}
                  >
                    {source.source}
                  </span>
                  <span className="tabular-nums">
                    {formatMoney(source.amount, currency)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 pt-3 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatMoney(todayIncome, currency)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null)
            resetTransactionForm()
          }
        }}
      >
        <DialogContent className="overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Add {dialogMode === "income" ? "earning" : "expense"}
            </DialogTitle>
            <DialogDescription>
              Save a new {transactionLabel} to your transaction history.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex min-w-0 flex-col gap-5"
            onSubmit={handleTransactionSubmit}
          >
            <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="amount">Amount ({currencySymbol})</Label>
                <Input
                  id="amount"
                  value={amount}
                  inputMode="decimal"
                  aria-describedby="amountTaxHint"
                  aria-invalid={Boolean(error)}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  pattern="[0-9]*[.]?[0-9]*"
                  placeholder="0.00"
                />
                <p id="amountTaxHint" className="text-xs text-muted-foreground">
                  {dialogMode === "income"
                    ? "Enter the amount before taxes."
                    : "Enter the amount after taxes."}
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="transactionDate">Date</Label>
                <Popover
                  open={isDatePickerOpen}
                  onOpenChange={setIsDatePickerOpen}
                >
                  <PopoverTrigger
                    render={
                      <Button
                        id="transactionDate"
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                      />
                    }
                  >
                    <CalendarIcon data-icon="inline-start" />
                    {formatDatePickerLabel(transactionDate)}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseLocalDate(transactionDate)}
                      disabled={(date) =>
                        dateToInputValue(date) > getTodayDate()
                      }
                      onSelect={(date) => {
                        if (!date) {
                          return
                        }

                        setTransactionDate(dateToInputValue(date))
                        setIsDatePickerOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="merchant">
                {dialogMode === "income" ? "Source" : "Where"}
              </Label>
              <Input
                id="merchant"
                value={merchant}
                onChange={(event) => {
                  setError("")
                  setMerchant(event.target.value)
                }}
                placeholder={
                  dialogMode === "income"
                    ? "Uber, DoorDash, client..."
                    : "Coffee, Starbucks, Shell..."
                  }
                />
            </div>

            {dialogMode === "expense" ? (
              <div className="min-w-0 overflow-hidden">
                <div className="no-scrollbar flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
                  {categoryOptions.map((category) => {
                    const isSelected = selectedCategoryId === category.id

                    return (
                      <Button
                        key={category.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-pressed={isSelected}
                        data-selected={isSelected}
                        className="shrink-0 whitespace-nowrap data-[selected=true]:bg-secondary"
                        onClick={() => {
                          setError("")
                          setSelectedCategoryId(category.id)
                          setMerchant(category.name)
                        }}
                      >
                        <ExpenseCategoryIcon icon={category.icon} slug={category.slug} />
                        {category.name}
                      </Button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {dialogMode === "income" ? (
              <div className="min-w-0 overflow-hidden">
                <div className="no-scrollbar flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
                  {businessTypes.map((option) => {
                    const isSelected = business === option.name

                    return (
                      <Button
                        key={option.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-pressed={isSelected}
                        data-selected={isSelected}
                        className="shrink-0 whitespace-nowrap data-[selected=true]:bg-secondary"
                        onClick={() => {
                          setError("")
                          setBusiness(option.name)
                          setMerchant(option.name)
                        }}
                      >
                        {option.name}
                      </Button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter className="mt-3 gap-3 sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  id="receiptUpload"
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  disabled={isReceiptUploading || isReceiptDeleting}
                  onChange={(event) => {
                    void handleReceiptChange(event.target.files?.[0])
                    event.target.value = ""
                  }}
                />
                <Label
                  htmlFor="receiptUpload"
                  aria-disabled={isReceiptUploading}
                  className={cn(
                    "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-4xl bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700",
                    (isReceiptUploading || isReceiptDeleting) &&
                      "pointer-events-none cursor-not-allowed opacity-60"
                  )}
                >
                  {isReceiptUploading
                    ? "Uploading..."
                    : uploadedReceipt
                      ? "Replace receipt"
                      : "Upload receipt"}
                </Label>
                {uploadedReceipt ? (
                  <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-green-700">
                    <span className="max-w-28 truncate sm:max-w-48">
                      {uploadedReceipt.original_filename ?? "Receipt"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 text-green-700 hover:bg-green-100 hover:text-green-800"
                      aria-label="Remove receipt"
                      disabled={isReceiptDeleting}
                      onClick={handleDeleteUploadedReceipt}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogMode(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Saving..." : `Save ${transactionLabel}`}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
