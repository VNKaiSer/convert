export interface DiffLine {
    type: "added" | "removed" | "unchanged"
    content: string
    lineNumber?: number
  }
  
  export const createDiff = (text1: string, text2: string): DiffLine[] => {
    const lines1 = text1.split("\n")
    const lines2 = text2.split("\n")
  
    const lcs = (a: string[], b: string[]): number[][] => {
      const m = a.length
      const n = b.length
      const dp: number[][] = Array(m + 1)
        .fill(null)
        .map(() => Array(n + 1).fill(0))
  
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (a[i - 1] === b[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
          }
        }
      }
      return dp
    }
  
    const buildDiff = (a: string[], b: string[], dp: number[][]): DiffLine[] => {
      const result: DiffLine[] = []
      let i = a.length
      let j = b.length
      let lineNum1 = a.length
      let lineNum2 = b.length
  
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
          result.unshift({
            type: "unchanged",
            content: a[i - 1],
            lineNumber: lineNum1,
          })
          i--
          j--
          lineNum1--
          lineNum2--
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
          result.unshift({
            type: "added",
            content: b[j - 1],
            lineNumber: lineNum2,
          })
          j--
          lineNum2--
        } else if (i > 0) {
          result.unshift({
            type: "removed",
            content: a[i - 1],
            lineNumber: lineNum1,
          })
          i--
          lineNum1--
        }
      }
  
      return result
    }
  
    const dp = lcs(lines1, lines2)
    return buildDiff(lines1, lines2, dp)
  }
  