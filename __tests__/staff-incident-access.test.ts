import { describe, expect, it } from "vitest"
import {
  countPendingQuestionsForStaff,
  countReporterPendingBreakdown,
  hasStaffIdtAssignment,
  isIncidentReporter,
  staffCanReadIncident,
} from "@/lib/staff-incident-access"
import type { CurrentUser } from "@/lib/types"

const staffUser: CurrentUser = {
  userId: "mongo-1",
  clerkUserId: "clerk-1",
  organizationId: "org-1",
  email: "nurse@example.com",
  firstName: "N",
  lastName: "B",
  roleSlug: "staff",
  role: {
    id: "role-1",
    name: "Staff",
    slug: "staff",
    permissions: [],
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    canViewIntelligence: false,
    facilityScoped: true,
  },
  facilityId: "fac-1",
  isAdminTier: false,
  isWaikSuperAdmin: false,
  canAccessPhase2: false,
  canInviteStaff: false,
  canManageResidents: false,
  deviceType: "personal",
  mustChangePassword: false,
}

describe("staff-incident-access", () => {
  it("allows reporter access", () => {
    const doc = { staffId: "mongo-1", idtTeam: [], questions: [] }
    expect(isIncidentReporter(doc, staffUser)).toBe(true)
    expect(staffCanReadIncident(doc, staffUser)).toBe(true)
  })

  it("allows IDT assignee who did not file", () => {
    const doc = {
      staffId: "other",
      idtTeam: [{ userId: "mongo-1", status: "pending" }],
      questions: [],
    }
    expect(isIncidentReporter(doc, staffUser)).toBe(false)
    expect(hasStaffIdtAssignment(doc, staffUser)).toBe(true)
    expect(staffCanReadIncident(doc, staffUser)).toBe(true)
  })

  it("denies unrelated staff", () => {
    const doc = { staffId: "other", idtTeam: [], questions: [] }
    expect(staffCanReadIncident(doc, staffUser)).toBe(false)
  })

  it("counts pending phase 1 and IDT questions", () => {
    const doc = {
      staffId: "mongo-1",
      questions: [
        { metadata: { idt: false } },
        { metadata: { idt: true }, assignedTo: ["mongo-1"] },
      ],
    }
    expect(countPendingQuestionsForStaff(doc, staffUser, "phase_1_in_progress")).toBe(2)
  })

  it("splits deferred Tier 2 from unanswered (Helen all-deferred scenario)", () => {
    const doc = {
      staffId: "mongo-1",
      questions: [
        {
          metadata: { idt: false },
          generatedBy: "tier-1-report",
          priority: { phase: "initial" },
          answer: { answerText: "done" },
        },
        ...Array.from({ length: 10 }, (_, i) => ({
          metadata: { idt: false },
          generatedBy: "tier-2-gap",
          priority: { phase: "follow-up" },
          answer: { answerText: "__DEFERRED__" },
          id: `t2-q${i + 1}`,
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          metadata: { idt: false },
          generatedBy: "closing-report",
          priority: { phase: "final-critical" },
          id: `c-q${i + 1}`,
        })),
      ],
    }
    const breakdown = countReporterPendingBreakdown(doc, staffUser, "phase_1_in_progress")
    expect(breakdown).toEqual({
      total: 13,
      tier1: 0,
      tier2: 10,
      tier2Unanswered: 0,
      tier2Deferred: 10,
      closing: 3,
      tier2Generated: true,
    })
    expect(countPendingQuestionsForStaff(doc, staffUser, "phase_1_in_progress")).toBe(13)
  })

  it("counts one deferred Tier 2 among answered follow-ups (injuries scenario)", () => {
    const doc = {
      staffId: "mongo-1",
      questions: [
        {
          metadata: { idt: false },
          generatedBy: "tier-1-report",
          priority: { phase: "initial" },
          answer: { answerText: "done" },
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          metadata: { idt: false },
          generatedBy: "tier-2-gap",
          priority: { phase: "follow-up" },
          answer: { answerText: `answer ${i}` },
          id: `t2-q${i + 1}`,
        })),
        {
          metadata: { idt: false },
          generatedBy: "tier-2-gap",
          priority: { phase: "follow-up" },
          answer: { answerText: "__DEFERRED__" },
          id: "t2-q10",
        },
      ],
    }
    const breakdown = countReporterPendingBreakdown(doc, staffUser, "phase_1_in_progress")
    expect(breakdown.tier2).toBe(1)
    expect(breakdown.tier2Unanswered).toBe(0)
    expect(breakdown.tier2Deferred).toBe(1)
    expect(breakdown.total).toBe(1)
  })
})
