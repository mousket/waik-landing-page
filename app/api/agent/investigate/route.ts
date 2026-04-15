import { unauthorizedResponse, getCurrentUser } from "@/lib/auth"
import { runInvestigationAgent } from "@/lib/agents/investigation_agent"

const encoder = new TextEncoder()

export async function POST(request: Request) {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) return unauthorizedResponse()
  try {
    const { incidentId } = await request.json()

    if (!sessionUser.facilityId) {
      return new Response(
        JSON.stringify({
          type: "error",
          node: "investigation_agent",
          error: "No facility assigned to user",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    if (!incidentId || typeof incidentId !== "string") {
      return new Response(
        JSON.stringify({
          type: "error",
          node: "investigation_agent",
          error: "incidentId is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        }

        try {
          for await (const event of runInvestigationAgent(incidentId, sessionUser.facilityId)) {
            send(event)
          }
        } catch (error) {
          send({
            type: "error",
            node: "investigation_agent",
            error: error instanceof Error ? error.message : String(error),
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/jsonl; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        type: "error",
        node: "investigation_agent",
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
