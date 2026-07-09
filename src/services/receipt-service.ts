import { supabase } from "@/lib/supabase"

const receiptsBucketName = "receipts"
const maxReceiptFileSize = 10 * 1024 * 1024
const allowedReceiptMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf",
])

export type Receipt = {
  id: string
  user_id: string
  storage_path: string
  bucket_name: string
  original_filename: string | null
  mime_type: string | null
  file_size: number | null
  uploaded_at: string
  created_at: string
}

export type ReceiptWithTransaction = Receipt & {
  transaction_id: string | null
}

export type UploadReceiptInput = {
  userId: string
  file: File
}

export type DeleteReceiptInput = {
  userId: string
  receipt: Receipt
}

function toError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error("Something went wrong")
}

function getSafeFileName(fileName: string) {
  const normalizedName = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, "-")
  const safeName = normalizedName.replace(/^-+|-+$/g, "")

  return safeName || "receipt"
}

export const receiptService = {
  async listReceipts(userId: string): Promise<ReceiptWithTransaction[]> {
    const [receiptsResult, transactionsResult] = await Promise.all([
      supabase
        .from("receipts")
        .select(
          "id,user_id,storage_path,bucket_name,original_filename,mime_type,file_size,uploaded_at,created_at"
        )
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id,receipt_id")
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .not("receipt_id", "is", null),
    ])

    if (receiptsResult.error) {
      throw toError(receiptsResult.error)
    }

    if (transactionsResult.error) {
      throw toError(transactionsResult.error)
    }

    const transactionByReceiptId = new Map(
      (transactionsResult.data ?? []).map((transaction) => [
        transaction.receipt_id,
        transaction.id,
      ])
    )

    return (receiptsResult.data ?? []).map((receipt) => ({
      ...(receipt as Receipt),
      transaction_id: transactionByReceiptId.get(receipt.id) ?? null,
    }))
  },

  validateFile(file: File) {
    if (!allowedReceiptMimeTypes.has(file.type)) {
      throw new Error("Upload a PNG, JPG, or PDF file.")
    }

    if (file.size > maxReceiptFileSize) {
      throw new Error("File must be 10MB or smaller.")
    }
  },

  async uploadReceipt({ userId, file }: UploadReceiptInput): Promise<Receipt> {
    this.validateFile(file)

    const storagePath = `${userId}/receipts/${Date.now()}-${getSafeFileName(
      file.name
    )}`
    const { error: uploadError } = await supabase.storage
      .from(receiptsBucketName)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw toError(uploadError)
    }

    const { data, error } = await supabase
      .from("receipts")
      .insert({
        user_id: userId,
        storage_path: storagePath,
        bucket_name: receiptsBucketName,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
      })
      .select(
        "id,user_id,storage_path,bucket_name,original_filename,mime_type,file_size,uploaded_at,created_at"
      )
      .single()

    if (error) {
      throw toError(error)
    }

    return data as Receipt
  },

  async deleteReceipt({ userId, receipt }: DeleteReceiptInput) {
    const { error: storageError } = await supabase.storage
      .from(receipt.bucket_name || receiptsBucketName)
      .remove([receipt.storage_path])

    if (storageError) {
      throw toError(storageError)
    }

    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", receipt.id)
      .eq("user_id", userId)

    if (error) {
      throw toError(error)
    }
  },
}
