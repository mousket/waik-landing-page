"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Check, CheckCircle, AlertCircle } from "lucide-react"
import { submitToGoogleSheets } from "@/lib/public-forms"

export function VanguardProgram() {
  const [formData, setFormData] = useState({
    fullName: "",
    role: "",
    facilityName: "",
    email: "",
    phone: "",
    honeypot: "", // Spam protection
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    try {
      const result = await submitToGoogleSheets({
        formType: "vanguard",
        fullName: formData.fullName,
        role: formData.role,
        facilityName: formData.facilityName,
        email: formData.email,
        phone: formData.phone,
        honeypot: formData.honeypot,
      })

      if (result.success) {
        setSubmitStatus({ type: "success", message: result.message })
        // Reset form after success
        setFormData({
          fullName: "",
          role: "",
          facilityName: "",
          email: "",
          phone: "",
          honeypot: "",
        })
      } else {
        setSubmitStatus({ type: "error", message: result.message })
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
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
              
              {submitStatus.type === "success" ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                  <p className="text-lg text-center text-gray-700 mb-2 font-semibold">
                    Application Submitted!
                  </p>
                  <p className="text-center text-gray-600">{submitStatus.message}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Honeypot field - hidden from users, visible to bots */}
                  <div className="hidden" aria-hidden="true">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="text"
                      value={formData.honeypot}
                      onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

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
                      placeholder="John Doe"
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
                      placeholder="e.g., Director of Nursing"
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
                      placeholder="Your Facility Name"
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
                      placeholder="john@facility.com"
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
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  {submitStatus.type === "error" && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{submitStatus.message}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-accent text-white hover:bg-accent/90 font-semibold text-lg rounded-xl shadow-lg shadow-accent/30 disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Apply for the Vanguard Program"}
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
