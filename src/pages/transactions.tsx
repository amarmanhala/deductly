import { useEffect, useState } from "react"

import { TransactionsDataTable } from "@/components/transactions-data-table"
import {
  transactionService,
  type Transaction,
} from "@/services/transaction-service"
import { useAuth } from "@/features/auth/auth-context"
import { profileService } from "@/services/profile-service"

export function TransactionsPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currency, setCurrency] = useState("CAD")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true

    async function loadTransactions() {
      if (!user) {
        return
      }

      setIsLoading(true)
      setError("")

      try {
        const [nextTransactions, profileDetails] = await Promise.all([
          transactionService.listTransactions(user.id),
          profileService.getProfileDetails(user.id),
        ])

        if (isMounted) {
          setTransactions(nextTransactions)
          setCurrency(
            profileDetails.profile?.currency ??
              profileDetails.settings?.default_currency ??
              "CAD"
          )
        }
      } catch (error) {
        if (isMounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load transactions."
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTransactions()

    return () => {
      isMounted = false
    }
  }, [user])

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const nextCurrency = (
        event as CustomEvent<{ currency?: string | null }>
      ).detail?.currency

      setCurrency(nextCurrency || "CAD")
    }

    window.addEventListener("profile-updated", handleProfileUpdated)

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated)
    }
  }, [])

  return (
    <section className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Transactions
              </h1>
              <p className="text-sm text-muted-foreground">
                Track income and expenses across your gig work.
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="px-4 py-14 text-center text-sm text-muted-foreground">
              Loading transactions...
            </p>
          ) : error ? (
            <p className="px-4 py-14 text-center text-sm text-destructive">
              {error}
            </p>
          ) : (
            <TransactionsDataTable transactions={transactions} currency={currency} />
          )}
        </div>
      </div>
    </section>
  )
}
