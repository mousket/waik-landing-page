"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, HeartPulse, Pill, ShieldAlert, ShieldHalf, Gavel, FileText } from "lucide-react"
import { ScrollReveal } from "./scroll-reveal"

export function Features() {
  return (
    <section id="features" className="py-24 md:py-40 bg-gradient-to-b from-muted/50 to-background">
      <div className="container mx-auto px-6">
        <ScrollReveal>
          <div className="mx-auto mb-20 max-w-4xl text-center">
            <h2 className="mb-6 text-balance text-5xl font-bold tracking-tight md:text-6xl leading-tight">
              Your Complete <span className="text-primary">Risk & Compliance Engine.</span>
            </h2>
            <p className="text-pretty text-xl text-foreground/70 leading-relaxed">
              From falls and injuries to the most sensitive allegations, WAiK provides a voice-driven, guided workflow to
              ensure every administrative investigation is fast, thorough, and audit-ready.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="mx-auto max-w-6xl">
            <Tabs defaultValue="falls" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 h-auto bg-muted/50 p-2 rounded-2xl">
                <TabsTrigger
                  value="falls"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <AlertCircle className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Fall Investigations</span>
                </TabsTrigger>
                <TabsTrigger
                  value="injury"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <HeartPulse className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Injury Reports</span>
                </TabsTrigger>
                <TabsTrigger
                  value="medication"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <Pill className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Medication Errors</span>
                </TabsTrigger>
                <TabsTrigger
                  value="resident-conflict"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <ShieldAlert className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Resident Conflicts</span>
                </TabsTrigger>
                <TabsTrigger
                  value="staff-incident"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <ShieldHalf className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Staff Incidents</span>
                </TabsTrigger>
                <TabsTrigger
                  value="abuse-allegations"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <Gavel className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Abuse Allegations</span>
                </TabsTrigger>
                <TabsTrigger
                  value="custom"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <FileText className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Custom Forms</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="falls" className="mt-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <Card className="border-0 shadow-xl rounded-3xl transition-all hover:shadow-2xl duration-300">
                  <CardContent className="p-10">
                    <h3 className="text-3xl font-bold mb-6">Fall Investigations</h3>
                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                      Transform the most complex report into a simple, guided conversation. Capture everything from
                      environmental factors to vital signs at the scene, and let WAiK manage the required 72-hour
                      follow-ups automatically.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Context-Aware Questions</p>
                          <p className="text-sm text-muted-foreground">AI asks specific questions for falls from a bed vs. a wheelchair.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Point-of-Care Capture</p>
                          <p className="text-sm text-muted-foreground">Eliminate memory recall errors by documenting at the scene.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Automated Follow-ups</p>
                          <p className="text-sm text-muted-foreground">Manages the entire 72-hour post-fall monitoring process.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Audit-Ready Reports</p>
                          <p className="text-sm text-muted-foreground">Generate complete, CMS-compliant reports instantly.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="injury" className="mt-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <Card className="border-0 shadow-xl rounded-3xl transition-all hover:shadow-2xl duration-300">
                  <CardContent className="p-10">
                    <h3 className="text-3xl font-bold mb-6">Injury & Wound Reports</h3>
                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                      Go beyond a simple incident report. Document the initial injury, track wound or bruise progression
                      over time with guided voice notes, and create a complete, defensible timeline of care for every
                      shift.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Longitudinal Tracking</p>
                          <p className="text-sm text-muted-foreground">Document wound state and measurements over time.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Guided Assessment</p>
                          <p className="text-sm text-muted-foreground">AI prompts for tissue type, drainage, and other key details.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Defensible Timeline</p>
                          <p className="text-sm text-muted-foreground">Create a clear, time-stamped record of care progression.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Photo Integration</p>
                          <p className="text-sm text-muted-foreground">Securely attach images to your voice-captured notes.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="medication" className="mt-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <Card className="border-0 shadow-xl rounded-3xl transition-all hover:shadow-2xl duration-300">
                  <CardContent className="p-10">
                    <h3 className="text-3xl font-bold mb-6">Medication Errors</h3>
                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                      Ensure every medication error is documented with precision and speed. WAiK guides staff through the
                      critical steps, ensuring physician notification is logged and a thorough report is ready for root
                      cause analysis.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Guided Workflow</p>
                          <p className="text-sm text-muted-foreground">Ensures all required steps are followed and documented.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Physician Notification Log</p>
                          <p className="text-sm text-muted-foreground">Creates an auditable record of all communications.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Error Classification</p>
                          <p className="text-sm text-muted-foreground">AI helps categorize the error for better analysis.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Root Cause Analysis Prep</p>
                          <p className="text-sm text-muted-foreground">Captures the data needed for quality improvement.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resident-conflict" className="mt-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <Card className="border-0 shadow-xl rounded-3xl transition-all hover:shadow-2xl duration-300">
                  <CardContent className="p-10">
                    <h3 className="text-3xl font-bold mb-6">Resident-to-Resident Incidents</h3>
                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                      Capture neutral, fact-based accounts of resident altercations or negative behaviors. Our guided
                      process ensures all perspectives are documented fairly, providing a clear record for intervention
                      and care planning.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Objective Reporting</p>
                          <p className="text-sm text-muted-foreground">AI prompts focus on facts, not blame.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Multi-Perspective Capture</p>
                          <p className="text-sm text-muted-foreground">Easily add statements from all involved parties.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Behavioral Analysis</p>
                          <p className="text-sm text-muted-foreground">Track trends to inform care plan adjustments.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Intervention Documentation</p>
                          <p className="text-sm text-muted-foreground">Log the actions taken to de-escalate and resolve.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="staff-incident" className="mt-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <Card className="border-0 shadow-xl rounded-3xl transition-all hover:shadow-2xl duration-300">
                  <CardContent className="p-10">
                    <h3 className="text-3xl font-bold mb-6">Resident-to-Staff Incidents</h3>
                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                      Protect your staff and your facility. Provide a safe, structured, and immediate way for caregivers
                      to document negative interactions, creating the necessary HR records for follow-up and ensuring
                      your team feels heard and supported.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Staff Protection</p>
                          <p className="text-sm text-muted-foreground">Empower staff to report incidents safely and easily.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">HR Compliance</p>
                          <p className="text-sm text-muted-foreground">Create time-stamped records for HR investigations.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Confidential Reporting</p>
                          <p className="text-sm text-muted-foreground">Ensure privacy and security for sensitive reports.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Support Staff Well-being</p>
                          <p className="text-sm text-muted-foreground">Show your team you take their safety seriously.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="abuse-allegations" className="mt-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <Card className="border-0 shadow-xl rounded-3xl transition-all hover:shadow-2xl duration-300">
                  <CardContent className="p-10">
                    <h3 className="text-3xl font-bold mb-6">Allegations of Abuse & Neglect</h3>
                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                      When the worst is alleged, a perfect record is your best defense. WAiK's agentic workflow guides
                      staff through the sensitive, step-by-step process of documenting allegations, ensuring every detail
                      is captured for internal and external investigations.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">High-Stakes Documentation</p>
                          <p className="text-sm text-muted-foreground">A guided process for your most critical reports.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Regulatory Adherence</p>
                          <p className="text-sm text-muted-foreground">Ensure your process meets state reporting requirements.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Secure & Confidential</p>
                          <p className="text-sm text-muted-foreground">Protect sensitive information with role-based access.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Mitigate Liability</p>
                          <p className="text-sm text-muted-foreground">Create an unimpeachable record of the investigation.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="custom" className="mt-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <Card className="border-0 shadow-xl rounded-3xl transition-all hover:shadow-2xl duration-300">
                  <CardContent className="p-10">
                    <div className="flex items-start gap-4 mb-6">
                      <h3 className="text-3xl font-bold">Custom Forms</h3>
                      <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                      The future of WAiK is even more powerful. Administrators will be able to upload any existing PDF
                      form, and our intelligent system will instantly create a new workflow to fill it out by voice.
                      Your forms, your process, our intelligence.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">PDF Upload</p>
                          <p className="text-sm text-muted-foreground">Use your facility's existing, trusted forms.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">AI Workflow Generation</p>
                          <p className="text-sm text-muted-foreground">Instantly create a new voice-driven workflow.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Unlimited Customization</p>
                          <p className="text-sm text-muted-foreground">Adapt WAiK to any unique process in your facility.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Maintain Consistency</p>
                          <p className="text-sm text-muted-foreground">Ensure your specific protocols are always followed.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}