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
    console.log("[DB] Starting database initialization...")

    try {
      // Pre-populate with sample users
      db.users = [
        {
          id: "user-2",
          username: "waik-demo-staff",
          // Password: staff123
          password: "$2b$10$rQZ5cqx4O.Zx5qx4O.Zx4OeKGjfvb4JGVYtvTdZx.BuATiYaQkIk",
          role: "staff",
          name: "Sarah Johnson",
          createdAt: "2025-01-15T08:00:00Z",
        },
        {
          id: "ames-martinez",
          username: "waik-demo-staff",
          // Password: staff123
          password: "$2b$10$amHGjfvb4JGVYtvTdZx.BuATiYaQkIkvDnPUYs1a74bQS9UFZFvAm",
          role: "staff",
          name: "James Martinez",
          createdAt: "2025-01-15T08:00:00Z",
        },
        {
          id: "user-5",
          username: "scott.kallstrom",
          // Password: admin123
          password: "$2b$10$SY/3V1MS28E6CuxGHkVe8e.j68IDAGKv5GupVaXaGsJAUTmj/e32S",
          role: "admin",
          name: "Scott Kallstrom",
          email: "scott@waik.com",
          createdAt: "2024-01-15T10:00:00Z",
        },
        {
          id: "user-6",
          username: "gerard.beaubrun",
          // Password: admin123
          password: "$2b$10$SY/3V1MS28E6CuxGHkVe8e.j68IDAGKv5GupVaXaGsJAUTmj/e32S",
          role: "admin",
          name: "Gerard Beaubrun",
          email: "gerard@waik.com",
          createdAt: "2024-01-15T10:00:00Z",
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
          sub_type: "fall-bed",
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
          sub_type: "medication-delay",
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
          sub_type: "dietary-restriction",
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
      console.log("[DB] In-memory database initialized successfully")
      console.log("[DB] Users loaded:", db.users.length)
      console.log("[DB] Incidents loaded:", db.incidents.length)
    } catch (error) {
      console.error("[DB] Initialization failed:", error)
      throw error
    }
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

  console.log("[v0] Login attempt for username:", username)
  console.log("[v0] Total users in database:", db.users.length)

  const user = db.users.find((u) => u.username === username)
  if (!user) {
    console.log("[v0] User not found:", username)
    return null
  }

  console.log("[v0] User found:", user.username, "- Verifying password...")

  try {
    // Compare password with hashed password
    const isValid = await bcrypt.compare(password, user.password)
    console.log("[v0] Password valid:", isValid)

    if (!isValid) return null

    return user
  } catch (error) {
    console.error("[v0] Password comparison error:", error)
    console.log("[v0] Falling back to plain text comparison")
    if (password === user.password) {
      return user
    }
    return null
  }
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

export async function deleteQuestion(incidentId: string, questionId: string): Promise<boolean> {
  await initializeDb()

  const incident = getIncidentById(incidentId)
  if (!incident) return false

  const questionIndex = incident.questions.findIndex((q) => q.id === questionId)
  if (questionIndex === -1) return false

  // Only allow deleting unanswered questions
  if (incident.questions[questionIndex].answer) {
    console.log("[DB] Cannot delete answered question")
    return false
  }

  incident.questions.splice(questionIndex, 1)
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
