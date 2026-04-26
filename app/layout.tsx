import type React from "react"
import type { Metadata, Viewport } from "next"
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Plus_Jakarta_Sans, Inter } from "next/font/google"

import { ConditionalRootHeader } from "@/components/conditional-root-header"
import { SignedOutHeaderSignIn } from "@/components/signed-out-header-sign-in"
import { PwaProviders } from "@/components/pwa-providers"
import { clerkAppearance } from "@/lib/clerk-appearance"
import { getClerkAfterSignOutUrl, getClerkPostAuthUrl } from "@/lib/clerk-routes"
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
  const vercelUrlEnv = process.env.NEXT_PUBLIC_VERCEL_URL
  if (process.env.VERCEL_URL && vercelUrlEnv && vercelUrlEnv.trim() !== "") {
    const vercelUrl = `https://${process.env.VERCEL_URL}`
    if (isValidUrl(vercelUrl)) {
      return vercelUrl
    }
  }

  // 3. Local development fallback
  return "http://localhost:3000"
}

const siteUrl = getSiteUrl()

const clerkPostAuthUrl = getClerkPostAuthUrl()
const clerkAfterSignOutUrl = getClerkAfterSignOutUrl()

export const metadata: Metadata = {
  applicationName: "WAiK",
  title: "WAiK - Voice-First Documentation and Reporting for Healthcare Incidents",
  description:
    "Stay Audit ready and Turn critical incident documentation and reports into a 5-minute conversation. Give your nurses and staff back hundreds of hours and slash compliance risk.",
  generator: "v0.app",
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WAiK",
  },
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

export const viewport: Viewport = {
  themeColor: "#0D7377",
  colorScheme: "light",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} ${inter.variable} font-sans antialiased`}>
        <ClerkProvider
          appearance={clerkAppearance}
          signInForceRedirectUrl={clerkPostAuthUrl}
          signUpForceRedirectUrl={clerkPostAuthUrl}
          afterSignOutUrl={clerkAfterSignOutUrl}
        >
          <PwaProviders />
          <ConditionalRootHeader>
            <SignedOut>
              <SignedOutHeaderSignIn />
            </SignedOut>
            <SignedIn>
              <UserButton appearance={clerkAppearance} afterSignOutUrl={clerkAfterSignOutUrl} />
            </SignedIn>
          </ConditionalRootHeader>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
