import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatResidentCareLevel,
  formatResidentDate,
  residentFullName,
  type ResidentDirectoryRow,
} from "@/lib/types/resident-directory"

export function ResidentDirectoryTable({
  residents,
  loading,
  variant,
  emptyMessage,
  getResidentHref,
}: {
  residents: ResidentDirectoryRow[]
  loading: boolean
  variant: "staff" | "admin"
  emptyMessage: string
  getResidentHref: (resident: ResidentDirectoryRow) => string
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <Table>
        <TableHeader>
          {variant === "staff" ? (
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Care</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="w-[1%] text-right" />
            </TableRow>
          ) : (
            <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Room</TableHead>
              <TableHead className="font-semibold">Care level</TableHead>
              <TableHead className="text-right font-semibold"># Inc (30d)</TableHead>
              <TableHead className="font-semibold">Last asmt</TableHead>
              <TableHead className="font-semibold">Next due</TableHead>
              <TableHead className="w-[90px] font-semibold" />
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {residents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={variant === "staff" ? 5 : 7} className="py-10 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : variant === "staff" ? (
            residents.map((resident) => (
              <TableRow key={resident.id}>
                <TableCell className="font-medium">{resident.roomNumber || "—"}</TableCell>
                <TableCell>{residentFullName(resident)}</TableCell>
                <TableCell className="hidden sm:table-cell">{formatResidentCareLevel(resident.careLevel)}</TableCell>
                <TableCell className="hidden sm:table-cell capitalize">{resident.status ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button asChild className="min-h-9" size="sm" variant="outline">
                    <Link href={getResidentHref(resident)}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            residents.map((resident) => (
              <TableRow key={resident.id} className="border-border transition-colors hover:bg-muted/30">
                <TableCell className="font-medium">{residentFullName(resident)}</TableCell>
                <TableCell>{resident.roomNumber || "—"}</TableCell>
                <TableCell className="capitalize">{formatResidentCareLevel(resident.careLevel)}</TableCell>
                <TableCell className="text-right tabular-nums">{resident.incidents30d ?? 0}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatResidentDate(resident.lastAssessmentAt)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatResidentDate(resident.nextDueAt)}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="h-8 px-2" asChild>
                    <Link href={getResidentHref(resident)}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
