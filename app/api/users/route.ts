import { NextResponse } from "next/server"
import { getUsers } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")

    console.log("[v0] Users API called with role filter:", role)

    const users = getUsers()
    console.log("[v0] Total users found:", users.length)

    // Filter by role if specified
    const filteredUsers = role ? users.filter((user) => user.role === role) : users

    console.log("[v0] Filtered users count:", filteredUsers.length)

    // Return users without password field
    const safeUsers = filteredUsers.map(({ password, ...user }) => user)

    return NextResponse.json(safeUsers)
  } catch (error) {
    console.error("[v0] Error in users API:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
