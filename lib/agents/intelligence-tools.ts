/**
 * LangChain Tools for Intelligence Agent
 * Allows the agent to take actions like sending questions to staff
 */

import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { getUsers, addQuestionToIncident } from "../db"

/**
 * Tool: Search for staff members by name
 */
export const searchStaffTool = new DynamicStructuredTool({
  name: "search_staff",
  description: "Search for staff members by name. Use this when the user mentions a staff member name (e.g., 'send to Sarah', 'ask James'). Returns matching staff members with their IDs.",
  schema: z.object({
    searchQuery: z.string().describe("The name to search for (e.g., 'Sarah', 'James Martinez')"),
  }),
  func: async ({ searchQuery }) => {
    console.log("[Tool] Searching for staff:", searchQuery)
    
    const users = await getUsers()
    const staff = users.filter(u => u.role === "staff")
    
    // Search by name (case-insensitive, partial match)
    const query = searchQuery.toLowerCase()
    const matches = staff.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.username.toLowerCase().includes(query)
    )
    
    if (matches.length === 0) {
      return JSON.stringify({
        found: false,
        message: `No staff members found matching "${searchQuery}". Available staff: ${staff.map(s => s.name).join(", ")}`
      })
    }
    
    if (matches.length === 1) {
      return JSON.stringify({
        found: true,
        count: 1,
        staff: [{ id: matches[0].id, name: matches[0].name }],
        message: `Found: ${matches[0].name}`
      })
    }
    
    return JSON.stringify({
      found: true,
      count: matches.length,
      staff: matches.map(s => ({ id: s.id, name: s.name })),
      message: `Found ${matches.length} staff members: ${matches.map(s => s.name).join(", ")}`
    })
  },
})

/**
 * Tool: Send a question to staff member(s)
 */
export const sendQuestionToStaffTool = new DynamicStructuredTool({
  name: "send_question_to_staff",
  description: "Send a follow-up question to one or more staff members. Use this when the user confirms they want to send a question. Requires the incident ID, question text, who's asking, and staff member ID(s).",
  schema: z.object({
    incidentId: z.string().describe("The incident ID (e.g., 'inc-1')"),
    questionText: z.string().describe("The question to send to staff"),
    askedBy: z.string().describe("User ID of who's asking the question"),
    staffIds: z.array(z.string()).describe("Array of staff user IDs to assign the question to"),
  }),
  func: async ({ incidentId, questionText, askedBy, staffIds }) => {
    console.log("[Tool] Sending question to staff:", { incidentId, staffIds })
    
    try {
      // Create the question object
      const question = {
        id: `q-${Date.now()}`,
        incidentId,
        questionText,
        askedBy,
        askedAt: new Date().toISOString(),
        assignedTo: staffIds,
      }
      
      // Add to database
      const success = await addQuestionToIncident(incidentId, question)
      
      if (!success) {
        return JSON.stringify({
          success: false,
          message: "Failed to send question. Incident not found."
        })
      }
      
      // Get staff names for confirmation
      const users = await getUsers()
      const staffNames = staffIds
        .map(id => users.find(u => u.id === id)?.name || id)
        .join(", ")
      
      return JSON.stringify({
        success: true,
        questionId: question.id,
        assignedTo: staffNames,
        message: `✅ Question sent to ${staffNames}. They'll be notified and can respond in the Q&A section.`
      })
    } catch (error) {
      console.error("[Tool] Error sending question:", error)
      return JSON.stringify({
        success: false,
        message: `Error sending question: ${error instanceof Error ? error.message : "Unknown error"}`
      })
    }
  },
})

/**
 * Tool: Get assigned staff for an incident
 */
export const getAssignedStaffTool = new DynamicStructuredTool({
  name: "get_assigned_staff",
  description: "Get the staff member(s) assigned to a specific incident. Use this to find out who's handling an incident.",
  schema: z.object({
    incidentId: z.string().describe("The incident ID (e.g., 'inc-1')"),
  }),
  func: async ({ incidentId }) => {
    console.log("[Tool] Getting assigned staff for:", incidentId)
    
    const { getIncidentById } = await import("../db")
    const incident = await getIncidentById(incidentId)
    
    if (!incident) {
      return JSON.stringify({
        found: false,
        message: "Incident not found"
      })
    }
    
    return JSON.stringify({
      found: true,
      staffId: incident.staffId,
      staffName: incident.staffName,
      message: `${incident.staffName} is assigned to this incident`
    })
  },
})

