import type { Database, Incident, User } from "./types"
import { Low } from "lowdb"
import { JSONFile } from "lowdb/node"
import path from "path"
import bcrypt from "bcrypt"

// Initialize lowdb with JSON file adapter
const dbPath = path.join(process.cwd(), "data", "db.json")
const adapter = new JSONFile<Database>(dbPath)
const db = new Low<Database>(adapter, { users: [], incidents: [] })

// Initialize database - must be called before using
let isInitialized = false

async function initializeDb() {
  if (!isInitialized) {
    await db.read()
    
    // If database is empty, initialize with empty arrays
    db.data ||= { users: [], incidents: [] }
    
    isInitialized = true
    console.log("[DB] Database initialized from:", dbPath)
  }
}

// Auto-initialize on import (for Next.js API routes)
initializeDb().catch((err) => console.error("[DB] Initialization error:", err))

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export function getDb(): Database {
  return db.data
}

export function getUsers(): User[] {
  return db.data.users
}

export async function getUserByCredentials(username: string, password: string): Promise<User | null> {
  await initializeDb()
  
  const user = db.data.users.find((u) => u.username === username)
  if (!user) return null

  // Compare password with hashed password
  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return null

  return user
}

export function getUserById(id: string): User | null {
  return db.data.users.find((u) => u.id === id) || null
}

// ============================================================================
// INCIDENT FUNCTIONS
// ============================================================================

export function getIncidents(): Incident[] {
  return db.data.incidents
}

export function getIncidentById(id: string): Incident | null {
  return db.data.incidents.find((i) => i.id === id) || null
}

export function getIncidentsByStaffId(staffId: string): Incident[] {
  return db.data.incidents.filter((i) => i.staffId === staffId)
}

export async function updateIncident(id: string, updates: Partial<Incident>): Promise<Incident | null> {
  await initializeDb()
  
  const index = db.data.incidents.findIndex((i) => i.id === id)
  if (index === -1) return null

  db.data.incidents[index] = {
    ...db.data.incidents[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  await db.write()
  return db.data.incidents[index]
}

export async function addIncident(incident: Incident): Promise<Incident> {
  await initializeDb()
  
  db.data.incidents.push(incident)
  await db.write()
  
  return incident
}

// ============================================================================
// QUESTION & ANSWER FUNCTIONS
// ============================================================================

export async function addQuestionToIncident(
  incidentId: string,
  question: Incident["questions"][0],
): Promise<boolean> {
  await initializeDb()
  
  const incident = getIncidentById(incidentId)
  if (!incident) return false

  incident.questions.push(question)
  incident.updatedAt = new Date().toISOString()
  
  await db.write()
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
  
  await db.write()
  return true
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Force a read from disk (useful for debugging)
 */
export async function refreshDb(): Promise<void> {
  await db.read()
  console.log("[DB] Database refreshed from disk")
}

/**
 * Get database file path
 */
export function getDbPath(): string {
  return dbPath
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
