"use client"
import { Mic, CheckCircle, FileCheck } from "lucide-react"
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
              We transform the most time-consuming compliance tasks into a simple, guided conversation.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto mb-20">
          <ScrollReveal delay={0}>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 transition-all hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 duration-500 group">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/50 duration-300">
                <Mic className="h-10 w-10 text-white" />
              </div>
              <h3 className="mb-4 text-2xl font-bold">Speak at the Scene.</h3>
              <p className="text-foreground/70 leading-relaxed text-lg">
                A nurse starts a report by simply describing the incident in their own words, right when it happens. No
                more trying to recall details hours later.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-gradient-to-br from-accent/10 to-accent/5 transition-all hover:shadow-2xl hover:shadow-accent/20 hover:-translate-y-2 duration-500 group relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <VoiceWaveAnimation />
              </div>
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent shadow-lg shadow-accent/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-accent/50 duration-300 relative z-10">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="mb-4 text-2xl font-bold relative z-10">Verify with Intelligence.</h3>
              <p className="text-foreground/70 leading-relaxed text-lg relative z-10">
                Our intelligent system asks the right clarifying questions based on CMS guidelines, ensuring every
                critical detail is captured accurately and completely.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 transition-all hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 duration-500 group">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/50 duration-300">
                <FileCheck className="h-10 w-10 text-white" />
              </div>
              <h3 className="mb-4 text-2xl font-bold">Done. Instantly.</h3>
              <p className="text-foreground/70 leading-relaxed text-lg">
                A perfectly formatted, audit-ready report is generated and filed. What used to take hours is now done in
                minutes, before the nurse even leaves the resident's side.
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
