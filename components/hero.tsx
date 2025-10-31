"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { VoiceWaveAnimation } from "./voice-wave-animation"
import { AnimatedCounter } from "./animated-counter"
import { ScrollReveal } from "./scroll-reveal"
import { DemoModal } from "./demo-modal"

export function Hero() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  return (
    <section className="relative overflow-hidden py-24 md:py-40">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <div className="container mx-auto px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 items-center">
          <ScrollReveal>
            <div className="max-w-2xl">
              <h1 className="mb-8 text-balance text-6xl font-bold tracking-tight md:text-7xl lg:text-8xl leading-[1.1]">
                The 2-Hour Incident Report is <span className="text-primary">Obsolete.</span>
              </h1>

              <p className="mb-10 text-pretty text-xl text-foreground/70 md:text-2xl leading-relaxed">
                Give your nurses back hundreds of hours and slash compliance risk. WAiK is the voice-first intelligent
                assistant that turns critical incident documentation into a 5-minute conversation, right at the scene.
              </p>

              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 shadow-xl shadow-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/40 hover:scale-105"
                  onClick={() => setIsDemoModalOpen(true)}
                >
                  Request a Demo
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Link href="#vanguard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 text-lg px-8 py-6 border-2 bg-transparent transition-all hover:bg-primary/5 hover:border-primary hover:scale-105"
                  >
                    Apply for Vanguard Pilot
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="relative">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-full h-32 opacity-50">
                <VoiceWaveAnimation />
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted shadow-2xl transition-transform hover:scale-[1.02] duration-500">
                <Image
                  src="/professional-nurse-using-smartphone-in-bright-hosp.jpg"
                  alt="Nurse using WAiK app in hospital"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="absolute -bottom-8 -right-8 rounded-2xl bg-gradient-to-br from-accent to-accent/80 p-6 shadow-2xl transition-all hover:scale-105 hover:shadow-accent/50 duration-300">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                    <span className="text-4xl font-bold text-white">
                      <AnimatedCounter end={5} />
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">Minutes</p>
                    <p className="text-sm text-white/80">Average report time</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      <DemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </section>
  )
}
