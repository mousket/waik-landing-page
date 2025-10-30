import { Check, Smartphone, Clock, Brain } from "lucide-react"

export function ObjectionCrusher() {
  return (
    <section className="py-24 md:py-40">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <blockquote className="text-4xl md:text-5xl font-bold text-foreground mb-8 text-balance leading-tight">
              "My nurses are at their breaking point. I can't ask them to learn complex new software."
            </blockquote>
            <p className="text-2xl text-primary font-semibold">
              We agree. That's why we designed WAiK to <em>remove</em> work, not add it.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex gap-6 p-8 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
                <Check className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold mb-3 text-xl">Zero Training Required.</h3>
                <p className="text-foreground/70 leading-relaxed text-lg">
                  If your staff can talk, they can use WAiK. The intelligent assistant guides them through everything.
                  There are no complicated forms or menus to learn.
                </p>
              </div>
            </div>

            <div className="flex gap-6 p-8 rounded-3xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
                <Smartphone className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold mb-3 text-xl">Works on Their Phone.</h3>
                <p className="text-foreground/70 leading-relaxed text-lg">
                  No new hardware. No logging into a clunky workstation. It's as easy as opening an app they already
                  know how to use.
                </p>
              </div>
            </div>

            <div className="flex gap-6 p-8 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold mb-3 text-xl">Designed for Interruption.</h3>
                <p className="text-foreground/70 leading-relaxed text-lg">
                  We built WAiK for the chaos of real-world care. A nurse can start a report, pause to help a resident,
                  and get a smart reminder to seamlessly pick up right where they left off.
                </p>
              </div>
            </div>

            <div className="flex gap-6 p-8 rounded-3xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold mb-3 text-xl">Reduces Cognitive Load.</h3>
                <p className="text-foreground/70 leading-relaxed text-lg">
                  Instead of trying to remember dozens of checkboxes, the nurse just has a conversation. The intelligent
                  system handles the complexity, so your staff can focus on the facts.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-12 text-center text-2xl font-bold text-foreground">
            WAiK isn't another burden. It's the relief your team has been waiting for.
          </p>
        </div>
      </div>
    </section>
  )
}
