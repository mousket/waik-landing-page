import { NextResponse, type NextRequest } from "next/server"

import { verifyCronRequest } from "@/lib/cron-auth"
import { processDeferredQuestionReminders } from "@/lib/process-question-reminders"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const gate = verifyCronRequest(request)
  if (gate) return gate
  try {
    const result = await processDeferredQuestionReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error("[cron/question-reminders]", e)
    return NextResponse.json({ ok: false, error: "processing_failed" }, { status: 500 })
  }
}
