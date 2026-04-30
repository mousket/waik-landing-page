"use client"
import { useState } from "react"
import Link from "next/link"
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { DemoModal } from "@/components/demo-modal"

import { LandingUserButton } from "@/components/landing-user-button"
import { WaikLogo } from "@/components/waik-logo"

export function Header() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <WaikLogo href="/" size="xl" priority />

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#solution"
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              Solution
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#vanguard"
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              Vanguard Program
            </Link>
            <Link
              href="#about"
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              About
            </Link>
          </nav>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link href="#vanguard" className="hidden md:inline-flex">
              <Button variant="ghost" size="lg" className="font-medium text-foreground/80 hover:text-foreground">
                Apply for Pilot
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-primary/35 bg-background font-semibold text-primary shadow-sm hover:bg-primary/[0.06]"
              onClick={() => setIsDemoModalOpen(true)}
            >
              Request a Demo
            </Button>
            <SignedIn>
              <LandingUserButton />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  size="lg"
                  className="min-h-12 min-w-[6.5rem] bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/20 hover:bg-primary/90 sm:min-w-[7.5rem]"
                >
                  Sign in
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </header>

      <DemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </>
  )
}
