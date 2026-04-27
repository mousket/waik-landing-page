import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import IncidentModel from "@/backend/src/models/incident.model"
import UserModel from "@/backend/src/models/user.model"
import { requireWaikSuperAdmin } from "@/lib/waik-admin-api"

const MS_DAY = 24 * 60 * 60 * 1000

export async function GET() {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate

  await connectMongo()
  const facs = await FacilityModel.find({ isActive: true })
    .sort({ name: 1 })
    .lean()
    .exec()

  const now = new Date()
  const start30 = new Date(now.getTime() - 30 * MS_DAY)

  const out = await Promise.all(
    facs.map(async (f) => {
      const d = f as unknown as Record<string, unknown>
      const id = String(d.id)
      const [staffCount, incAgg, lastInc] = await Promise.all([
        UserModel.countDocuments({ facilityId: id, isWaikSuperAdmin: { $ne: true } }),
        IncidentModel.aggregate<{
          n: number
          avg: number
        }>([
          { $match: { facilityId: id, createdAt: { $gte: start30, $lte: now } } },
          {
            $group: {
              _id: null,
              n: { $sum: 1 },
              avg: { $avg: { $ifNull: ["$completenessAtSignoff", { $ifNull: ["$completenessScore", 0] }] } },
            },
          },
        ]),
        IncidentModel.find({ facilityId: id })
          .sort({ updatedAt: -1 })
          .select({ updatedAt: 1 })
          .limit(1)
          .lean()
          .exec(),
      ])

      const a = incAgg[0]
      return {
        id,
        name: String(d.name),
        type: String(d.type),
        state: String(d.state),
        plan: d.plan,
        staffCount,
        incidents30d: a?.n ?? 0,
        avgCompleteness30d: a?.avg != null ? Math.round(a.avg * 10) / 10 : 0,
        lastActivity: (() => {
          const li = lastInc[0] as unknown as { updatedAt?: Date } | undefined
          return li?.updatedAt ? new Date(li.updatedAt).toISOString() : null
        })(),
      }
    }),
  )

  return NextResponse.json({ facilities: out })
}
