/** All facility role slugs (Mongo UserModel.roleSlug + legacy UI buckets) */
export type UserRole =
  | "owner"
  | "administrator"
  | "director_of_nursing"
  | "head_nurse"
  | "rn"
  | "lpn"
  | "cna"
  | "staff"
  | "physical_therapist"
  | "dietician"
  /** @deprecated Legacy UI bucket; prefer isAdminRole(roleSlug) */
  | "admin"

export type Phase2SectionStatus = "not_started" | "in_progress" | "complete"

export type DeviceType = "personal" | "work"

export interface User {
  id: string
  username: string
  password: string
  role: UserRole
  name: string
  email: string
  createdAt: string
}

export interface Answer {
  id: string
  questionId: string
  answerText: string
  answeredBy: string
  answeredAt: string
  method: "text" | "voice"
}

export interface Question {
  id: string
  incidentId?: string
  questionText: string
  askedBy: string
  askedByName?: string
  askedAt: string
  assignedTo?: string[]
  answer?: Answer
  source?: "voice-report" | "ai-generated" | "manual"
  generatedBy?: string
  vectorizedAt?: string
  metadata?: {
    reporterId?: string
    reporterName?: string
    reporterRole?: UserRole
    assignedStaffIds?: string[]
    createdVia?: "voice" | "text" | "system"
    /** Phase 2 — IDT tab: questions assigned to facility staff for this investigation */
    idt?: boolean
    idtTargetUserId?: string
  }
}

export interface IncidentInitialReport {
  capturedAt: string
  narrative: string
  residentState?: string
  environmentNotes?: string
  enhancedNarrative?: string
  recordedById: string
  recordedByName: string
  recordedByRole: UserRole
}

export type InvestigationStatus = "not-started" | "in-progress" | "completed"

import type { GoldStandardFallReport, FallSubtypeStandards } from "./gold_standards"

/** Phase 2 / Phase 1 regulatory signature blocks (Mongo `investigation.signatures`) */
export interface InvestigationSignature {
  signedBy: string
  signedByName: string
  signedAt: string
  role: string
  declaration: string
  ipAddress?: string
}

export interface IncidentInvestigationMetadata {
  status: InvestigationStatus
  subtype?: string
  startedAt?: string
  completedAt?: string
  investigatorId?: string
  investigatorName?: string
  goldStandard?: GoldStandardFallReport | null
  subTypeData?: FallSubtypeStandards | null
  score?: number | null
  completenessScore?: number | null
  feedback?: string | null
  signatures?: {
    don?: InvestigationSignature
    admin?: InvestigationSignature
  }
}

export interface IncidentNotification {
  id: string
  incidentId: string
  type:
    | "incident-created"
    | "investigation-started"
    | "investigation-ready"
    | "follow-up-required"
    | "investigation-completed"
  message: string
  createdAt: string
  readAt?: string
  targetUserId: string
}

export interface HumanReport {
  summary: string
  insights: string
  recommendations: string
  actions: string
  createdBy: string
  createdAt: string
  lastEditedBy?: string
  lastEditedAt?: string
}

export interface AIReport {
  summary: string
  insights: string
  recommendations: string
  actions: string
  generatedAt: string
  model: string
  confidence: number
  promptTokens?: number
  completionTokens?: number
}

export interface IncidentPhase2Sections {
  contributingFactors: {
    status: Phase2SectionStatus
    factors: string[]
    notes?: string
    completedAt?: string
    completedBy?: string
  }
  rootCause: {
    status: Phase2SectionStatus
    description?: string
    completedAt?: string
    completedBy?: string
  }
  interventionReview: {
    status: Phase2SectionStatus
    reviewedInterventions: Array<{ interventionId: string; stillEffective: boolean; notes?: string }>
    completedAt?: string
    completedBy?: string
  }
  newIntervention: {
    status: Phase2SectionStatus
    interventions: Array<{
      description?: string
      department?: "nursing" | "dietary" | "therapy" | "activities" | "administration" | "multiple"
      type?: "temporary" | "permanent"
      startDate?: string
      notes?: string
    }>
    completedAt?: string
    completedBy?: string
  }
}

