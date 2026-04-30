import { auth } from "@clerk/nextjs/server"

import { LoggedInAppAccessModal } from "@/components/home/logged-in-app-access-modal"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Problem } from "@/components/problem"
import { Solution } from "@/components/solution"
import { ObjectionCrusher } from "@/components/objection-crusher"
import { ROICalculator } from "@/components/roi-calculator"
import { Features } from "@/components/features"
import { Founders } from "@/components/founders"
import { VanguardProgram } from "@/components/vanguard-program"
import { FinalCTA } from "@/components/final-cta"
import { Footer } from "@/components/footer"
import { getCurrentUser } from "@/lib/auth"
import { resolveWaikApplicationEntry } from "@/lib/post-auth-destination"

export default async function Home() {
  const { userId } = await auth()
  const user = userId ? await getCurrentUser() : null
  const entryResolution = resolveWaikApplicationEntry(userId ?? null, user)
  const greetingName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || null
    : null

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <ObjectionCrusher />
        <ROICalculator />
        <Features />
        <Founders />
        <VanguardProgram />
        <FinalCTA />
      </main>
      <Footer />
      {entryResolution.status !== "anonymous" ? (
        <LoggedInAppAccessModal entry={entryResolution} greetingName={greetingName} />
      ) : null}
    </div>
  )
}
