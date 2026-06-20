"use client"

import type React from "react"
import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface LineHighlightStyle {
  line: number
  className: string
}

export interface TextareaWithLineNumbersHandle {
  scrollToLine: (line: number) => void
}

interface TextareaWithLineNumbersProps {
  value: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder: string
  className: string
  readOnly?: boolean
  wordWrap?: boolean
  highlightedLines?: LineHighlightStyle[]
  activeLine?: number
  /** Skip per-line gutter/highlights for very large JSON */
  liteMode?: boolean
}

const LINE_HEIGHT = "1.25rem"

function getLineOffsets(text: string, line: number): { start: number; end: number } {
  let start = 0
  let currentLine = 1

  while (currentLine < line && start < text.length) {
    const nextNewline = text.indexOf("\n", start)
    if (nextNewline === -1) {
      start = text.length
      break
    }
    start = nextNewline + 1
    currentLine++
  }

  const nextNewline = text.indexOf("\n", start)
  const end = nextNewline === -1 ? text.length : nextNewline

  return { start, end }
}

function scrollTextareaToLine(textarea: HTMLTextAreaElement, line: number) {
  if (line < 1) return

  const { start, end } = getLineOffsets(textarea.value, line)

  textarea.focus({ preventScroll: false })
  textarea.setSelectionRange(start, end)

  const style = window.getComputedStyle(textarea)
  const lineHeight = Number.parseFloat(style.lineHeight) || 20
  const paddingTop = Number.parseFloat(style.paddingTop) || 0
  const targetTop = (line - 1) * lineHeight
  textarea.scrollTop = Math.max(0, targetTop - textarea.clientHeight / 2 + lineHeight / 2 + paddingTop)
}

export const TextareaWithLineNumbers = forwardRef<
  TextareaWithLineNumbersHandle,
  TextareaWithLineNumbersProps
>(function TextareaWithLineNumbers(
  {
    value,
    onChange,
    placeholder,
    className,
    readOnly = false,
    wordWrap = false,
    highlightedLines = [],
    activeLine,
    liteMode = false,
  },
  ref
) {
  const lines = liteMode ? [] : value ? value.split("\n") : [""]
  const lineNumbers = lines.map((_, index) => index + 1)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const highlightMap = new Map(highlightedLines.map((item) => [item.line, item.className]))
  const activeLineClass =
    activeLine && highlightMap.get(activeLine)
      ? highlightMap.get(activeLine)
      : "bg-blue-200/60 dark:bg-blue-900/40"

  const syncGutterScroll = (top: number) => {
    setScrollTop(top)
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = top
    if (highlightRef.current) highlightRef.current.scrollTop = top
  }

  useImperativeHandle(ref, () => ({
    scrollToLine: (line: number) => {
      const textarea = textareaRef.current
      if (!textarea) return
      scrollTextareaToLine(textarea, line)
      syncGutterScroll(textarea.scrollTop)
    },
  }))

  useEffect(() => {
    if (activeLine && activeLine > 0) {
      const timer = setTimeout(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        scrollTextareaToLine(textarea, activeLine)
        syncGutterScroll(textarea.scrollTop)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [activeLine, value])

  const handleScroll = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const top = textarea.scrollTop
    setScrollTop(top)
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = top
    if (highlightRef.current) highlightRef.current.scrollTop = top
  }

  return (
    <div className="relative">
      {!wordWrap && !liteMode && (
        <div
          ref={lineNumbersRef}
          className="absolute left-0 top-0 bottom-0 w-12 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col text-xs text-gray-500 dark:text-gray-400 font-mono z-10 pointer-events-none overflow-hidden"
        >
          <div className="px-2 py-2">
            {lineNumbers.map((lineNum) => (
              <div
                key={lineNum}
                className={cn(
                  "h-5 flex items-center justify-end leading-5 rounded-l-sm",
                  highlightMap.get(lineNum),
                  activeLine === lineNum && "ring-1 ring-inset ring-blue-500 font-semibold text-blue-700 dark:text-blue-300"
                )}
              >
                {lineNum}
              </div>
            ))}
          </div>
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={cn(
          className,
          "font-mono relative z-[1]",
          !wordWrap && !liteMode && "pl-14",
          liteMode && activeLine && "selection:bg-blue-300/50 dark:selection:bg-blue-700/50",
          "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
        )}
        style={{
          whiteSpace: wordWrap ? "pre-wrap" : "pre",
          overflowWrap: wordWrap ? "break-word" : "normal",
          lineHeight: LINE_HEIGHT,
        }}
        readOnly={readOnly}
        spellCheck={false}
      />

      {!liteMode && (highlightedLines.length > 0 || activeLine) && (
        <div
          ref={highlightRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 bottom-0 overflow-hidden z-[2]",
            !wordWrap ? "left-12 right-0" : "left-0 right-0"
          )}
        >
          <div className="px-3 py-2">
            {lines.map((_, index) => {
              const lineNum = index + 1
              const highlightClass = highlightMap.get(lineNum)
              const isActive = activeLine === lineNum
              if (!highlightClass && !isActive) {
                return <div key={lineNum} className="h-5 leading-5" />
              }
              return (
                <div
                  key={lineNum}
                  className={cn(
                    "h-5 leading-5 rounded-sm",
                    highlightClass,
                    isActive && "ring-1 ring-inset ring-blue-500 bg-blue-100/50 dark:bg-blue-900/25"
                  )}
                />
              )
            })}
          </div>
        </div>
      )}

      {liteMode && activeLine && activeLine > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0 left-0 right-0 overflow-hidden z-[2]"
        >
          <div
            className="absolute left-0 right-0 px-3 py-2"
            style={{ transform: `translateY(-${scrollTop}px)` }}
          >
            <div
              className={cn(
                "h-5 leading-5 rounded-sm ring-2 ring-inset ring-blue-500",
                activeLineClass
              )}
              style={{ marginTop: `${(activeLine - 1) * 20}px` }}
            />
          </div>
        </div>
      )}
    </div>
  )
})
