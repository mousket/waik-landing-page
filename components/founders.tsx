import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

export function Founders() {
  return (
    <section id="about" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Built by a Team <span className="text-primary">Obsessed with Solving Real-World Problems.</span>
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 relative h-32 w-32 overflow-hidden rounded-full bg-muted">
                  <Image
                    src="/Gerard-Image-Round.jpeg?height=128&width=128"
                    alt="Gerard - Co-Founder & CEO"
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-2">Gerard</h3>
                <p className="text-primary font-semibold mb-4">Co-Founder & CEO</p>
                <p className="text-muted-foreground leading-relaxed">
                  A decade-long Software Architect with a passion for building intelligent systems that empower people.
                  Gerard saw the immense potential for agentic AI to solve the burnout crisis in care and co-founded
                  WAiK to turn that vision into a reality.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 relative h-32 w-32 overflow-hidden rounded-full bg-muted">
                  <Image
                    src="/Scott-Headshot.png?height=128&width=128"
                    alt="Scott - Co-Founder"
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-2">Scott</h3>
                <p className="text-primary font-semibold mb-4">Co-Founder</p>
                <p className="text-muted-foreground leading-relaxed">
                  With deep expertise in healthcare operations and technology, Scott brings invaluable insights into the
                  daily challenges faced by care facilities. His commitment to improving nurse workflows drives WAiK's
                  user-centered design.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
