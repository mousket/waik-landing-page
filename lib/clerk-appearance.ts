import type { ComponentProps } from "react"
import type { SignIn } from "@clerk/nextjs"

/**
 * WAiK brand + app/globals.css design tokens mapped to Clerk Appearance API.
 * Single source of truth for Clerk UI (SignIn, SignUp, UserButton, ClerkProvider).
 */
export type ClerkAppearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>

/** Legacy deep teal (emails, accept-invite) */
export const WAIK_TEAL = "#0D7377"
export const WAIK_DARK = "#0A3D40"
export const WAIK_MUTED_TEXT = "#3d5c5e"
export const WAIK_SURFACE_TINT_FROM = "#f0fafb"
export const WAIK_SURFACE_TINT_TO = "#e6f4f5"
export const WAIK_PRIMARY_TURQUOISE = "#44DAD2"
export const WAIK_WHITE = "#ffffff"

/** Original WAiK demo login — light teal / cyan CTA */
export const WAIK_DEMO_LOGIN_PRIMARY = "#2DD4BF"
export const WAIK_DEMO_LOGIN_PRIMARY_HOVER = "#14B8A6"

/** Input well — pale blue-lavender (demo login reference) */
export const WAIK_INPUT_WELL = "#EBF2FF"

/** Clerk-style identity line — dark blue-green (email on “check your email” step) */
export const WAIK_CLERK_SLATE = "#1e3f3c"

/** Matches `--radius` (1rem) in app/globals.css */
const RADIUS_LG = "1rem"

/**
 * Tailwind classes must use literal hex segments so JIT picks them up.
 * Primary button / links: #2DD4BF → hover #14B8A6. Input wells: #EBF2FF.
 */
const cardShell =
  "shadow-xl border border-border/20 rounded-3xl bg-white/95 backdrop-blur-sm overflow-hidden"

const linkPrimary = "text-[#2DD4BF] hover:text-[#14B8A6]"

export const clerkAppearance: ClerkAppearance = {
  layout: {
    socialButtonsVariant: "blockButton",
    socialButtonsPlacement: "bottom",
  },
  variables: {
    colorPrimary: WAIK_DEMO_LOGIN_PRIMARY,
    colorPrimaryForeground: WAIK_WHITE,
    colorDanger: "oklch(0.577 0.245 27.325)",
    colorSuccess: "oklch(0.65 0.15 165)",
    colorWarning: "oklch(0.828 0.189 84.429)",
    colorText: WAIK_DARK,
    colorForeground: WAIK_DARK,
    colorTextSecondary: WAIK_MUTED_TEXT,
    colorMutedForeground: WAIK_MUTED_TEXT,
    colorTextOnPrimaryBackground: WAIK_WHITE,
    colorBackground: WAIK_WHITE,
    colorInput: WAIK_INPUT_WELL,
    colorInputBackground: WAIK_INPUT_WELL,
    colorInputForeground: WAIK_DARK,
    colorInputText: WAIK_DARK,
    borderRadius: RADIUS_LG,
    fontFamily: '"Inter", "Inter Fallback", system-ui, -apple-system, sans-serif',
    fontFamilyButtons: '"Inter", "Inter Fallback", system-ui, -apple-system, sans-serif',
  },
  elements: {
    rootBox: "mx-auto w-full max-w-md",
    card: cardShell,
    header: "bg-white",
    headerTitle: "text-xl font-bold tracking-tight text-[#0A3D40]",
    headerSubtitle: "text-[#3d5c5e]",
    main: "gap-6 bg-white",
    scrollBox: "rounded-2xl bg-white",
    navbar: "rounded-t-2xl border-b-0 bg-white",
    navbarButton: `${linkPrimary} font-medium`,
    formButtonPrimary:
      "rounded-xl bg-[#2DD4BF] font-semibold text-white shadow-md hover:bg-[#14B8A6]",
    formButtonSecondary:
      "rounded-xl border-[#2DD4BF]/35 text-[#0A3D40] hover:bg-[#EBF2FF]",
    formButtonReset: `${linkPrimary} font-medium`,
    footer: "!border-t-0 !bg-white rounded-b-2xl shadow-none",
    footerItem: "bg-white",
    footerAction: "!hidden",
    footerAction__signUp: "!hidden",
    footerAction__signIn: "!border-t-0 !bg-white",
    footerActionText: "text-[#3d5c5e]",
    footerActionLink: `${linkPrimary} font-medium`,
    footerPages: "!border-t-0 !bg-white py-4 !shadow-none",
    footerPagesLink: "text-muted-foreground",
    formFieldLabel: "font-medium text-[#0A3D40]",
    formFieldInput:
      "rounded-xl border-[#2DD4BF]/35 bg-[#EBF2FF] text-[#0A3D40] shadow-sm placeholder:text-[#3d5c5e]/80 focus:border-[#2DD4BF] focus:ring-2 focus:ring-[#2DD4BF]/25",
    formFieldInputShowPasswordButton: "text-[#2DD4BF]",
    formFieldErrorText: "text-destructive",
    formFieldSuccessText: "text-emerald-600",
    identityPreview: "border-0 bg-transparent p-0 shadow-none ring-0",
    identityPreviewText: "font-medium text-[#1e3f3c]",
    identityPreviewEditButton: `${linkPrimary} font-medium`,
    otpCodeFieldInputs: "gap-2 justify-center",
    otpCodeFieldInput:
      "rounded-xl border-[#2DD4BF]/35 bg-[#EBF2FF] text-center text-lg font-semibold text-[#0A3D40] shadow-sm focus:border-[#2DD4BF] focus:ring-2 focus:ring-[#2DD4BF]/30",
    dividerLine: "bg-slate-200/80",
    dividerText: "text-[#3d5c5e]",
    alternativeMethodsBlockButton:
      "rounded-xl border border-[#2DD4BF]/25 bg-white text-[#0A3D40] hover:bg-[#EBF2FF]",
    socialButtonsBlockButton:
      "rounded-xl border border-[#2DD4BF]/25 bg-white text-[#0A3D40] hover:bg-[#EBF2FF]",
    alert__warning: "rounded-xl border-amber-200/80 bg-amber-50 text-amber-950",
    alert__info: "rounded-xl border-sky-200/80 bg-sky-50 text-sky-950",
    alertText__warning: "text-amber-950",
    alertText__info: "text-sky-950",
    alertText: "text-[#0A3D40]",
    formResendCodeLink: `${linkPrimary} font-semibold`,
    spinnerIcon: "text-[#2DD4BF]",
  },
}
