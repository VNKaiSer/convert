"use client"

import { motion } from "framer-motion"
import type { CompareSummary } from "@/lib/json-compare/types"

interface SummaryBannerProps {
  summary: CompareSummary
}

export function SummaryBanner({ summary }: SummaryBannerProps) {
  const className =
    summary.type === "ok"
      ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900 dark:text-green-400"
      : summary.type === "warn"
        ? "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-900 dark:text-orange-400"
        : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400"

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={`p-4 rounded-lg border text-sm font-medium ${className}`}
    >
      {summary.message}
    </motion.div>
  )
}
