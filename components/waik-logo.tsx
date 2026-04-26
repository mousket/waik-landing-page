"use client"

import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

const HEIGHT = {
  xs: "h-5", // ~20px — tight UI (e.g. tabs)
  sm: "h-7", // ~28px
  md: "h-8", // ~32px — staff app bar
  lg: "h-9", // ~36px — admin / super admin
  xl: "h-10", // ~40px — marketing header
} as const

export type WaikLogoSize = keyof typeof HEIGHT

type WaikLogoProps = {
  /** When set, logo is wrapped in a link (e.g. home / dashboard) */
  href?: string
  className?: string
  size?: WaikLogoSize
  /** Use on LCP / above-the-fold */
  priority?: boolean
}

/**
 * Wordmark at `public/waik-logo.png` — same asset as the marketing site header.
 */
export function WaikLogo({ href, className, size = "md", priority = false }: WaikLogoProps) {
  const h = HEIGHT[size]
  const img = (
    <Image
      src="/waik-logo.png"
      alt="WAiK"
      width={100}
      height={40}
      className={cn("w-auto", h, className)}
      priority={priority}
    />
  )
  if (href) {
    return (
      <Link href={href} className="inline-flex max-w-full shrink-0 items-center" aria-label="WAiK home">
        {img}
      </Link>
    )
  }
  return <span className="inline-flex max-w-full shrink-0 items-center">{img}</span>
}
