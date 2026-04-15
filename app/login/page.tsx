import { redirect } from "next/navigation"

/** Legacy `/login` — demo credentials now use Clerk at `/sign-in`. */
export default function LoginRedirectPage() {
  redirect("/sign-in")
}
