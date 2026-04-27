import { StaffIncidentDetailView } from "@/components/staff/staff-incident-detail-view"

export default async function StaffIncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StaffIncidentDetailView incidentId={id} />
}
