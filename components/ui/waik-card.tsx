import type { ComponentProps } from "react"

import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const waikCardVariants = cva("rounded-3xl border border-border shadow-xl", {
  variants: {
    variant: {
      base: "bg-background",
      elevated: "bg-background shadow-2xl",
      primaryGradient: "bg-gradient-to-br from-primary/10 to-primary/5",
      accentGradient: "bg-gradient-to-br from-accent/10 to-accent/5",
    },
    hover: {
      none: "",
      lift: "transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
      liftStrong: "transition-all duration-500 hover:shadow-2xl hover:-translate-y-2",
    },
  },
  defaultVariants: {
    variant: "base",
    hover: "none",
  },
})

export function WaikCard({
  className,
  variant,
  hover,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof waikCardVariants>) {
  return <div className={cn(waikCardVariants({ variant, hover }), className)} {...props} />
}

export function WaikCardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-6", className)} {...props} />
}

