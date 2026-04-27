import * as React from "react"

export interface CompletionRingProps {
  percent: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  colorOverride?: string
}

export function CompletionRing({
  percent,
  size = 40,
  strokeWidth = 3,
  showLabel = true,
  colorOverride,
}: CompletionRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorOverride ?? "#0D7377"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel ? (
        <span
          className="absolute font-semibold tabular-nums"
          style={{ fontSize: size * 0.28, color: "#1E2B2C" }}
        >
          {clamped}%
        </span>
      ) : null}
    </div>
  )
}
