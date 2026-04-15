import { redirect } from "next/navigation"

/** Public self-service sign-up is disabled; accounts are onboarded manually. Re-enable `SignUpView` here when ready. */
export default function SignUpPage() {
  redirect("/sign-in")
}
