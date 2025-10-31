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
    // Additional staff members (for realistic sample data)
    {
      id: "user-3",
      username: "james-martinez",
      password: "demo-password",
      role: "staff",
      name: "James Martinez",
      email: "james@waik-demo.com",
      createdAt: "2024-01-10T10:00:00Z",
    },
    {
      id: "user-4",
      username: "emily-davis",
      password: "demo-password",
      role: "staff",
      name: "Emily Davis",
      email: "emily@waik-demo.com",
      createdAt: "2024-01-12T10:00:00Z",
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
    // Incidents from other staff members (Admin can see these, Sarah cannot)
    {
      id: "inc-4",
      title: "Wandering Resident - Exit Attempt",
      description: "Resident with dementia attempted to leave through emergency exit",
      status: "in-progress",
      priority: "high",
      staffId: "user-3",
      staffName: "James Martinez",
      residentName: "Harold Bennett",
      residentRoom: "156",
      createdAt: "2024-01-22T14:15:00Z",
      updatedAt: "2024-01-22T16:30:00Z",
      questions: [
        {
          id: "q-4",
          incidentId: "inc-4",
          questionText: "What security measures were in place?",
          askedBy: "admin",
          askedAt: "2024-01-22T15:00:00Z",
          answer: {
            id: "a-4",
            questionId: "q-4",
            answerText: "Door alarm was active. I was able to redirect the resident before he reached the door. He was looking for his wife.",
            answeredBy: "user-3",
            answeredAt: "2024-01-22T16:30:00Z",
            method: "voice",
          },
        },
      ],
      summary: null,
    },
    {
      id: "inc-5",
      title: "Aggressive Behavior Towards Staff",
      description: "Resident became verbally aggressive during medication administration",
      status: "pending-review",
      priority: "medium",
      staffId: "user-3",
      staffName: "James Martinez",
      residentName: "Patricia Moore",
      residentRoom: "223",
      createdAt: "2024-01-21T16:45:00Z",
      updatedAt: "2024-01-21T17:00:00Z",
      questions: [
        {
          id: "q-5",
          incidentId: "inc-5",
          questionText: "What triggered the behavior?",
          askedBy: "admin",
          askedAt: "2024-01-21T17:00:00Z",
        },
      ],
      summary: null,
    },
    {
      id: "inc-6",
      title: "Skin Tear - Left Forearm",
      description: "Small skin tear discovered during morning care",
      status: "closed",
      priority: "low",
      staffId: "user-4",
      staffName: "Emily Davis",
      residentName: "Dorothy Wilson",
      residentRoom: "145",
      createdAt: "2024-01-20T09:20:00Z",
      updatedAt: "2024-01-20T10:45:00Z",
      questions: [
        {
          id: "q-6",
          incidentId: "inc-6",
          questionText: "Was family notified?",
          askedBy: "admin",
          askedAt: "2024-01-20T10:00:00Z",
          answer: {
            id: "a-6",
            questionId: "q-6",
            answerText: "Yes, daughter was called immediately. She was understanding and thanked us for the prompt care.",
            answeredBy: "user-4",
            answeredAt: "2024-01-20T10:45:00Z",
            method: "text",
          },
        },
      ],
      summary: "Minor skin tear treated with proper wound care protocol. Family notified and satisfied with response.",
    },
    {
      id: "inc-7",
      title: "Missed Breakfast Meal",
      description: "Resident refused breakfast, became dizzy by lunch",
      status: "open",
      priority: "medium",
      staffId: "user-4",
      staffName: "Emily Davis",
      residentName: "George Anderson",
      residentRoom: "302",
      createdAt: "2024-01-23T11:30:00Z",
      updatedAt: "2024-01-23T11:30:00Z",
      questions: [],
      summary: null,
    },
    {
      id: "inc-8",
      title: "Equipment Malfunction - Wheelchair",
      description: "Wheelchair brake failed during transfer attempt",
      status: "open",
      priority: "urgent",
      staffId: "user-3",
      staffName: "James Martinez",
      residentName: "Alice Thompson",
      residentRoom: "189",
      createdAt: "2024-01-23T13:00:00Z",
      updatedAt: "2024-01-23T13:00:00Z",
      questions: [
        {
          id: "q-7",
          incidentId: "inc-8",
          questionText: "Was the resident injured during the incident?",
          askedBy: "admin",
          askedAt: "2024-01-23T13:15:00Z",
        },
        {
          id: "q-8",
          incidentId: "inc-8",
          questionText: "Has the wheelchair been taken out of service?",
          askedBy: "admin",
          askedAt: "2024-01-23T13:16:00Z",
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
