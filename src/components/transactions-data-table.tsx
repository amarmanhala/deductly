import { useEffect, useMemo, useState, type FormEvent } from "react"
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
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { useAuth } from "@/features/auth/auth-context"
import { getCurrencySymbol } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { transactionService, type Transaction } from "@/services/transaction-service"

type TransactionTableRow = Transaction & {
  name: string
  details: string
}

function formatCurrency(transaction: TransactionTableRow) {
  const amount =
    typeof transaction.amount === "number"
      ? transaction.amount
      : Number(transaction.amount)

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: transaction.currency,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function getTransactionName(transaction: Transaction) {
  return transaction.merchant || transaction.description || "Untitled"
}

function getTransactionDetail(transaction: Transaction) {
  const details = [
    transaction.description,
    transaction.payment_method?.replaceAll("_", " "),
  ].filter(Boolean)

  return details.join(" · ")
}

function createColumns(
  currency: string,
  onEdit: (transaction: Transaction) => void,
  onDelete: (transaction: Transaction) => void
): ColumnDef<TransactionTableRow>[] {
  return [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(checked) =>
          table.toggleAllPageRowsSelected(Boolean(checked))
        }
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{row.original.name}</span>
        {row.original.details ? (
          <span className="truncate text-xs capitalize text-muted-foreground">
            {row.original.details}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge
        variant={row.original.type === "income" ? "secondary" : "outline"}
        className="capitalize"
      >
        {row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: "transaction_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.transaction_date),
  },
  {
    accessorKey: "amount",
    header: () => (
      <div className="text-right">Amount ({getCurrencySymbol(currency)})</div>
    ),
    cell: ({ row }) => {
      const isExpense = row.original.type === "expense"

      return (
        <div
          className={cn(
            "text-right font-medium",
            isExpense && "text-muted-foreground"
          )}
        >
          {isExpense ? "-" : "+"}
          {formatCurrency(row.original)}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="size-8" />}
        >
          <MoreVertical />
          <span className="sr-only">Open menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => onEdit(row.original)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(row.original)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableHiding: false,
  },
  ]
}

export function TransactionsDataTable({
  transactions,
  currency = "CAD",
}: {
  transactions: Transaction[]
  currency?: string
}) {
  const { user } = useAuth()
  const [activeType, setActiveType] = useState("all")
  const [search, setSearch] = useState("")
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState<SortingState>([
    { id: "transaction_date", desc: true },
  ])
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [localTransactions, setLocalTransactions] =
    useState<Transaction[]>(transactions)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editType, setEditType] = useState<"expense" | "income">("expense")
  const [editName, setEditName] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editDate, setEditDate] = useState("")

  useEffect(() => {
    setLocalTransactions(transactions)
  }, [transactions])

  useEffect(() => {
    if (!editingTransaction) {
      return
    }

    setEditType(editingTransaction.type)
    setEditName(getTransactionName(editingTransaction))
    setEditAmount(String(editingTransaction.amount ?? ""))
    setEditDate(editingTransaction.transaction_date)
  }, [editingTransaction])

  const transactionCounts = useMemo(() => {
    return localTransactions.reduce(
      (counts, transaction) => {
        if (transaction.type === "income") {
          counts.income += 1
        } else if (transaction.type === "expense") {
          counts.expense += 1
        }

        counts.all += 1
        return counts
      },
      { all: 0, expense: 0, income: 0 }
    )
  }, [localTransactions])

  const data = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return localTransactions
      .filter((transaction) => {
        const matchesType =
          activeType === "all" || transaction.type === activeType
        const searchableText = [
          transaction.merchant,
          transaction.description,
          transaction.payment_method,
          transaction.currency,
          transaction.amount,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return matchesType && searchableText.includes(normalizedSearch)
      })
      .map((transaction) => ({
        ...transaction,
        name: getTransactionName(transaction),
        details: getTransactionDetail(transaction),
      }))
  }, [activeType, search, localTransactions])
  const columns = useMemo(
    () => createColumns(currency, openEditTransaction, openDeleteTransaction),
    [currency, openEditTransaction, openDeleteTransaction]
  )

  function openEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction)
  }

  function openDeleteTransaction(transaction: Transaction) {
    setDeleteTarget(transaction)
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user || !editingTransaction) {
      return
    }

    const parsedAmount = Number(editAmount)

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid amount.")
      return
    }

    setIsSavingEdit(true)

    try {
      const taxAmount =
        editType === "income" ? Number((parsedAmount * 0.13).toFixed(2)) : null
      const amountAfterTax =
        editType === "income"
          ? Number((parsedAmount + (taxAmount ?? 0)).toFixed(2))
          : parsedAmount

      const updatedTransaction = await transactionService.updateTransaction({
        userId: user.id,
        transactionId: editingTransaction.id,
        type: editType,
        amount: parsedAmount,
        merchant: editName.trim(),
        currency: editingTransaction.currency,
        categoryId:
          editType === "expense" ? editingTransaction.category_id : null,
        receiptId: editingTransaction.receipt_id,
        platformId: editingTransaction.platform_id,
        sourceType:
          editType === "income"
            ? editingTransaction.source_type ?? "fare"
            : editingTransaction.source_type,
        amountBeforeTax: editType === "income" ? parsedAmount : null,
        taxAmount,
        amountAfterTax,
        platformFee: editingTransaction.platform_fee,
        netAmount: amountAfterTax,
        expenseTaxRecoverable: editingTransaction.expense_tax_recoverable,
        deductibleAmount:
          editType === "expense" ? parsedAmount : editingTransaction.deductible_amount,
        taxCreditAmount:
          editType === "expense"
            ? Number((parsedAmount * 0.13).toFixed(2))
            : editingTransaction.tax_credit_amount,
        transactionDate: editDate,
      })

      setLocalTransactions((current) =>
        current.map((transaction) =>
          transaction.id === updatedTransaction.id ? updatedTransaction : transaction
        )
      )
      setEditingTransaction(null)
      toast.success("Transaction updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update transaction."
      )
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleDeleteTransaction() {
    if (!user || !deleteTarget) {
      return
    }

    setIsDeleting(true)

    try {
      await transactionService.deleteTransaction({
        userId: user.id,
        transactionId: deleteTarget.id,
      })

      setLocalTransactions((current) =>
        current.filter((transaction) => transaction.id !== deleteTarget.id)
      )
      setDeleteTarget(null)
      toast.success("Transaction deleted")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete transaction."
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Tabs value={activeType} onValueChange={setActiveType} className="gap-6">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <TabsList>
          <TabsTrigger value="all">
            All <Badge variant="secondary">{transactionCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expense">
            Expenses <Badge variant="secondary">{transactionCounts.expense}</Badge>
          </TabsTrigger>
          <TabsTrigger value="income">
            Income <Badge variant="secondary">{transactionCounts.income}</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <Input
            aria-label="Search transactions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search..."
            className="h-8 w-44"
          />
        </div>
      </div>

      <TabsContent value={activeType} className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getRowModel().rows.length} row(s) selected.
          </div>

          <div className="flex items-center gap-6">
            <div className="text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      <Dialog
        open={editingTransaction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTransaction(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
            <DialogDescription>
              Update the name, amount, type, or date for this transaction.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editType">Type</Label>
                <Select value={editType} onValueChange={(value) => setEditType(value as "expense" | "income")}>
                  <SelectTrigger id="editType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDate">Date</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Uber, Fuel, Shell..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editAmount">Amount</Label>
              <Input
                id="editAmount"
                value={editAmount}
                inputMode="decimal"
                onChange={(event) => setEditAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTransaction(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingEdit}>
                {isSavingEdit ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete transaction?</DialogTitle>
            <DialogDescription>
              This will remove the transaction from your list.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteTransaction()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
