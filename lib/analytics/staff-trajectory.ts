import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"

export interface StaffTrajectoryPoint {
  incidentId: string
  date: string
  completeness: number
  questionsNeeded: number
  activeSeconds: number
  dataPointsCaptured: number
}

export interface StaffTrajectoryMetrics {
  avgCompleteness: number
  avgCompletenessLast5: number
  avgCompletenessFirst5: number
  improvement: number
  avgQuestionsNeeded: number
  avgQuestionsLast5: number
  bestCompleteness: number
  bestStreak: number
  currentStreak: number
}

export interface StaffTrajectory {
  staffId: string
  staffName: string
  totalReports: number
  trajectory: StaffTrajectoryPoint[]
  metrics: StaffTrajectoryMetrics
  trend: "improving" | "stable" | "declining" | "new"
}

const STREAK_THRESHOLD = 85
const SEARCHABLE_PHASES = ["phase_1_complete", "phase_2_in_progress", "closed"]

const emptyMetrics = (): StaffTrajectoryMetrics => ({
  avgCompleteness: 0,
  avgCompletenessLast5: 0,
  avgCompletenessFirst5: 0,
  improvement: 0,
  avgQuestionsNeeded: 0,
  avgQuestionsLast5: 0,
  bestCompleteness: 0,
  bestStreak: 0,
  currentStreak: 0,
})

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export async function getStaffTrajectory(
  staffIdsOrSingle: string | string[],
  facilityId: string,
): Promise<StaffTrajectory> {
  await connectMongo()

  const staffIds = Array.isArray(staffIdsOrSingle) ? staffIdsOrSingle : [staffIdsOrSingle]
  const primaryStaffId = staffIds[0] || ""

  const incidents = await IncidentModel.find({
    facilityId,
    staffId: staffIds.length > 1 ? { $in: staffIds } : primaryStaffId,
    phase: { $in: SEARCHABLE_PHASES },
  })
    .sort({ "phaseTransitionTimestamps.phase1Signed": 1, createdAt: 1 })
    .select(
      "id staffName completenessAtSignoff tier2QuestionsGenerated questionsAnswered activeDataCollectionSeconds dataPointsPerQuestion phaseTransitionTimestamps createdAt",
    )
    .lean()
    .exec()

  if (incidents.length === 0) {
    return {
      staffId: primaryStaffId,
      staffName: "",
      totalReports: 0,
      trajectory: [],
      metrics: emptyMetrics(),
      trend: "new",
    }
  }

  const trajectory: StaffTrajectoryPoint[] = incidents.map((inc: any) => {
    const signed = inc.phaseTransitionTimestamps?.phase1Signed
    const isoDate = signed
      ? new Date(signed).toISOString()
      : inc.createdAt
        ? new Date(inc.createdAt).toISOString()
        : ""
    const dataPointsCaptured = (inc.dataPointsPerQuestion || []).reduce(
      (sum: number, q: any) => sum + Number(q?.dataPointsCovered || 0),
      0,
    )
    return {
      incidentId: String(inc.id || ""),
      date: isoDate,
      completeness: Number(inc.completenessAtSignoff || 0),
      questionsNeeded: Number(inc.tier2QuestionsGenerated || 0),
      activeSeconds: Number(inc.activeDataCollectionSeconds || 0),
      dataPointsCaptured,
    }
  })

  const scores = trajectory.map((t) => t.completeness)
  const first5 = scores.slice(0, Math.min(5, scores.length))
  const last5 = scores.slice(-Math.min(5, scores.length))
  const avgFirst5 = avg(first5)
  const avgLast5 = avg(last5)

  // currentStreak walks backward (most recent first); bestStreak walks forward.
  let currentStreak = 0
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] >= STREAK_THRESHOLD) currentStreak++
    else break
  }
  let bestStreak = 0
  let running = 0
  for (const s of scores) {
    if (s >= STREAK_THRESHOLD) {
      running++
      if (running > bestStreak) bestStreak = running
    } else {
      running = 0
    }
  }

  const improvement = Math.round(avgLast5 - avgFirst5)
  let trend: StaffTrajectory["trend"] = "stable"
  if (incidents.length < 3) trend = "new"
  else if (improvement > 5) trend = "improving"
  else if (improvement < -5) trend = "declining"

  const questionsNeeded = trajectory.map((t) => t.questionsNeeded)
  const last5Q = questionsNeeded.slice(-Math.min(5, questionsNeeded.length))

  return {
    staffId: primaryStaffId,
    staffName: String((incidents[0] as any).staffName || ""),
    totalReports: incidents.length,
    trajectory,
    metrics: {
      avgCompleteness: Math.round(avg(scores)),
      avgCompletenessLast5: Math.round(avgLast5),
      avgCompletenessFirst5: Math.round(avgFirst5),
      improvement,
      avgQuestionsNeeded: Math.round(avg(questionsNeeded)),
      avgQuestionsLast5: Math.round(avg(last5Q)),
      bestCompleteness: scores.length ? Math.max(...scores) : 0,
      bestStreak,
      currentStreak,
    },
    trend,
  }
}
