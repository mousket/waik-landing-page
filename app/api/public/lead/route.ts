import { NextResponse } from "next/server"
import { sendLandingLeadEmail, type LandingLeadKind } from "@/lib/send-landing-lead-email"

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const honeypot = str(b.honeypot)
  if (honeypot.length > 0) {
    return NextResponse.json({ success: true, message: "Thank you for your submission!" })
  }

  const kind = str(b.kind) as LandingLeadKind
  if (kind !== "demo" && kind !== "vanguard") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const fullName = str(b.fullName)
  const role = str(b.role)
  const email = str(b.email).toLowerCase()
  const facilityName = str(b.facilityName)
  const phone = str(b.phone)

  if (!fullName || !role || !email || !facilityName || !phone) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  try {
    await sendLandingLeadEmail({ kind, fullName, role, email, facilityName, phone })
  } catch (e) {
    console.error("[public/lead] email failed:", e)
    return NextResponse.json(
      {
        error:
          "We could not send your request right now. Please try again later or email gerard@waik.care directly.",
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    success: true,
    message: "Thank you for your submission! We'll be in touch soon.",
  })
}
