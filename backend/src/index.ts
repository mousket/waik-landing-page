import express from "express"
import cors from "cors"
import IncidentService from "./services/incident.service"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/health", (_, res) => {
  res.json({ status: "ok" })
})

app.get("/incidents", async (req, res) => {
  try {
    const { companyId } = req.query
    const incidents = await IncidentService.getIncidents(companyId?.toString())
    res.json(incidents)
  } catch (error) {
    console.error("[IncidentService] Failed to fetch incidents", error)
    res.status(500).json({ error: "Failed to fetch incidents" })
  }
})

app.get("/incidents/:id", async (req, res) => {
  try {
    const incident = await IncidentService.getIncidentById(req.params.id)
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" })
    }
    res.json(incident)
  } catch (error) {
    console.error("[IncidentService] Failed to fetch incident", error)
    res.status(500).json({ error: "Failed to fetch incident" })
  }
})

app.get("/staff/:staffId/incidents", async (req, res) => {
  try {
    const incidents = await IncidentService.getIncidentsByStaffId(req.params.staffId)
    res.json(incidents)
  } catch (error) {
    console.error("[IncidentService] Failed to fetch staff incidents", error)
    res.status(500).json({ error: "Failed to fetch incidents for staff member" })
  }
})

app.post("/incidents", async (req, res) => {
  try {
    const incident = await IncidentService.createIncident(req.body)
    res.status(201).json(incident)
  } catch (error) {
    console.error("[IncidentService] Failed to create incident", error)
    res.status(500).json({ error: "Failed to create incident" })
  }
})

app.patch("/incidents/:id", async (req, res) => {
  try {
    const incident = await IncidentService.updateIncident(req.params.id, req.body)
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" })
    }
    res.json(incident)
  } catch (error) {
    console.error("[IncidentService] Failed to update incident", error)
    res.status(500).json({ error: "Failed to update incident" })
  }
})

app.post("/incidents/:id/questions", async (req, res) => {
  try {
    const question = await IncidentService.addQuestionToIncident(req.params.id, req.body)
    res.status(201).json(question)
  } catch (error) {
    console.error("[IncidentService] Failed to add question", error)
    res.status(500).json({ error: "Failed to add question" })
  }
})

app.post("/incidents/:incidentId/questions/:questionId/answer", async (req, res) => {
  try {
    const answer = await IncidentService.answerQuestion(req.params.incidentId, req.params.questionId, req.body)
    if (!answer) {
      return res.status(404).json({ error: "Question not found" })
    }
    res.json(answer)
  } catch (error) {
    console.error("[IncidentService] Failed to save answer", error)
    res.status(500).json({ error: "Failed to save answer" })
  }
})

app.delete("/incidents/:incidentId/questions/:questionId", async (req, res) => {
  try {
    const removed = await IncidentService.deleteQuestion(req.params.incidentId, req.params.questionId)
    if (!removed) {
      return res.status(404).json({ error: "Question not found or already answered" })
    }
    res.status(204).send()
  } catch (error) {
    console.error("[IncidentService] Failed to delete question", error)
    res.status(500).json({ error: "Failed to delete question" })
  }
})

app.get("/users/:userId/notifications", async (req, res) => {
  try {
    const notifications = await IncidentService.getNotificationsForUser(req.params.userId)
    res.json(notifications)
  } catch (error) {
    console.error("[IncidentService] Failed to fetch notifications", error)
    res.status(500).json({ error: "Failed to fetch notifications" })
  }
})

app.post("/notifications", async (req, res) => {
  try {
    const notification = await IncidentService.createNotification(req.body)
    res.status(201).json(notification)
  } catch (error) {
    console.error("[IncidentService] Failed to create notification", error)
    res.status(500).json({ error: "Failed to create notification" })
  }
})

app.post("/notifications/:notificationId/read", async (req, res) => {
  try {
    await IncidentService.markNotificationRead(req.params.notificationId)
    res.status(204).send()
  } catch (error) {
    console.error("[IncidentService] Failed to mark notification read", error)
    res.status(500).json({ error: "Failed to mark notification as read" })
  }
})

const port = process.env.PORT ? Number(process.env.PORT) : 4000

if (require.main === module) {
  app.listen(port, () => {
    console.log(`[IncidentService] API listening on port ${port}`)
  })
}

export default app

