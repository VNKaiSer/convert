export const EXAMPLE_JSON_1 = {
  systemCode: "SUCCESS",
  data: {
    loans: [
      {
        remainingTenor: -2,
        source: "WEB_PARTNER",
        worstStatus: 1,
        outstanding: 32072032,
      },
    ],
    bureauInfo: {
      creditCardLimitAvgL3m: 0,
      unsecuredOsCeplLoanAtCimb: 0,
    },
  },
  message: "system-code-SUCCESS",
}

export const EXAMPLE_JSON_2 = {
  success: true,
  data: {
    loans: [
      {
        remainingTenor: 24,
        source: "WEB PARTNER",
        worstStatus: "1",
        outstanding: 32072032.0,
      },
    ],
    bureauInfo: {
      creditCardLimitAvgL3M: 0.0,
      unsecuredOsCEPLLoanAtCimb: 0,
    },
  },
  message: "Cimb model mapping successfully",
}

export const TEMP_FILE_NAMES = {
  1: "temp/response-endpoint-1.json",
  2: "temp/response-endpoint-2.json",
} as const

/** Above this line count, editor uses lite mode (no per-line gutter/highlights) */
export const LARGE_JSON_LINE_THRESHOLD = 400

/** Diff table rows rendered per page */
export const DIFF_PAGE_SIZE = 100

/** Throttle progress UI updates (ms) */
export const BATCH_PROGRESS_THROTTLE_MS = 120
