"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, CheckCircle, AlertCircle } from "lucide-react"
import { submitToGoogleSheets } from "@/lib/google-sheets"
import { DemoModal } from "@/components/demo-modal"

export function FinalCTA() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [honeypot, setHoneypot] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    try {
      const result = await submitToGoogleSheets({
        formType: "newsletter",
        fullName: fullName,
        email: email,
        honeypot: honeypot,
      })

      if (result.success) {
        setSubmitStatus({ type: "success", message: "Thanks for subscribing!" })
        setFullName("")
        setEmail("")
        setHoneypot("")
      } else {
        setSubmitStatus({ type: "error", message: result.message })
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: "An error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
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
              <Button 
                size="lg" 
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setIsDemoModalOpen(true)}
              >
                Request a Live Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="border-t border-border pt-12">
              <h3 className="text-xl font-semibold mb-4">Not ready for a demo? Stay updated on our progress.</h3>
              
              {submitStatus.type === "success" ? (
                <div className="flex items-center justify-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <p className="text-green-700 font-medium">{submitStatus.message}</p>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="space-y-3 max-w-md mx-auto">
                  {/* Honeypot field */}
                  <div className="hidden" aria-hidden="true">
                    <input
                      type="text"
                      name="company"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <Input
                      type="text"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full"
                      disabled={isSubmitting}
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="flex-1"
                        disabled={isSubmitting}
                      />
                      <Button 
                        type="submit" 
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Subscribing..." : "Subscribe"}
                      </Button>
                    </div>
                  </div>

                  {submitStatus.type === "error" && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{submitStatus.message}</p>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <DemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </>
  )
}
