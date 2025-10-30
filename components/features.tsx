"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Pill, Utensils, ClipboardEdit, FileText } from "lucide-react"
import { ScrollReveal } from "./scroll-reveal"

export function Features() {
  return (
    <section id="features" className="py-24 md:py-40 bg-gradient-to-b from-muted/50 to-background">
      <div className="container mx-auto px-6">
        <ScrollReveal>
          <div className="mx-auto mb-20 max-w-4xl text-center">
            <h2 className="mb-6 text-balance text-5xl font-bold tracking-tight md:text-6xl leading-tight">
              From Falls to Food Logs, <span className="text-primary">All by Voice.</span>
            </h2>
            <p className="text-pretty text-xl text-foreground/70 leading-relaxed">
              We're starting with the most critical incident reports, with more on the way. WAiK is built to save your
              team time and reduce costs across all your compliance documentation.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="mx-auto max-w-5xl">
            <Tabs defaultValue="falls" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 h-auto bg-muted/50 p-2 rounded-2xl">
                <TabsTrigger
                  value="falls"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <AlertCircle className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Fall Investigations</span>
                </TabsTrigger>
                <TabsTrigger
                  value="medication"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <Pill className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Medication Errors</span>
                </TabsTrigger>
                <TabsTrigger
                  value="food"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <Utensils className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Food & Fluid Logs</span>
                </TabsTrigger>
                <TabsTrigger
                  value="incident"
                  className="flex flex-col gap-2 py-4 rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300"
                >
                  <ClipboardEdit className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  <span className="text-sm font-medium">Incident Reports</span>
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
                          <p className="font-medium">Environmental Assessment</p>
                          <p className="text-sm text-muted-foreground">Capture scene details instantly</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Vital Signs Tracking</p>
                          <p className="text-sm text-muted-foreground">Record measurements by voice</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Automatic Follow-ups</p>
                          <p className="text-sm text-muted-foreground">72-hour check-ins managed</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">CMS Compliant</p>
                          <p className="text-sm text-muted-foreground">All required fields captured</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="medication"
                className="mt-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
              >
                <Card className="border-0 shadow-xl rounded-3xl transition-all hover:shadow-2xl duration-300">
                  <CardContent className="p-10">
                    <h3 className="text-3xl font-bold mb-6">Medication Error Reports</h3>
                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                      Guide staff through the critical steps of a medication error report. Ensure physician notification
                      is documented, the discrepancy is captured accurately, and your facility remains compliant with
                      CMS error rate standards.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Error Classification</p>
                          <p className="text-sm text-muted-foreground">Automatic categorization</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Physician Notification</p>
                          <p className="text-sm text-muted-foreground">Track all communications</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Root Cause Analysis</p>
                          <p className="text-sm text-muted-foreground">Guided investigation process</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Corrective Actions</p>
                          <p className="text-sm text-muted-foreground">Document prevention steps</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="food" className="mt-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <Card className="border-0 shadow-xl rounded-3xl transition-all hover:shadow-2xl duration-300">
                  <CardContent className="p-10">
                    <h3 className="text-3xl font-bold mb-6">Food & Fluid Intake Logs</h3>
                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                      Replace tedious paper logs. Allow staff to quickly record a resident's consumption by voice ("Jane
                      Doe ate 75% of her meal and drank a full glass of water"). Get instant, accurate data for
                      nutritional monitoring.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Voice Entry</p>
                          <p className="text-sm text-muted-foreground">Natural language logging</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Percentage Tracking</p>
                          <p className="text-sm text-muted-foreground">Accurate consumption data</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Trend Analysis</p>
                          <p className="text-sm text-muted-foreground">Identify nutritional concerns</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Real-time Alerts</p>
                          <p className="text-sm text-muted-foreground">Flag low intake immediately</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="incident"
                className="mt-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
              >
                <Card className="border-0 shadow-xl rounded-3xl transition-all hover:shadow-2xl duration-300">
                  <CardContent className="p-10">
                    <h3 className="text-3xl font-bold mb-6">General Incident Reports</h3>
                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                      For everything else that needs to be documented. WAiK's flexible incident reporting allows staff to
                      quickly capture any event that doesn't fit a standard category, ensuring a complete and compliant
                      record of all occurrences.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Flexible & Adaptable</p>
                          <p className="text-sm text-muted-foreground">Report any type of event or observation</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Quick Capture</p>
                          <p className="text-sm text-muted-foreground">Start a report in seconds by voice</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Comprehensive Record</p>
                          <p className="text-sm text-muted-foreground">Ensure no event goes undocumented</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <span className="text-xs font-bold text-accent">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Trend Analysis</p>
                          <p className="text-sm text-muted-foreground">Identify patterns in miscellaneous incidents</p>
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
                          <p className="text-sm text-muted-foreground">Use your existing forms</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">AI Workflow Generation</p>
                          <p className="text-sm text-muted-foreground">Instant voice interface</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Form Gallery</p>
                          <p className="text-sm text-muted-foreground">Access to forms you can reuse</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <span className="text-xs font-bold text-primary">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Custom Logic</p>
                          <p className="text-sm text-muted-foreground">Adapt to your processes</p>
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
