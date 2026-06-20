"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Moon, Sun, Code2, GitCompare, FileJson, Diff } from "lucide-react"
import { Button } from "./ui/button"
import { useEffect, useState } from "react"

export function Navigation() {
  const pathname = usePathname()
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isDark = document.documentElement.classList.contains("dark")
    setDarkMode(isDark)
  }, [])

  useEffect(() => {
    if (mounted) {
      if (darkMode) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }, [darkMode, mounted])

  const links = [
    { href: "/converter", label: "Converter", icon: <FileJson className="w-4 h-4" /> },
    { href: "/compare", label: "File Diff", icon: <Diff className="w-4 h-4" /> },
    { href: "/json-compare", label: "JSON Compare", icon: <Code2 className="w-4 h-4" /> },
  ]

  if (!mounted) return null

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-colors duration-300">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-[90rem]">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Code2 className="text-primary w-6 h-6" />
            Tools
          </h1>

          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {links.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-tab"
                      className="absolute inset-0 bg-white dark:bg-gray-700 rounded-md shadow-sm"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {link.icon}
                    {link.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        <Button
          onClick={() => setDarkMode(!darkMode)}
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={darkMode ? "dark" : "light"}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {darkMode ? <Sun className="h-5 w-5 text-gray-200" /> : <Moon className="h-5 w-5 text-gray-700" />}
            </motion.div>
          </AnimatePresence>
        </Button>
      </div>
    </nav>
  )
}

// Added AnimatePresence since we use it above
import { AnimatePresence } from "framer-motion"
