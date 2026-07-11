import { useEffect, useMemo, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/features/auth/auth-context"
import { cn } from "@/lib/utils"
import {
  businessTypeService,
  fallbackBusinessTypes,
  type BusinessTypeOption,
} from "@/services/business-type-service"
import {
  categoryService,
  type ExpenseCategory,
} from "@/services/category-service"
import { profileService } from "@/services/profile-service"
import {
  getGstHstRate,
  type CanadaTaxReference,
} from "@/services/tax-reference-service"
import {
  transactionService,
  type Transaction,
} from "@/services/transaction-service"

const fallbackTaxName = "HST"
const fallbackTaxRate = 0.13
const profitPeriods = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] as const

type ProfitPeriod = (typeof profitPeriods)[number]["value"]

function dateToInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getStartOfToday() {
  return dateToInputValue(new Date())
}

function getEndOfToday() {
  return dateToInputValue(new Date())
}

function getStartOfWeek() {
  const date = new Date()
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diff)
  return dateToInputValue(date)
}

function getEndOfWeek() {
  const date = new Date()
  const day = date.getDay()
  const diff = day === 0 ? 0 : 7 - day
  date.setDate(date.getDate() + diff)
  return dateToInputValue(date)
}

function getStartOfMonth() {
  const date = new Date()
  date.setDate(1)
  return dateToInputValue(date)
}

function getEndOfMonth() {
  const date = new Date()
  date.setMonth(date.getMonth() + 1, 0)
  return dateToInputValue(date)
}

function getPeriodRange(period: ProfitPeriod) {
  if (period === "week") {
    return {
      start: getStartOfWeek(),
      end: getEndOfWeek(),
    }
  }

  if (period === "month") {
    return {
      start: getStartOfMonth(),
      end: getEndOfMonth(),
    }
  }

  return {
    start: getStartOfToday(),
    end: getEndOfToday(),
  }
}

function getPeriodLabel(period: ProfitPeriod) {
  return profitPeriods.find((item) => item.value === period)?.label ?? "Today"
}

function isProfitPeriod(value: unknown): value is ProfitPeriod {
  return profitPeriods.some((item) => item.value === value)
}

function getTransactionDateValue(transaction: Transaction) {
  const dateMatch = transaction.transaction_date.match(/^\d{4}-\d{2}-\d{2}/)

  if (dateMatch) {
    return dateMatch[0]
  }

  const date = new Date(transaction.transaction_date)

  if (Number.isNaN(date.getTime())) {
    return transaction.transaction_date
  }

  return dateToInputValue(date)
}

function getTaxYearStart(taxYear: number) {
  return `${taxYear}-01-01`
}

