"use client"
import { FileText, Users, DoorOpen, TrendingDown } from "lucide-react"
import { ScrollReveal } from "./scroll-reveal"
import { AnimatedCounter } from "./animated-counter"

export function Problem() {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="mx-auto max-w-4xl text-center mb-16">
            <h2 className="mb-6 text-balance text-4xl font-bold tracking-tight md:text-5xl">
              Your Best Nurses Are Drowning in <span className="text-accent">"The Documentation Drain."</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              You hired them to provide compassionate, hands-on care. But the reality is, they spend up to{" "}
              <strong className="text-foreground">
                <AnimatedCounter end={35} suffix="%" />
              </strong>{" "}
              of their shift on paperwork. This isn't just inefficient; it's the primary driver of the burnout that
              fuels a crippling{" "}
              <strong className="text-foreground">
                <AnimatedCounter end={50} suffix="%+" />
              </strong>{" "}
              annual turnover rate.
            </p>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              With each departing nurse costing over{" "}
              <strong className="text-foreground">
                $<AnimatedCounter end={56000} />
              </strong>{" "}
              to replace, the financial drain is immense.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="mx-auto max-w-3xl">
            <h3 className="text-2xl font-bold text-center mb-8">This creates a vicious cycle:</h3>
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ScrollReveal delay={0}>
                  <div className="flex items-start gap-4 p-6 rounded-xl border border-border bg-background transition-all hover:shadow-lg hover:-translate-y-1 hover:border-destructive/50 duration-300">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 transition-transform hover:scale-110 duration-300">
                      <FileText className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Heavy Documentation</h4>
                      <p className="text-sm text-muted-foreground">
                        Endless paperwork takes nurses away from patient care
                      </p>
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={100}>
                  <div className="flex items-start gap-4 p-6 rounded-xl border border-border bg-background transition-all hover:shadow-lg hover:-translate-y-1 hover:border-destructive/50 duration-300">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 transition-transform hover:scale-110 duration-300">
                      <Users className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Nurse Burnout & Turnover</h4>
                      <p className="text-sm text-muted-foreground">Exhausted staff leave for less demanding roles</p>
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={200}>
                  <div className="flex items-start gap-4 p-6 rounded-xl border border-border bg-background transition-all hover:shadow-lg hover:-translate-y-1 hover:border-destructive/50 duration-300">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 transition-transform hover:scale-110 duration-300">
                      <DoorOpen className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Chronic Understaffing</h4>
                      <p className="text-sm text-muted-foreground">Remaining nurses stretched even thinner</p>
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={300}>
                  <div className="flex items-start gap-4 p-6 rounded-xl border border-border bg-background transition-all hover:shadow-lg hover:-translate-y-1 hover:border-destructive/50 duration-300">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 transition-transform hover:scale-110 duration-300">
                      <TrendingDown className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">More Incidents & Errors</h4>
                      <p className="text-sm text-muted-foreground">Leading to even more documentation</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              {/* Connecting arrows for visual flow */}
              <div className="absolute inset-0 -z-10 hidden md:block pointer-events-none">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M 50 25 Q 75 50 50 75 Q 25 50 50 25"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="text-border animate-pulse"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>
            </div>

            <p className="mt-8 text-center text-lg font-medium text-foreground">
              It's a cycle that costs you money, compromises care, and puts your facility at risk.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
