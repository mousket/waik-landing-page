import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import IncidentModel from "@/backend/src/models/incident.model"
import ResidentModel from "@/backend/src/models/resident.model"
import { mapIncidentDocToSummary } from "@/lib/map-incident-summary"
import { generateAdminIncidentsExportCsv } from "@/lib/utils/csv-export"
import type { IncidentSummary } from "@/lib/types/incident-summary"
import { authErrorResponse, getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { requireAdminTier } from "@/lib/permissions"

function escCell(s: string): string {
  return `"${String(s).replace(/"/g, '""')}"`
}

function residentsCsvNameRows(
  rows: {
    roomNumber: string
    firstName: string
    lastName: string
    careLevel: string
    admissionDate: string
    status: string
  }[],
) {
  const h = "roomNumber,residentName,careLevel,admissionDate,status"
  const body = rows
    .map(
      (r) =>
        [
          escCell(r.roomNumber),
          escCell(`${r.firstName} ${r.lastName}`.trim()),
          escCell(r.careLevel),
          escCell(r.admissionDate),
          escCell(r.status),
        ].join(",") + "\n",
    )
    .join("")
  return h + "\n" + body
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    requireAdminTier(user)
    const resolved = await resolveEffectiveAdminFacility(request, user)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const { facilityId } = resolved

    const url = new URL(request.url)
    const type = (url.searchParams.get("type") || "").toLowerCase()
    const includeNames = url.searchParams.get("includeNames") === "true"
    const days = Number.parseInt(url.searchParams.get("days") || "90", 10)
    const windowDays = Number.isFinite(days) && days > 0 && days <= 730 ? days : 90
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

    await connectMongo()

    if (type === "incidents") {
      const raw = await IncidentModel.find({ facilityId })
        .sort({ updatedAt: -1 })
        .lean()
        .exec()
      const filtered = raw.filter((d) => {
        const t = d.createdAt
        if (!t) return true
        return new Date(t as string | Date) >= cutoff
      })
      const list = filtered
        .map((d) => mapIncidentDocToSummary(d as unknown as Record<string, unknown>))
        .filter((s) => s !== null) as IncidentSummary[]

      const csv = generateAdminIncidentsExportCsv(list, { includeResidentName: includeNames })
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="waik-incidents-${windowDays}d.csv"`,
        },
      })
    }

    if (type === "assessments") {
      const raw = await AssessmentModel.find({ facilityId, conductedAt: { $gte: cutoff } })
        .sort({ conductedAt: -1 })
        .limit(2000)
        .lean()
        .exec()
      const header = includeNames
        ? "roomNumber,residentName,assessmentType,completenessScore,conductedAt,nextDueAt"
        : "roomNumber,assessmentType,completenessScore,conductedAt,nextDueAt"
      const lines = raw.map((doc) => {
        const a = doc as unknown as Record<string, unknown>
        const rn = String(a.residentName ?? "")
        const row = {
          roomNumber: String(a.residentRoom ?? ""),
          residentName: includeNames ? rn : "",
          assessmentType: String(a.assessmentType),
          completenessScore: String(a.completenessScore ?? 0),
          conductedAt: a.conductedAt
            ? new Date(a.conductedAt as string | Date).toISOString()
            : "",
          nextDueAt: a.nextDueAt ? new Date(a.nextDueAt as string | Date).toISOString() : "",
        }
        if (includeNames) {
          return [row.roomNumber, row.residentName, row.assessmentType, row.completenessScore, row.conductedAt, row.nextDueAt]
            .map(escCell)
            .join(",")
        }
        return [row.roomNumber, row.assessmentType, row.completenessScore, row.conductedAt, row.nextDueAt]
          .map(escCell)
          .join(",")
      })
      return new NextResponse((lines.length ? [header, ...lines].join("\n") : header) + "\n", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="waik-assessments-${windowDays}d.csv"`,
        },
      })
    }

    if (type === "residents") {
      const raw = await ResidentModel.find({ facilityId }).sort({ lastName: 1 }).lean().limit(2000).exec()
      if (!includeNames) {
        const h = "roomNumber,careLevel,admissionDate,status"
        const b = raw
          .map((q) => {
            const o = q as unknown as Record<string, unknown>
            const a = o.admissionDate
            return [
              escCell(String(o.roomNumber ?? "")),
              escCell(String(o.careLevel ?? "")),
              escCell(
                a ? new Date(a as string | Date).toISOString() : "",
              ),
              escCell(String(o.status ?? "")),
            ].join(",")
          })
          .join("\n")
        return new NextResponse(h + "\n" + b + (b ? "\n" : ""), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="waik-residents-min.csv"`,
          },
        })
      }
      const rows = raw.map((q) => {
        const o = q as unknown as Record<string, unknown>
        return {
        roomNumber: String(o.roomNumber ?? ""),
        firstName: String(o.firstName ?? ""),
        lastName: String(o.lastName ?? ""),
        careLevel: String(o.careLevel ?? ""),
        admissionDate: o.admissionDate ? new Date(o.admissionDate as string | Date).toISOString() : "",
        status: String(o.status ?? ""),
      }})
      return new NextResponse(residentsCsvNameRows(rows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="waik-residents.csv"`,
        },
      })
    }

    return NextResponse.json({ error: "type must be incidents, assessments, or residents" }, { status: 400 })
  } catch (e) {
    return authErrorResponse(e)
  }
}
