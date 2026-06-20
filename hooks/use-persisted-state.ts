"use client"

import { useEffect, useState } from "react"
import {
  clearPersistedContent,
  loadPersistedContent,
  savePersistedContent,
  type ContentKey,
} from "@/lib/content-persistence"

export function usePersistedState(key: ContentKey, initialValue = "") {
  const [value, setValue] = useState(initialValue)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setValue(loadPersistedContent(key))
    setLoaded(true)
  }, [key])

  useEffect(() => {
    if (!loaded) return

    const timer = window.setTimeout(() => {
      savePersistedContent(key, value)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [key, value, loaded])

  const clearValue = () => {
    setValue(initialValue)
    clearPersistedContent(key)
  }

  return [value, setValue, clearValue] as const
}
