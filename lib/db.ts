import type { Database, Incident, User } from "./types"
import bcrypt from "bcrypt"

// In-memory database (works in browser and server)
const db: Database = {
  users: [],
  incidents: [],
}

// Initialize database with sample data
let isInitialized = false

async function initializeDb() {
  if (!isInitialized) {
    // Pre-populate with sample users
    db.users = [
      {
        id: "user-1",
        username: "waik-demo-admin",
        password: await bcrypt.hash("waik1+demo-admin!@#", 10),
        role: "admin",
        name: "Admin User",
        createdAt: "2025-01-15T08:00:00Z",
      },
      {
        id: "user-2",
        username: "waik-demo-staff",
        password: await bcrypt.hash("waik1+demo-staff!@#", 10),
        role: "staff",
        name: "Sarah Johnson",
        createdAt: "2025-01-15T08:00:00Z",
      },
      {
        id: "user-3",
        username: "scott",
        password: await bcrypt.hash("password123", 10),
        role: "admin",
        name: "Scott",
        createdAt: "2025-01-20T08:00:00Z",
      },
      {
        id: "user-4",
        username: "gerard",
        password: await bcrypt.hash("password123", 10),
        role: "admin",
        name: "Gerard",
        createdAt: "2025-01-20T08:00:00Z",
      },
    ]

    // Pre-populate with sample incidents
    db.incidents = [
      {
        id: "inc-1",
        title: "Resident Fall in Room 204",
        description: "Resident experienced a fall while attempting to get out of bed.",
        status: "open",
        priority: "high",
        residentName: "Margaret Thompson",
        residentAge: 78,
        residentGender: "Female",
        residentRoom: "204",
        staffId: "user-2",
        staffName: "Sarah Johnson",
        createdAt: "2025-01-21T08:15:00Z",
        updatedAt: "2025-01-21T08:15:00Z",
        questions: [
          {
            id: "q-1",
            question: "What time did the fall occur?",
            askedBy: "WAiK Agent",
            askedAt: "2025-01-21T08:20:00Z",
            answer: {
              text: "The fall occurred at approximately 8:15 AM during morning rounds.",
              answeredBy: "Sarah Johnson",
              answeredAt: "2025-01-21T09:00:00Z",
            },
          },
          {
            id: "q-2",
            question: "Were there any witnesses to the fall?",
            askedBy: "Admin User",
            askedAt: "2025-01-21T10:00:00Z",
            assignedTo: ["user-2"],
          },
        ],
      },
      {
        id: "inc-2",
        title: "Medication Administration Delay",
        description: "Morning medication was administered 30 minutes late due to staffing constraints.",
        status: "in-progress",
        priority: "medium",
        residentName: "Robert Williams",
        residentAge: 82,
        residentGender: "Male",
        residentRoom: "312",
        staffId: "user-2",
        staffName: "Sarah Johnson",
        createdAt: "2025-01-21T10:00:00Z",
        updatedAt: "2025-01-21T10:30:00Z",
        questions: [
          {
            id: "q-3",
            question: "What was the reason for the staffing shortage?",
            askedBy: "WAiK Agent",
            askedAt: "2025-01-21T10:15:00Z",
            answer: {
              text: "Two staff members called in sick, and we were unable to find immediate coverage.",
              answeredBy: "Sarah Johnson",
              answeredAt: "2025-01-21T11:00:00Z",
            },
          },
        ],
      },
      {
        id: "inc-3",
        title: "Dietary Restriction Not Followed",
        description: "Resident with lactose intolerance was served a meal containing dairy products.",
        status: "resolved",
        priority: "low",
        residentName: "Elizabeth Davis",
        residentAge: 75,
        residentGender: "Female",
        residentRoom: "108",
        staffId: "user-2",
        staffName: "Sarah Johnson",
        createdAt: "2025-01-22T12:00:00Z",
        updatedAt: "2025-01-22T14:00:00Z",
        questions: [],
      },
    ]

    isInitialized = true
    console.log("[DB] In-memory database initialized with sample data")
  }
}

// Auto-initialize on import
initializeDb().catch((err) => console.error("[DB] Initialization error:", err))

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export function getDb(): Database {
  return db
}

export function getUsers(): User[] {
  return db.users
}

export async function getUserByCredentials(username: string, password: string): Promise<User | null> {
  await initializeDb()

  const user = db.users.find((u) => u.username === username)
  if (!user) return null

  // Compare password with hashed password
  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return null

  return user
}

export function getUserById(id: string): User | null {
  return db.users.find((u) => u.id === id) || null
}

// ============================================================================
// INCIDENT FUNCTIONS
// ============================================================================

export function getIncidents(): Incident[] {
  return db.incidents
}

export function getIncidentById(id: string): Incident | null {
  return db.incidents.find((i) => i.id === id) || null
}

export function getIncidentsByStaffId(staffId: string): Incident[] {
  return db.incidents.filter((i) => i.staffId === staffId)
}

export async function updateIncident(id: string, updates: Partial<Incident>): Promise<Incident | null> {
  await initializeDb()

  const index = db.incidents.findIndex((i) => i.id === id)
  if (index === -1) return null

  db.incidents[index] = {
    ...db.incidents[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  return db.incidents[index]
}

export async function addIncident(incident: Incident): Promise<Incident> {
  await initializeDb()

  db.incidents.push(incident)

  return incident
}

// ============================================================================
// QUESTION & ANSWER FUNCTIONS
// ============================================================================

export async function addQuestionToIncident(incidentId: string, question: Incident["questions"][0]): Promise<boolean> {
  await initializeDb()

  const incident = getIncidentById(incidentId)
  if (!incident) return false

  incident.questions.push(question)
  incident.updatedAt = new Date().toISOString()

  return true
}

export async function answerQuestion(
  incidentId: string,
  questionId: string,
  answer: Incident["questions"][0]["answer"],
): Promise<boolean> {
  await initializeDb()

  const incident = getIncidentById(incidentId)
  if (!incident) return false

  const question = incident.questions.find((q) => q.id === questionId)
  if (!question) return false

  question.answer = answer
  incident.updatedAt = new Date().toISOString()

  return true
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Force a refresh (no-op for in-memory database)
 */
export async function refreshDb(): Promise<void> {
  console.log("[DB] In-memory database (no refresh needed)")
}

/**
 * Hash a password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return isInitialized
}
