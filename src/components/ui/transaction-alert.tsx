"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

interface TransactionAlertProps {
  title?: string
  description?: string
  isMobile?: boolean
}

export function TransactionAlert({ 
  title = "Transaction Pending", 
  description = "Please approve the transaction in your wallet", 
  isMobile = false
}: TransactionAlertProps) {
  return (
    <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900 mb-4">
      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-800 dark:text-blue-300">{title}</AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-400">
        {description}
        {isMobile && (
          <span className="block mt-1 font-medium">
            Please check your wallet app for the transaction confirmation.
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
} 