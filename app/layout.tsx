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
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  title: "WAiK - Voice-First AI for Healthcare Documentation",
  description:
    "Stay Audit ready and Turn critical incident documentation and reports into a 5-minute conversation. Give your nurses and staff back hundreds of hours and slash compliance risk.",
  generator: "v0.app",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://waik.care"),
  openGraph: {
    title: "WAiK - Voice-First AI for Healthcare Documentation",
    description:
      "Stay Audit ready and Turn critical incident documentation and reports into a 5-minute conversation. Give your nurses and staff back hundreds of hours and slash compliance risk.",
    url: "https://waik.care",
    siteName: "WAiK",
    images: [
      {
        url: "/waik-logo.png",
        width: 1200,
        height: 630,
        alt: "WAiK - Voice-First AI for Healthcare Documentation",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WAiK - Voice-First AI for Healthcare Documentation",
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
