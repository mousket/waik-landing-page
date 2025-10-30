import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <Image src="/waik-logo.png" alt="WAiK" width={100} height={40} className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="#solution"
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            Solution
          </Link>
          <Link
            href="#features"
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#vanguard"
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            Vanguard Program
          </Link>
          <Link
            href="#about"
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            About
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="lg" className="hidden md:inline-flex font-medium">
            <Link href="#vanguard">Apply for Pilot</Link>
          </Button>
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20"
          >
            Request a Demo
          </Button>
        </div>
      </div>
    </header>
  )
}