function getTaxYearEnd(taxYear: number) {
  return `${taxYear}-12-31`
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

function getIncomeBeforeTax(transaction: Transaction) {
  const amountBeforeTax = getOptionalAmount(transaction.amount_before_tax)

  return amountBeforeTax !== null
    ? amountBeforeTax
    : getTransactionAmount(transaction)
}

function getIncomeTaxAmount(transaction: Transaction, taxRate: number) {
  const amountBeforeTax = getIncomeBeforeTax(transaction)
  const amountAfterTax = getOptionalAmount(transaction.amount_after_tax)

  if (amountAfterTax !== null) {
    return Math.max(amountAfterTax - amountBeforeTax, 0)
  }

  const taxAmount = getOptionalAmount(transaction.tax_amount)

  if (taxAmount !== null && taxAmount > 0) {
    return taxAmount
  }

  return amountBeforeTax * taxRate
}

function getIncomeAfterTax(transaction: Transaction, taxRate: number) {
  const amountAfterTax = getOptionalAmount(transaction.amount_after_tax)

  if (amountAfterTax !== null) {
    return amountAfterTax
  }

  return getIncomeBeforeTax(transaction) + getIncomeTaxAmount(transaction, taxRate)
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

function getDeductibleAmount(transaction: Transaction) {
  const deductibleAmount = getOptionalAmount(transaction.deductible_amount)

  if (deductibleAmount !== null) {
    return deductibleAmount
  }

  if (!transaction.tax_deductible) {
    return 0
  }

  return (
    getTransactionAmount(transaction) *
    ((transaction.business_percentage ?? 100) / 100)
  )
}

function getTaxCreditAmount(transaction: Transaction, taxRate: number) {
  const taxCreditAmount = getOptionalAmount(transaction.tax_credit_amount)

  if (taxCreditAmount !== null) {
    return taxCreditAmount
  }

  return getDeductibleAmount(transaction) * taxRate
}

function getFederalBasicPersonalAmount(reference: CanadaTaxReference | null) {
  const credit =
    reference?.federalTaxCredits.find(
      (credit) => credit.credit_type === "federal_basic_personal_amount_maximum"
    ) ??
    reference?.federalTaxCredits.find((credit) =>
      credit.credit_type.includes("basic_personal_amount")
    )

  return credit?.amount ?? null
}

export function MyProfitPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [businessTypes, setBusinessTypes] =
    useState<BusinessTypeOption[]>(fallbackBusinessTypes)
  const [currency, setCurrency] = useState("CAD")
  const [taxName, setTaxName] = useState(fallbackTaxName)
  const [taxRate, setTaxRate] = useState(fallbackTaxRate)
  const [taxRegion, setTaxRegion] = useState("ON")
  const [taxCountry, setTaxCountry] = useState("CA")
  const [taxYear, setTaxYear] = useState(() => new Date().getFullYear())
  const [taxReference, setTaxReference] = useState<CanadaTaxReference | null>(
    null
  )
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false)
  const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false)
  const [isHstDialogOpen, setIsHstDialogOpen] = useState(false)
  const [period, setPeriod] = useState<ProfitPeriod>("today")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const periodRange = getPeriodRange(period)

  useEffect(() => {
    let isMounted = true

    async function loadMyProfitData() {
      if (!user) {
        return
      }

      setIsLoading(true)
      setError("")

      try {
        const [
          nextTransactions,
          profileDetails,
          nextCategories,
          nextBusinessTypes,
        ] =
          await Promise.all([
            transactionService.listTransactions(user.id),
            profileService.getProfileDetails(user.id),
            categoryService.listExpenseCategories().catch(() => []),
            businessTypeService
              .listBusinessTypes()
              .catch(() => fallbackBusinessTypes),
          ])

        if (isMounted) {
          setTransactions(nextTransactions)
          setCategories(nextCategories)
          setBusinessTypes(
            nextBusinessTypes.length > 0
              ? nextBusinessTypes
              : fallbackBusinessTypes
          )
          setCurrency(
            profileDetails.profile?.currency ??
              profileDetails.settings?.default_currency ??
              "CAD"
          )
          setTaxName(profileDetails.taxSettings?.tax_name ?? fallbackTaxName)
          setTaxRate(
            getGstHstRate(profileDetails.taxReference) ??
              profileDetails.taxSettings?.tax_rate ??
              fallbackTaxRate
          )
          setTaxRegion(profileDetails.taxSettings?.region ?? "ON")
          setTaxCountry(profileDetails.taxSettings?.country ?? "CA")
          setTaxYear(
            profileDetails.taxSettings?.tax_year ?? new Date().getFullYear()
          )
          setTaxReference(profileDetails.taxReference)
        }
      } catch (error) {
        if (isMounted) {
          setError(
            error instanceof Error ? error.message : "Unable to load My Profit."
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadMyProfitData()

    return () => {
      isMounted = false
    }
  }, [user])

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]))
  }, [categories])
  const periodTransactions = transactions.filter((transaction) => {
    const transactionDate = getTransactionDateValue(transaction)

    return (
      transactionDate >= periodRange.start && transactionDate <= periodRange.end
    )
  })
  const taxYearStart = getTaxYearStart(taxYear)
  const taxYearEnd = getTaxYearEnd(taxYear)
  const taxYearTransactions = transactions.filter(
    (transaction) =>
      transaction.transaction_date >= taxYearStart &&
      transaction.transaction_date <= taxYearEnd
  )
  const periodIncomeTransactions = periodTransactions.filter(
    (transaction) => transaction.type === "income"
  )
  const periodExpenseTransactions = periodTransactions.filter(
    (transaction) => transaction.type === "expense"
  )
  const taxYearIncomeTransactions = taxYearTransactions.filter(
    (transaction) => transaction.type === "income"
  )
  const taxYearExpenseTransactions = taxYearTransactions.filter(
    (transaction) => transaction.type === "expense"
  )
  const earnedBeforeTax = periodIncomeTransactions.reduce(
    (total, transaction) => total + getIncomeBeforeTax(transaction),
    0
  )
  const deductibleExpenses = periodExpenseTransactions.reduce(
    (total, transaction) => total + getDeductibleAmount(transaction),
    0
  )
  const hstAmount = periodIncomeTransactions.reduce(
    (total, transaction) => total + getIncomeTaxAmount(transaction, taxRate),
    0
  )
  const afterTaxAmount = periodIncomeTransactions.reduce(
    (total, transaction) => total + getIncomeAfterTax(transaction, taxRate),
    0
  )
  const incomeSourceRows = Array.from(
    periodIncomeTransactions
      .reduce((sources, transaction) => {
        const source = getIncomeSource(transaction)
        const current = sources.get(source) ?? 0

        sources.set(source, current + getIncomeAfterTax(transaction, taxRate))
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
  const hstCredit = periodExpenseTransactions.reduce(
    (total, transaction) => total + getTaxCreditAmount(transaction, taxRate),
    0
  )
  const keepForTaxes = Math.max(hstAmount - hstCredit, 0)
  const yearHstAmount = taxYearIncomeTransactions.reduce(
    (total, transaction) => total + getIncomeTaxAmount(transaction, taxRate),
    0
  )
  const yearHstCredit = taxYearExpenseTransactions.reduce(
    (total, transaction) => total + getTaxCreditAmount(transaction, taxRate),
    0
  )
  const yearEndKeepForTaxes = Math.max(yearHstAmount - yearHstCredit, 0)
  const businessEarned = Math.max(earnedBeforeTax - deductibleExpenses, 0)
  const federalBasicPersonalAmount =
    getFederalBasicPersonalAmount(taxReference)
  const smallSupplierThreshold = taxReference?.gstHstThresholds.find(
    (threshold) => threshold.threshold_type === "small_supplier"
  )
  const rideShareRegistrationRule = taxReference?.gstHstThresholds.find(
    (threshold) => threshold.threshold_type === "mandatory_registration"
  )
  const deductibleExpenseRows = periodExpenseTransactions
    .filter((transaction) => getDeductibleAmount(transaction) > 0)
    .map((transaction) => ({
      id: transaction.id,
      label:
        (transaction.category_id
          ? categoryNameById.get(transaction.category_id)
          : null) ||
        transaction.merchant ||
        "Expense",
      amount: getDeductibleAmount(transaction),
    }))
  return (
    <section className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Profit & Tax
              </h1>
              <p className="text-sm text-muted-foreground">
                {getPeriodLabel(period)} money in plain English.
              </p>
            </div>
            <Tabs
              value={period}
              onValueChange={(value) => {
                if (isProfitPeriod(value)) {
                  setPeriod(value)
                }
              }}
              className="w-full sm:w-auto"
            >
              <TabsList className="ml-auto w-full sm:w-fit">
                {profitPeriods.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <p className="py-14 text-center text-sm text-muted-foreground">
              Loading My Profit...
            </p>
          ) : error ? (
            <p className="py-14 text-center text-sm text-destructive">
              {error}
            </p>
          ) : (
            <>
              <section className="grid w-full grid-cols-[repeat(3,minmax(12rem,1fr))] gap-3 overflow-x-auto px-px py-4">
                <MetricCard
                  label="Money received"
                  helper={`What came in ${getPeriodLabel(period).toLowerCase()}`}
                  value={formatMoney(afterTaxAmount, currency)}
                  action={
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => setIsIncomeDialogOpen(true)}
                    >
                      view sources
                    </button>
                  }
                />
                <MetricCard
                  label={`Keep for ${taxName}`}
                  helper="Do not spend this"
                  value={formatMoney(keepForTaxes, currency)}
                  tone="bad"
                  action={
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => setIsHstDialogOpen(true)}
                    >
                      What is {taxName}?
                    </button>
                  }
                />
                <MetricCard
                  label="You earned"
                  helper="After expenses"
                  value={formatMoney(businessEarned, currency)}
                  tone="good"
                />
              </section>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>Expenses You Can Claim</span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => setIsExpensesDialogOpen(true)}
                    >
                      view {getPeriodLabel(period).toLowerCase()} expenses
                    </button>
                  </CardTitle>
                  <CardDescription>
                    These lower what your business earned.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {deductibleExpenseRows.length ? (
                    <div className="divide-y">
                      {deductibleExpenseRows.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <span className="font-medium">{expense.label}</span>
                          <span className="tabular-nums">
                            {formatMoney(expense.amount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No claimable expenses added in this period.
                    </p>
                  )}
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Total Expenses</span>
                      <span className="tabular-nums">
                        {formatMoney(deductibleExpenses, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{taxName} Credits</span>
                      <span className="tabular-nums">
                        {formatMoney(hstCredit, currency)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <section className="rounded-md border bg-muted/40 p-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Year-to-date tax reminder
                  </p>
                  <p className="text-sm font-semibold">
                    Set aside {formatMoney(yearEndKeepForTaxes, currency)} for
                    year-end {taxName}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Based on everything you've added so far this year: {taxName}{" "}
                    collected minus estimated {taxName} credits.
                  </p>
                  {federalBasicPersonalAmount !== null ? (
                    <p className="text-xs text-muted-foreground">
                      For {taxYear}, the federal basic personal amount is up to{" "}
                      {formatMoney(federalBasicPersonalAmount, currency)}. If
                      your taxable income is near or below this, your federal
                      income tax may be reduced to $0, but {taxName} can still
                      apply.
                    </p>
                  ) : null}
                </div>
              </section>

            </>
          )}
        </div>
      </div>

      <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getPeriodLabel(period)} Money Received</DialogTitle>
            <DialogDescription>
              What came in {getPeriodLabel(period).toLowerCase()} from each
              earning source.
            </DialogDescription>
          </DialogHeader>

          {incomeSourceRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No earnings added in this period.
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
                  {formatMoney(afterTaxAmount, currency)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isExpensesDialogOpen}
        onOpenChange={setIsExpensesDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{getPeriodLabel(period)} Expenses</DialogTitle>
            <DialogDescription>
              Expenses used to calculate what you earned in this period.
            </DialogDescription>
          </DialogHeader>

          {periodExpenseTransactions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No expenses added in this period.
            </p>
          ) : (
            <div className="flex flex-col">
              {periodExpenseTransactions.map((transaction) => {
                const name =
                  (transaction.category_id
                    ? categoryNameById.get(transaction.category_id)
                    : null) ||
                  transaction.merchant ||
                  "Expense"

                return (
                  <div
                    key={transaction.id}
                    className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border-b px-2 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Deductible:{" "}
                        {formatMoney(getDeductibleAmount(transaction), currency)}
                      </p>
                    </div>
                    <p className="text-sm tabular-nums">
                      -{formatMoney(getTransactionAmount(transaction), currency)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isHstDialogOpen} onOpenChange={setIsHstDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What is {taxName}? 🇨🇦</DialogTitle>
            <DialogDescription>
              A simple note for drivers in {taxRegion}, {taxCountry}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{taxName} means Harmonized Sales Tax.</p>
            <p>
              In {taxRegion}, {taxCountry}, {taxName} is{" "}
              {Math.round(taxRate * 100)}%. It is tax added on top of your fare
              and is not really your money to spend.
            </p>
            <p>
              This app shows a simple amount to keep aside so you are not
              surprised later.
            </p>
            <p>
              GST/HST registration is separate from income tax. The general
              small supplier threshold is{" "}
              {smallSupplierThreshold?.amount
                ? formatMoney(smallSupplierThreshold.amount, currency)
                : "$30,000"}{" "}
              over four consecutive calendar quarters, but commercial
              ride-sharing drivers must register from their first taxable
              passenger transportation supply.
            </p>
            <div className="rounded-lg border p-3 text-foreground">
              <p className="mb-2 text-sm font-medium">Uber Eats example</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Business income</span>
                  <span className="tabular-nums">
                    {formatMoney(4.06, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{taxName} collected</span>
                  <span className="tabular-nums">
                    {formatMoney(0.53, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t pt-1 font-medium">
                  <span>Money received</span>
                  <span className="tabular-nums">
                    {formatMoney(4.59, currency)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The fare is your business revenue. The {taxName} was collected
                for the government.
              </p>
            </div>
            <p>
              Your expenses can reduce what you may need to send in, so this
              number is an estimate. Income tax itself is progressive and
              depends on brackets and credits, so the app does not assume one
              universal no-tax income floor.
            </p>
            {rideShareRegistrationRule?.notes ? (
              <p className="text-xs">{rideShareRegistrationRule.notes}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function MetricCard({
  label,
  helper,
  value,
  tone,
  action,
}: {
  label: string
  helper: string
  value: string
  tone?: "good" | "bad"
  action?: React.ReactNode
}) {
  return (
    <Card size="sm" className="min-h-24 bg-muted/50 shadow-none">
      <CardHeader className="pb-0">
        <CardDescription className="flex items-center justify-between gap-2 font-medium text-muted-foreground">
          <span>{label}</span>
          {action}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <p
          className={cn(
            "text-xl font-semibold tabular-nums",
            tone === "good" && "text-green-700",
            tone === "bad" && "text-red-600"
          )}
        >
          {value}
        </p>
        <p className="text-sm font-medium">{helper}</p>
      </CardContent>
    </Card>
  )
}
