import type { Database, Incident, User } from "./types"
import bcrypt from "bcrypt"

// In-memory database
const db: Database = {
  users: [],
  incidents: [],
}

// Initialize with demo data
let isInitialized = false

async function initializeDb() {
  if (!isInitialized) {
    // Hash passwords for demo users
    const staffPasswordHash = await bcrypt.hash("waik1+demo-staff!@#", 10)
    const adminPasswordHash = await bcrypt.hash("waik1+demo-admin!@#", 10)

    db.users = [
      {
        id: "staff-1",
        username: "waik-demo-staff",
        password: staffPasswordHash,
        role: "staff",
        name: "Demo Staff Member",
        email: "staff@waik-demo.com",
        createdAt: new Date().toISOString(),
      },
      {
        id: "admin-1",
        username: "waik-demo-admin",
        password: adminPasswordHash,
        role: "admin",
        name: "Demo Admin",
        email: "admin@waik-demo.com",
        createdAt: new Date().toISOString(),
      },
    ]

    db.incidents = []

    isInitialized = true
    console.log("[DB] In-memory database initialized with demo data")
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
 * Refresh database (no-op for in-memory)
 */
export async function refreshDb(): Promise<void> {
  console.log("[DB] In-memory database - no refresh needed")
}

/**
 * Get database path (returns placeholder for in-memory)
 */
export function getDbPath(): string {
  return "in-memory"
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
