import type { Database, Incident, User } from "./types"

// In-memory database that persists during server runtime
const database: Database = {
  users: [
    {
      id: "user-1",
      username: "waik-demo-staff",
      password: "waik1+demo-staff!@#",
      role: "staff",
      name: "Sarah Johnson",
      email: "sarah@waik-demo.com",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "user-2",
      username: "waik-demo-admin",
      password: "waik1+demo-admin!@#",
      role: "admin",
      name: "Michael Chen",
      email: "michael@waik-demo.com",
      createdAt: "2024-01-15T10:00:00Z",
    },
  ],
  incidents: [
    {
      id: "inc-1",
      title: "Resident Fall in Room 204",
      description: "Resident experienced a fall while getting out of bed",
      status: "open",
      priority: "high",
      staffId: "user-1",
      staffName: "Sarah Johnson",
      residentName: "Margaret Thompson",
      residentRoom: "204",
      createdAt: "2024-01-20T08:30:00Z",
      updatedAt: "2024-01-20T08:30:00Z",
      questions: [
        {
          id: "q-1",
          incidentId: "inc-1",
          questionText: "What time did the incident occur?",
          askedBy: "admin",
          askedAt: "2024-01-20T09:00:00Z",
          answer: {
            id: "a-1",
            questionId: "q-1",
            answerText: "The fall occurred at approximately 8:15 AM when I was doing morning rounds.",
            answeredBy: "user-1",
            answeredAt: "2024-01-20T09:15:00Z",
            method: "text",
          },
        },
        {
          id: "q-2",
          incidentId: "inc-1",
          questionText: "Was the resident injured?",
          askedBy: "admin",
          askedAt: "2024-01-20T09:05:00Z",
          answer: {
            id: "a-2",
            questionId: "q-2",
            answerText: "Minor bruising on the left hip. Nurse assessed and applied ice pack.",
            answeredBy: "user-1",
            answeredAt: "2024-01-20T09:20:00Z",
            method: "voice",
          },
        },
      ],
      summary: null,
    },
    {
      id: "inc-2",
      title: "Medication Administration Delay",
      description: "Morning medication was administered 30 minutes late",
      status: "open",
      priority: "medium",
      staffId: "user-1",
      staffName: "Sarah Johnson",
      residentName: "Robert Williams",
      residentRoom: "312",
      createdAt: "2024-01-21T10:00:00Z",
      updatedAt: "2024-01-21T10:00:00Z",
      questions: [],
      summary: null,
    },
    {
      id: "inc-3",
      title: "Dietary Restriction Not Followed",
      description: "Resident with lactose intolerance received dairy-containing meal",
      status: "open",
      priority: "low",
      staffId: "user-1",
      staffName: "Sarah Johnson",
      residentName: "Elizabeth Davis",
      residentRoom: "108",
      createdAt: "2024-01-22T12:30:00Z",
      updatedAt: "2024-01-22T12:30:00Z",
      questions: [
        {
          id: "q-3",
          incidentId: "inc-3",
          questionText: "How did you discover the dietary error?",
          askedBy: "admin",
          askedAt: "2024-01-22T13:00:00Z",
        },
      ],
      summary: null,
    },
  ],
}

export function getDb(): Database {
  return database
}

export function getUsers(): User[] {
  return database.users
}

export function getUserByCredentials(username: string, password: string): User | null {
  return database.users.find((u) => u.username === username && u.password === password) || null
}

export function getIncidents(): Incident[] {
  return database.incidents
}

export function getIncidentById(id: string): Incident | null {
  return database.incidents.find((i) => i.id === id) || null
}

export function getIncidentsByStaffId(staffId: string): Incident[] {
  return database.incidents.filter((i) => i.staffId === staffId)
}

export function updateIncident(id: string, updates: Partial<Incident>): Incident | null {
  const index = database.incidents.findIndex((i) => i.id === id)

  if (index === -1) return null

  database.incidents[index] = {
    ...database.incidents[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  return database.incidents[index]
}

export function addIncident(incident: Incident): Incident {
  database.incidents.push(incident)
  return incident
}

export function addQuestionToIncident(incidentId: string, question: Incident["questions"][0]): boolean {
  const incident = getIncidentById(incidentId)
  if (!incident) return false

  incident.questions.push(question)
  incident.updatedAt = new Date().toISOString()
  return true
}

export function answerQuestion(
  incidentId: string,
  questionId: string,
  answer: Incident["questions"][0]["answer"],
): boolean {
  const incident = getIncidentById(incidentId)
  if (!incident) return false

  const question = incident.questions.find((q) => q.id === questionId)
  if (!question) return false

  question.answer = answer
  incident.updatedAt = new Date().toISOString()
  return true
}
