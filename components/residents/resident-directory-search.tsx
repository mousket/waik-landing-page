import { Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ResidentDirectorySearch({
  value,
  onChange,
  onSubmit,
  loading = false,
  placeholder = "Search by name or room number…",
  submitLabel = "Search",
  showSubmitButton = false,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  loading?: boolean
  placeholder?: string
  submitLabel?: string
  showSubmitButton?: boolean
}) {
  return (
    <div className="flex min-h-12 flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          className="min-h-12 w-full pl-9"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type="search"
        />
      </div>
      {showSubmitButton ? (
        <Button type="button" variant="secondary" className="min-h-12 sm:w-28" onClick={onSubmit}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </Button>
      ) : null}
    </div>
  )
}
