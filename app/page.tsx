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

export default function Home() {
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
    </div>
  )
}
