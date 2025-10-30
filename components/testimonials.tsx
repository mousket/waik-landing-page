import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const testimonials = [
  {
    quote:
      "StreamLine has transformed how our team works. We've automated 80% of our repetitive tasks and saved countless hours every week.",
    author: "Sarah Chen",
    role: "VP of Operations",
    company: "TechCorp",
    avatar: "/professional-woman-diverse.png",
    initials: "SC",
  },
  {
    quote:
      "The visual workflow builder is incredibly intuitive. Our non-technical team members can create complex automations without any help from IT.",
    author: "Michael Rodriguez",
    role: "Product Manager",
    company: "InnovateLabs",
    avatar: "/professional-man.jpg",
    initials: "MR",
  },
  {
    quote:
      "We switched from three different tools to just StreamLine. The ROI was clear within the first month. Highly recommended!",
    author: "Emily Watson",
    role: "CEO",
    company: "GrowthStack",
    avatar: "/confident-business-woman.png",
    initials: "EW",
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="border-b border-border py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Loved by teams worldwide
          </h2>
          <p className="text-pretty text-lg text-muted-foreground">
            See what our customers have to say about StreamLine.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-border bg-card">
              <CardContent className="p-6">
                <p className="mb-6 leading-relaxed text-card-foreground">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={testimonial.avatar || "/placeholder.svg"} alt={testimonial.author} />
                    <AvatarFallback>{testimonial.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
