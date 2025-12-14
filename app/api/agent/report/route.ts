import { runReportAgent, type ReportAgentInput } from "@/lib/agents/report_agent"

const encoder = new TextEncoder()

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const agentInput: ReportAgentInput = {
      residentName: body.residentName,
      residentRoom: body.roomNumber || body.residentRoom,
      narrative: body.narrative,
      residentState: body.residentState,
      environmentNotes: body.environmentNotes,
      reportedById: body.reportedBy ?? body.reportedById,
      reportedByName: body.reportedByName ?? "Unknown Reporter",
      reportedByRole: body.reportedByRole ?? body.role ?? "staff",
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        }

        try {
          for await (const event of runReportAgent(agentInput)) {
            send(event)
          }
        } catch (error) {
          send({
            type: "error",
            node: "report_agent",
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
        node: "report_agent",
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
