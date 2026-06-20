import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CIC - PCB Converter'
}

import { Navigation } from "@/components/navigation"
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Navigation />
        <main className="container mx-auto p-6 max-w-[90rem]">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  )
}
