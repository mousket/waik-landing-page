"use client"
import { Mic, CheckCircle, FileCheck, ClipboardType } from "lucide-react"
import Image from "next/image"
import { ScrollReveal } from "./scroll-reveal"
import { VoiceWaveAnimation } from "./voice-wave-animation"

export function Solution() {
  return (
    <section id="solution" className="py-24 md:py-40 bg-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container mx-auto px-6 relative">
        <ScrollReveal>
          <div className="mx-auto max-w-4xl text-center mb-20">
            <h2 className="mb-8 text-balance text-5xl font-bold tracking-tight md:text-6xl leading-tight">
              Break the Cycle. Turn <span className="text-primary">Conversation into Compliance.</span>
            </h2>
            <p className="text-xl text-foreground/70 leading-relaxed">
              WAiK is not another complex EHR screen. It's an intelligent partner on the phones your staff already use.
              We transform the most time-consuming compliance tasks into a simple, four-step guided conversation.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto mb-20">
          <ScrollReveal delay={0}>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-gradient-to-br from-accent/10 to-accent/5 transition-all hover:shadow-2xl hover:shadow-accent/20 hover:-translate-y-2 duration-500 group h-full">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent shadow-lg shadow-accent/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-accent/50 duration-300">
                <ClipboardType className="h-10 w-10 text-white" />
              </div>
              <h3 className="mb-4 text-2xl font-bold">1. Choose Investigation</h3>
              <p className="text-foreground/70 leading-relaxed text-lg">
                Start by selecting the incident type—from a fall to a sensitive allegation. WAiK instantly loads the
                correct, compliant workflow for that specific event.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 transition-all hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 duration-500 group h-full">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/50 duration-300">
                <Mic className="h-10 w-10 text-white" />
              </div>
              <h3 className="mb-4 text-2xl font-bold">2. Speak at the Scene</h3>
              <p className="text-foreground/70 leading-relaxed text-lg">
                The caregiver describes the incident in their own words, right when it happens. No more trying to recall
                critical details hours later from memory.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-gradient-to-br from-accent/10 to-accent/5 transition-all hover:shadow-2xl hover:shadow-accent/20 hover:-translate-y-2 duration-500 group relative overflow-hidden h-full">
              <div className="absolute inset-0 opacity-10">
                <VoiceWaveAnimation />
              </div>
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent shadow-lg shadow-accent/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-accent/50 duration-300 relative z-10">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="mb-4 text-2xl font-bold relative z-10">3. Verify with Intelligence</h3>
              <p className="text-foreground/70 leading-relaxed text-lg relative z-10">
                Our AI agent asks the right clarifying questions based on the incident type and CMS guidelines, ensuring
                every critical detail is captured accurately.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={450}>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 transition-all hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 duration-500 group h-full">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/50 duration-300">
                <FileCheck className="h-10 w-10 text-white" />
              </div>
              <h3 className="mb-4 text-2xl font-bold">4. Done. Instantly.</h3>
              <p className="text-foreground/70 leading-relaxed text-lg">
                A perfectly formatted, audit-ready report is generated and filed. What used to take hours is now done in
                minutes, before the caregiver even leaves the scene.
              </p>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={400}>
          <div className="mx-auto max-w-5xl">
            <div className="relative aspect-video overflow-hidden rounded-3xl bg-muted shadow-2xl transition-transform hover:scale-[1.02] duration-500">
              <Image
                src="/clean-modern-healthcare-app-interface-on-smartphon.jpg"
                alt="WAiK app interface"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}