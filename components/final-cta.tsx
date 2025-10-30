"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight } from "lucide-react"

export function FinalCTA() {
  const [email, setEmail] = useState("")

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Newsletter signup:", email)
    // Handle newsletter submission
  }

  return (
    <section className="border-b border-border py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Ready to Give <span className="text-primary">Time Back to Care?</span>
          </h2>
          <p className="mb-10 text-pretty text-lg text-muted-foreground md:text-xl leading-relaxed">
            See for yourself how a 5-minute conversation can transform your compliance workflow, reduce staff burnout,
            and improve your bottom line.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-12">
            <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              Request a Live Demo
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-t border-border pt-12">
            <h3 className="text-xl font-semibold mb-4">Not ready for a demo? Stay updated on our progress.</h3>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
