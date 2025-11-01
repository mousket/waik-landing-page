"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, CheckCircle, AlertCircle } from "lucide-react"
import { submitToGoogleSheets } from "@/lib/google-sheets"

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    role: "",
    email: "",
    facilityName: "",
    phone: "",
    honeypot: "", // Spam protection
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  // Clear timeout when modal closes
  useEffect(() => {
    if (!isOpen && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    try {
      const result = await submitToGoogleSheets({
        formType: "demo",
        fullName: formData.fullName,
        role: formData.role,
        email: formData.email,
        facilityName: formData.facilityName,
        phone: formData.phone,
        honeypot: formData.honeypot,
      })

      if (result.success) {
        setSubmitStatus({ type: "success", message: result.message })
        // Reset form after 2 seconds and close modal
        timeoutRef.current = setTimeout(() => {
          setFormData({
            fullName: "",
            role: "",
            email: "",
            facilityName: "",
            phone: "",
            honeypot: "",
          })
          setSubmitStatus({ type: null, message: "" })
          onClose()
          timeoutRef.current = null
        }, 2000)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Request a Demo</h2>
          <p className="text-gray-600">
            See how WAiK can transform your facility's documentation workflow in just 5 minutes.
          </p>
        </div>

        {submitStatus.type === "success" ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg text-center text-gray-700">{submitStatus.message}</p>
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
              <Label htmlFor="demo-fullName" className="text-base font-medium">
                Full Name *
              </Label>
              <Input
                id="demo-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="mt-2 h-12 rounded-xl"
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="demo-role" className="text-base font-medium">
                Role/Title *
              </Label>
              <Input
                id="demo-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
                className="mt-2 h-12 rounded-xl"
                placeholder="Director of Nursing, Administrator, etc."
              />
            </div>

            <div>
              <Label htmlFor="demo-email" className="text-base font-medium">
                Work Email *
              </Label>
              <Input
                id="demo-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-2 h-12 rounded-xl"
                placeholder="john@facility.com"
              />
            </div>

            <div>
              <Label htmlFor="demo-facilityName" className="text-base font-medium">
                Facility Name *
              </Label>
              <Input
                id="demo-facilityName"
                value={formData.facilityName}
                onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                required
                className="mt-2 h-12 rounded-xl"
                placeholder="Your Facility Name"
              />
            </div>

            <div>
              <Label htmlFor="demo-phone" className="text-base font-medium">
                Phone Number *
              </Label>
              <Input
                id="demo-phone"
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
              className="w-full h-12 bg-primary text-white hover:bg-primary/90 font-semibold text-lg rounded-xl shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Request Demo"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
