"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

export function ROICalculator() {
  const [nurses, setNurses] = useState<number>(15)
  const [turnoverRate, setTurnoverRate] = useState<number>(30)

  const replacementCost = 56300
  const annualCost = Math.round(nurses * (turnoverRate / 100) * replacementCost)

  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-balance text-4xl font-bold tracking-tight md:text-5xl">
            See How Much Nurse Turnover is <span className="text-accent">Costing You Annually.</span>
          </h2>

          <Card className="p-8 mt-12">
            <div className="space-y-6">
              <div>
                <Label htmlFor="nurses" className="text-base font-medium mb-2 block">
                  Number of Nurses at Your Facility:
                </Label>
                <Input
                  id="nurses"
                  type="number"
                  value={nurses}
                  onChange={(e) => setNurses(Number(e.target.value))}
                  className="text-lg h-12"
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="turnover" className="text-base font-medium mb-2 block">
                  Your Estimated Annual Turnover Rate (%):
                </Label>
                <Input
                  id="turnover"
                  type="number"
                  value={turnoverRate}
                  onChange={(e) => setTurnoverRate(Number(e.target.value))}
                  className="text-lg h-12"
                  min="0"
                  max="100"
                />
              </div>

              <div className="pt-6 border-t border-border">
                <h3 className="text-xl font-semibold mb-3">Your Estimated Annual Cost of Nurse Turnover:</h3>
                <p className="text-5xl font-bold text-primary mb-2">${annualCost.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  *Based on an average replacement cost of ${replacementCost.toLocaleString()} per nurse.
                </p>
              </div>
            </div>
          </Card>

          <p className="mt-8 text-center text-lg text-muted-foreground leading-relaxed">
            This is the hidden cost that drains your budget and compromises care. WAiK is the first tool designed to
            directly combat the documentation burden that causes burnout, helping you retain your most valuable asset:
            your experienced staff.
          </p>
        </div>
      </div>
    </section>
  )
}
