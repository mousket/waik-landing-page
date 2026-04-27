import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import ResidentModel from "@/backend/src/models/resident.model"
import NoteModel from "@/backend/src/models/note.model"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { resolveResidentListFacility } from "@/lib/resident-api-facility"
import { isAdminRole } from "@/lib/waik-roles"

export const dynamic = "force-dynamic"

const VIS = ["team", "admin_only", "sealed"] as const

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return unauthorizedResponse()
  }
  if (user.mustChangePassword) {
    return NextResponse.json({ error: "Password change required" }, { status: 403 })
  }
  const { id: residentId } = await params
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const content = String(body.content ?? "").trim()
  if (!content || content.length > 2000) {
    return NextResponse.json({ error: "content is required, max 2000 chars" }, { status: 400 })
  }
  let vis = String(body.visibility ?? "team")
  if (!VIS.includes(vis as (typeof VIS)[number])) {
    vis = "team"
  }
  if (vis === "admin_only" || vis === "sealed") {
    if (!isAdminRole(String(user.roleSlug))) {
      return NextResponse.json({ error: "Not allowed to use this visibility" }, { status: 403 })
    }
  }
  const isFlagged = body.isFlagged === true
  const authorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email

  try {
    const resolved = await resolveResidentListFacility(request, user, {
      facilityId: typeof body.facilityId === "string" ? body.facilityId : undefined,
    })
    if (resolved instanceof NextResponse) {
      return resolved
    }
    const { facilityId } = resolved
    await connectMongo()
    const r = await ResidentModel.findOne({ id: residentId, facilityId })
    if (!r) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 })
    }
    const n = await NoteModel.create({
      id: `note-${randomUUID()}`,
      facilityId,
      parentType: "resident",
      parentId: residentId,
      content,
      authorId: user.userId,
      authorName,
      authorRole: String(user.roleSlug),
      visibility: vis as (typeof VIS)[number],
      isFlagged,
      createdAt: new Date(),
    })
    return NextResponse.json({ note: n.toJSON() }, { status: 201 })
  } catch (e) {
    return authErrorResponse(e)
  }
}
