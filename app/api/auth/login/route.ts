import { NextResponse } from "next/server"
import { getUserByCredentials } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    console.log("[v0] Login API called for username:", username)

    if (!username || !password) {
      console.log("[v0] Missing username or password")
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const user = await getUserByCredentials(username, password)

    if (!user) {
      console.log("[v0] Login failed - invalid credentials")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[v0] Login successful for user:", user.username)

    return NextResponse.json({
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
