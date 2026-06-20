import type { ApiBatchProgress } from "./types"
import { BATCH_PROGRESS_THROTTLE_MS } from "./constants"

export function createProgressReporter(
  total: number,
  onProgress?: (progress: ApiBatchProgress) => void
) {
  let completed = 0
  let failed = 0
  let lastEmit = 0

  const emit = (force = false) => {
    if (!onProgress) return
    const now = Date.now()
    if (!force && now - lastEmit < BATCH_PROGRESS_THROTTLE_MS) return
    lastEmit = now
    onProgress({ completed, total, failed })
  }

  return {
    tick(batchFailed: boolean) {
      completed++
      if (batchFailed) failed++
      emit()
    },
    finish() {
      emit(true)
    },
    getSnapshot(): ApiBatchProgress {
      return { completed, total, failed }
    },
  }
}
