"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/lib/auth-store"
import { AlertTriangle, Clock, CheckCircle2, TrendingUp, Search, Filter } from "lucide-react"
import type { Incident } from "@/lib/types"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminDashboard() {
  const router = useRouter()
  const { name } = useAuthStore()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  useEffect(() => {
    fetchIncidents()
  }, [])

  useEffect(() => {
    filterAndSortIncidents()
  }, [incidents, searchQuery, statusFilter, priorityFilter, sortBy])

  const fetchIncidents = async () => {
    try {
      const response = await fetch("/api/incidents")
      if (response.ok) {
        const data = await response.json()
        setIncidents(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching incidents:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortIncidents = () => {
    let filtered = [...incidents]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (incident) =>
          incident.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.residentRoom.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((incident) => incident.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((incident) => incident.priority === priorityFilter)
    }

    // Sort
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

  const stats = {
    totalIncidents: incidents.length,
    openIncidents: incidents.filter((i) => i.status === "open" || i.status === "in-progress").length,
    urgentIncidents: incidents.filter((i) => i.priority === "urgent").length,
    resolvedThisWeek: incidents.filter((i) => i.status === "closed").length,
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-orange-500">Urgent</Badge>
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-500">Medium</Badge>
      case "low":
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline">Open</Badge>
      case "in-progress":
        return <Badge variant="secondary">In Progress</Badge>
      case "pending-review":
        return <Badge className="bg-blue-500">Pending Review</Badge>
      case "closed":
        return <Badge className="bg-green-500">Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-primary/5" />
        <div
          className="absolute inset-0 opacity-20 sm:opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--accent)) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute top-0 left-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[600px] lg:h-[600px] bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "9s" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[500px] lg:h-[500px] bg-primary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "11s", animationDelay: "3s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] bg-accent/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "13s", animationDelay: "5s" }}
        />
        <div className="absolute inset-0 overflow-hidden hidden sm:block">
          <div
            className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent animate-pulse"
            style={{ animationDuration: "7s", transform: "translateY(250px) rotate(-45deg)" }}
          />
          <div
            className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse"
            style={{ animationDuration: "9s", animationDelay: "3s", transform: "translateY(450px) rotate(45deg)" }}
          />
        </div>
        <div
          className="absolute top-20 left-4 sm:left-20 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 border border-accent/10 rounded-lg -rotate-12 animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-20 right-4 sm:right-40 w-12 h-12 sm:w-20 sm:h-20 lg:w-24 lg:h-24 border border-primary/10 rounded-full animate-pulse"
          style={{ animationDuration: "10s", animationDelay: "2s" }}
        />
      </div>

      <div className="space-y-6 sm:space-y-8 relative">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Monitor and manage all incident reports across your facility.
          </p>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Incidents</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-primary">{stats.totalIncidents}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="border-accent/20 hover:border-accent/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Open Incidents</CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-accent">{stats.openIncidents}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card className="border-orange-500/20 hover:border-orange-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Urgent</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-orange-500">{stats.urgentIncidents}</div>
              <p className="text-xs text-muted-foreground">Immediate action</p>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 hover:border-green-500/40 transition-colors col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Resolved This Week</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-500">{stats.resolvedThisWeek}</div>
              <p className="text-xs text-muted-foreground">Great progress!</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              All Incidents
            </CardTitle>
            <CardDescription className="text-sm">Click on any incident to view details and manage</CardDescription>
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
              <div className="text-center py-8 text-muted-foreground">Loading incidents...</div>
            ) : filteredIncidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                  ? "No incidents match your filters"
                  : "No incidents found"}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border rounded-lg hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/incidents/${incident.id}`)}
                  >
                    <div className="space-y-1 flex-1">
                      <p className="font-medium text-sm sm:text-base">{incident.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {incident.residentName} • Room {incident.residentRoom}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(incident.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getPriorityBadge(incident.priority)}
                      {getStatusBadge(incident.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary/20 hover:border-primary/40 bg-transparent text-xs sm:text-sm w-full sm:w-auto"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/admin/incidents/${incident.id}`)
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
