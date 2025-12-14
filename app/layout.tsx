import type React from "react"
import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Inter } from "next/font/google"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

// Automatically detect the correct URL for different environments
const getSiteUrl = () => {
  // Helper function to validate URL
  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim() === "") return false
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // 1. Explicit environment variable (set in Vercel or .env.local)
  if (process.env.NEXT_PUBLIC_SITE_URL && isValidUrl(process.env.NEXT_PUBLIC_SITE_URL)) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // 2. Vercel preview/production deployments (automatic)
  if (process.env.VERCEL_URL && process.env.NEXT_PUBLIC_VERCEL_URL.trim() !== "") {
    const vercelUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    if (isValidUrl(vercelUrl)) {
      return vercelUrl
    }
  }

  // 3. Local development fallback
  return "http://localhost:3000"
}

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: "WAiK - Voice-First Documentation and Reporting for Healthcare Incidents",
  description:
    "Stay Audit ready and Turn critical incident documentation and reports into a 5-minute conversation. Give your nurses and staff back hundreds of hours and slash compliance risk.",
  generator: "v0.app",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "WAiK - Voice-First Documentation and Reporting for Healthcare Incidents",
    description:
      "Stay Audit ready and Turn critical incident documentation and reports into a 5-minute conversation. Give your nurses and staff back hundreds of hours and slash compliance risk.",
    url: siteUrl,
    siteName: "WAiK",
    images: [
      {
        url: "/waik-logo.png",
        width: 1200,
        height: 630,
        alt: "WAiK - Voice-First Documentation and Reporting for Healthcare Incidents",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WAiK - Voice-First Documentation and Reporting for Healthcare Incidents",
    description:
      "Stay Audit ready and Turn critical incident documentation and reports into a 5-minute conversation. Give your nurses and staff back hundreds of hours and slash compliance risk.",
    images: ["/waik-logo.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} ${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