export interface IncidentAuditEntry {
  action:
    | "locked"
    | "unlocked"
    | "relocked"
    | "phase_transitioned"
    | "signed"
    | "idt_roster_changed"
  performedBy: string
  performedByName?: string
  timestamp: string
  reason?: string
  previousValue?: string
  newValue?: string
}

export interface Incident {
  id: string
  facilityId?: string
  organizationId?: string
  title: string
  description: string
  status: "open" | "in-progress" | "pending-review" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  staffId: string
  staffName: string
  residentName: string
  residentRoom: string
  createdAt: string
  updatedAt: string
  questions: Question[]
  initialReport?: IncidentInitialReport
  investigation?: IncidentInvestigationMetadata
  summary?: string | null
  humanReport?: HumanReport
  aiReport?: AIReport
  incidentType?: string
  location?: string
  incidentDate?: string
  incidentTime?: string
  witnessesPresent?: boolean
  hasInjury?: boolean
  injuryDescription?: string
  phase?:
    | "phase_1_in_progress"
    | "phase_1_complete"
    | "phase_2_in_progress"
    | "closed"
  residentId?: string
  completenessScore?: number
  investigatorId?: string
  investigatorName?: string
  idtTeam?: Array<{
    userId: string
    name: string
    role: string
    questionSent?: string
    questionSentAt?: string
    response?: string
    respondedAt?: string
    status?: "pending" | "answered"
  }>
  phase2Sections?: IncidentPhase2Sections
  auditTrail?: IncidentAuditEntry[]
  tier2QuestionsGenerated?: number
  questionsAnswered?: number
  questionsDeferred?: number
  questionsMarkedUnknown?: number
  activeDataCollectionSeconds?: number
  completenessAtTier1Complete?: number
  completenessAtSignoff?: number
  dataPointsPerQuestion?: Array<{ questionId: string; dataPointsCovered: number }>
  phaseTransitionTimestamps?: {
    phase1Started?: string
    tier1Complete?: string
    tier2Started?: string
    phase1Signed?: string
    phase2Claimed?: string
    phase2Locked?: string
  }
}

/** Resident intervention history (Mongo `InterventionModel`) */
export interface Intervention {
  id: string
  facilityId: string
  residentId: string
  residentRoom: string
  description: string
  department: "nursing" | "dietary" | "therapy" | "activities" | "administration" | "multiple"
  type: "temporary" | "permanent"
  isActive: boolean
  placedAt: string
  removedAt?: string
  triggeringIncidentId?: string
  notes?: string
  createdBy?: string
}

export interface Database {
  users: User[]
  incidents: Incident[]
  notifications: IncidentNotification[]
}

/** Full role document (Mongo `RoleModel`), aligned with seeded WAiK roles */
export interface WaikRole {
  id: string
  name: string
  slug: string
  permissions: string[]
  isAdminTier: boolean
  canAccessPhase2: boolean
  canInviteStaff: boolean
  canManageResidents: boolean
  canViewIntelligence: boolean
  facilityScoped: boolean
}

export interface WaikOrganization {
  id: string
  name: string
  type: string
  plan: string
  isActive: boolean
}

export interface WaikFacility {
  id: string
  organizationId: string
  name: string
  type: string
  state: string
  bedCount: number
  phaseMode: "two_phase" | "one_phase"
  completionThresholds: Record<string, number>
  units: string[]
  plan: string
}

export interface WaikUser {
  id: string
  clerkUserId: string
  organizationId: string
  facilityId: string
  firstName: string
  lastName: string
  email: string
  roleSlug: string
  role: WaikRole
  isWaikSuperAdmin: boolean
  deviceType: DeviceType
  mustChangePassword: boolean
  isActive: boolean
}

export interface CurrentUser {
  clerkUserId: string
  userId: string
  facilityId: string
  organizationId: string
  firstName: string
  lastName: string
  email: string
  roleSlug: string
  role: WaikRole
  isWaikSuperAdmin: boolean
  deviceType: DeviceType
  mustChangePassword: boolean
  selectedUnit?: string
  selectedUnitDate?: string
  isAdminTier: boolean
  canAccessPhase2: boolean
  canInviteStaff: boolean
  canManageResidents: boolean
}
