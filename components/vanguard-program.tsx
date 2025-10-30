"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"

export function VanguardProgram() {
  const [formData, setFormData] = useState({
    fullName: "",
    role: "",
    facilityName: "",
    email: "",
    phone: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Vanguard application submitted:", formData)
    // Handle form submission
  }

  return (
    <section id="vanguard" className="py-24 md:py-40 bg-gradient-to-br from-primary/10 via-accent/10 to-background">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="mb-8 text-balance text-5xl font-bold tracking-tight md:text-6xl leading-tight">
              Become a Founding Partner: <span className="text-primary">Join the WAiK Vanguard Program.</span>
            </h2>
            <p className="text-xl text-foreground/70 leading-relaxed max-w-4xl mx-auto">
              We are inviting a select group of{" "}
              <strong className="text-foreground">10 innovative senior care facilities</strong> to partner with us in
              our exclusive Vanguard Program. As a founding partner, you'll save time and money while helping shape the
              future of healthcare documentation.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 mb-12">
            <Card className="p-10 bg-white shadow-xl rounded-3xl border-0">
              <h3 className="text-3xl font-bold mb-8">Benefits for Vanguard Partners:</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg mb-1">Shape the Product</p>
                    <p className="text-foreground/70 leading-relaxed">
                      Your direct feedback will guide our feature development.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg mb-1">Lifetime 50% Discount</p>
                    <p className="text-foreground/70 leading-relaxed">
                      Lock in a permanent 50% discount on all WAiK services, forever.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg mb-1">Dedicated Onboarding & Support</p>
                    <p className="text-foreground/70 leading-relaxed">
                      We'll work hand-in-hand with your team to ensure a seamless and successful rollout.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-10 bg-white shadow-xl rounded-3xl border-0">
              <h3 className="text-2xl font-bold mb-8">Apply for one of the limited pilot spots today.</h3>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="fullName" className="text-base font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="mt-2 h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-base font-medium">
                    Role (Director, Administrator, Owner, etc.)
                  </Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                    className="mt-2 h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="facilityName" className="text-base font-medium">
                    Facility Name
                  </Label>
                  <Input
                    id="facilityName"
                    value={formData.facilityName}
                    onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                    required
                    className="mt-2 h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-base font-medium">
                    Work Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="mt-2 h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-base font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="mt-2 h-12 rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-accent text-white hover:bg-accent/90 font-semibold text-lg rounded-xl shadow-lg shadow-accent/30"
                >
                  Apply for the Vanguard Program
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
