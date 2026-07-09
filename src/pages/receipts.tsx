import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { ReceiptsDataTable } from "@/components/receipts-data-table"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import {
  receiptService,
  type ReceiptWithTransaction,
} from "@/services/receipt-service"

export function ReceiptsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [receipts, setReceipts] = useState<ReceiptWithTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true

    async function loadReceipts() {
      if (!user) {
        return
      }

      setIsLoading(true)
      setError("")

      try {
        const nextReceipts = await receiptService.listReceipts(user.id)

        if (isMounted) {
          setReceipts(nextReceipts)
        }
      } catch (error) {
        if (isMounted) {
          setError(
            error instanceof Error ? error.message : "Unable to load receipts."
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadReceipts()

    return () => {
      isMounted = false
    }
  }, [user])

  const handleDeleteReceipt = useCallback(
    async (receipt: ReceiptWithTransaction) => {
      if (!user) {
        return
      }

      try {
        await receiptService.deleteReceipt({
          userId: user.id,
          receipt,
        })
        setReceipts((current) =>
          current.filter((currentReceipt) => currentReceipt.id !== receipt.id)
        )
        toast.success("Receipt deleted")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to delete receipt."
        )
      }
    },
    [user]
  )

  return (
    <section className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Receipts
              </h1>
              <p className="text-sm text-muted-foreground">
                Review uploaded bills and receipt files.
              </p>
            </div>

            <Button size="sm" onClick={() => navigate("/dashboard")}>
              <Plus data-icon="inline-start" />
              Upload receipt
            </Button>
          </div>

          {isLoading ? (
            <p className="px-4 py-14 text-center text-sm text-muted-foreground">
              Loading receipts...
            </p>
          ) : error ? (
            <p className="px-4 py-14 text-center text-sm text-destructive">
              {error}
            </p>
          ) : (
            <ReceiptsDataTable
              receipts={receipts}
              onDeleteReceipt={handleDeleteReceipt}
            />
          )}
        </div>
      </div>
    </section>
  )
}
