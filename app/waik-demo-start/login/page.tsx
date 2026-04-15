import { redirect } from "next/navigation"

/** Legacy URL; demo login lives at `/login`. */
export default function LegacyDemoLoginRedirectPage() {
  redirect("/login")
}
