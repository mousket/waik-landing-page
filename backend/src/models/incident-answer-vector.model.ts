import { Schema, model, models } from "mongoose"

export interface IncidentAnswerVectorDocument {
  incidentId: string
  facilityId: string
  questionId: string
  questionText: string
  answerText: string
  tier: "tier1" | "tier2" | "closing"
  areaHint: string
  incidentType: string
  residentName: string
  vector: number[]
  embeddedAt: Date
}

const IncidentAnswerVectorSchema = new Schema<IncidentAnswerVectorDocument>(
  {
    incidentId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    answerText: { type: String, required: true },
    tier: { type: String, enum: ["tier1", "tier2", "closing"], required: true },
    areaHint: { type: String, default: "General" },
    incidentType: { type: String, default: "" },
    residentName: { type: String, default: "" },
    vector: { type: [Number], required: true },
    embeddedAt: { type: Date, default: Date.now },
  },
  { collection: "incident_answer_vectors" },
)

IncidentAnswerVectorSchema.index({ incidentId: 1, questionId: 1 }, { unique: true })

const IncidentAnswerVectorModel =
  models.IncidentAnswerVector ||
  model<IncidentAnswerVectorDocument>("IncidentAnswerVector", IncidentAnswerVectorSchema)

export default IncidentAnswerVectorModel
