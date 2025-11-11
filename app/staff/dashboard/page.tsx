"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Clock, CheckCircle2, Plus, Search, Filter } from "lucide-react"
import type { Incident } from "@/lib/types"

export default function StaffDashboard() {
  const router = useRouter()
  const { name, userId } = useAuthStore() // Use the imported useAuthStore
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  useEffect(() => {
    if (userId) {
      fetchIncidents()
    }
  }, [userId])

  useEffect(() => {
    filterAndSortIncidents()
  }, [incidents, searchQuery, statusFilter, priorityFilter, sortBy])

  const fetchIncidents = async () => {
    if (!userId) return

    try {
      const response = await fetch(`/api/staff/incidents?staffId=${userId}`)
      if (!response.ok) throw new Error("Failed to fetch incidents")
      const data = await response.json()
      setIncidents(data.incidents)
    } catch (error) {
      console.error("[v0] Error fetching incidents:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortIncidents = () => {
    let filtered = [...incidents]

    if (searchQuery) {
      filtered = filtered.filter(
        (incident) =>
          incident.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.residentRoom.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((incident) => incident.status === statusFilter)
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((incident) => incident.priority === priorityFilter)
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "priority":
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
          return (
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder]
          )
        case "resident":
          return a.residentName.localeCompare(b.residentName)
        default:
          return 0
      }
    })

    setFilteredIncidents(filtered)
  }

  const openIncidents = incidents.filter((i) => i.status === "open")
  const pendingQuestions = incidents.reduce((count, incident) => {
    return count + incident.questions.filter((q) => !q.answer).length
  }, 0)
  const completedToday = incidents.filter((i) => {
    const today = new Date().toDateString()
    return i.status === "closed" && new Date(i.updatedAt).toDateString() === today
  }).length

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

        <div
          className="absolute inset-0 opacity-20 sm:opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div
          className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[600px] lg:h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[500px] lg:h-[500px] bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "10s", animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] bg-primary/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "12s", animationDelay: "4s" }}
        />

        <div className="absolute inset-0 overflow-hidden hidden sm:block">
          <div
            className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse"
            style={{ animationDuration: "6s", transform: "translateY(200px) rotate(45deg)" }}
          />
          <div
            className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent animate-pulse"
            style={{ animationDuration: "8s", animationDelay: "2s", transform: "translateY(400px) rotate(-45deg)" }}
          />
        </div>

        <div
          className="absolute top-20 right-4 sm:right-20 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 border border-primary/10 rounded-lg rotate-12 animate-pulse"
          style={{ animationDuration: "7s" }}
        />
        <div
          className="absolute bottom-20 left-4 sm:left-40 w-12 h-12 sm:w-20 sm:h-20 lg:w-24 lg:h-24 border border-accent/10 rounded-full animate-pulse"
          style={{ animationDuration: "9s", animationDelay: "1s" }}
        />
      </div>

      <div className="space-y-6 sm:space-y-8 relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome back, {name}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Here's an overview of your incident reports and pending tasks.
            </p>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
            onClick={() => router.push("/incidents/create")}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Incident
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
              <AlertCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{openIncidents.length}</div>
              <p className="text-xs text-muted-foreground">Assigned to you</p>
            </CardContent>
          </Card>

          <Card className="border-accent/20 hover:border-accent/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Questions</CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{pendingQuestions}</div>
              <p className="text-xs text-muted-foreground">Awaiting your response</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{completedToday}</div>
              <p className="text-xs text-muted-foreground">Great work!</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Your Incidents
            </CardTitle>
            <CardDescription className="text-sm">All incidents assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by resident name, incident type, or room..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="pending-review">Pending Review</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="resident">Resident Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                  ? "No incidents match your filters"
                  : "No incidents assigned to you yet"}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredIncidents.map((incident) => {
                  const unansweredCount = incident.questions.filter((q) => !q.answer).length
                  return (
                    <div
                      key={incident.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border rounded-lg hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-1 flex-1">
                        <p className="font-medium text-sm sm:text-base">{incident.title}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {incident.residentName} • Room {incident.residentRoom}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(incident.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getPriorityColor(incident.priority)} className="text-xs">
                          {incident.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {incident.status.toUpperCase()}
                        </Badge>
                        {unansweredCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {unansweredCount} Question{unansweredCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-xs sm:text-sm w-full sm:w-auto"
                          onClick={() => router.push(`/staff/incidents/${incident.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
