import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] Proxy forwarding login request to waik-demo-vercel.app")
    console.log("[v0] Request body:", body)

    // Forward the request to the actual backend
    const response = await fetch("https://waik-demo-vercel.app/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    console.log("[v0] Backend response status:", response.status)
    console.log("[v0] Backend response headers:", Object.fromEntries(response.headers.entries()))

    const contentType = response.headers.get("content-type")

    if (contentType?.includes("application/json")) {
      const data = await response.json()
      console.log("[v0] Backend returned JSON:", data)
      return NextResponse.json(data, { status: response.status })
    } else {
      // Backend returned non-JSON (likely HTML error page)
      const text = await response.text()
      console.error("[v0] Backend returned non-JSON response:", text.substring(0, 500))
      return NextResponse.json(
        {
          error: "Backend returned invalid response",
          details: text.substring(0, 200),
          status: response.status,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Proxy error:", error)
    return NextResponse.json(
      {
        error: "Failed to connect to authentication server",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
