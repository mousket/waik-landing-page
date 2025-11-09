"use client"
import { useEffect, useRef } from "react"

interface CompanionWaveAnimationProps {
  isListening: boolean
  isSpeaking: boolean
}

export function CompanionWaveAnimation({ isListening, isSpeaking }: CompanionWaveAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    let animationId: number
    let time = 0

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      const centerX = canvas.offsetWidth / 2
      const centerY = canvas.offsetHeight / 2

      if (isSpeaking) {
        time += 0.15
        const numWaves = 5
        for (let i = 0; i < numWaves; i++) {
          const radius = 40 + i * 20 + Math.sin(time + i * 0.5) * 15
          const alpha = 0.6 - i * 0.1

          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
          gradient.addColorStop(0, `rgba(139, 92, 246, ${alpha})`) // Purple
          gradient.addColorStop(0.5, `rgba(99, 102, 241, ${alpha})`) // Indigo
          gradient.addColorStop(1, `rgba(59, 130, 246, ${alpha * 0.3})`) // Blue

          ctx.beginPath()
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }
      } else if (isListening) {
        time += 0.12
        const bars = 32
        const angleStep = (Math.PI * 2) / bars

        for (let i = 0; i < bars; i++) {
          const angle = i * angleStep
          const waveHeight = Math.abs(Math.sin(time + i * 0.3)) * 40 + 20
          const x1 = centerX + Math.cos(angle) * 60
          const y1 = centerY + Math.sin(angle) * 60
          const x2 = centerX + Math.cos(angle) * (60 + waveHeight)
          const y2 = centerY + Math.sin(angle) * (60 + waveHeight)

          const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
          gradient.addColorStop(0, "rgba(68, 218, 210, 0.8)") // Turquoise
          gradient.addColorStop(1, "rgba(59, 130, 246, 0.3)") // Blue

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.lineWidth = 4
          ctx.strokeStyle = gradient
          ctx.lineCap = "round"
          ctx.stroke()
        }
      } else {
        time += 0.05
        const baseRadius = 60
        const pulseRadius = baseRadius + Math.sin(time) * 10

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius)
        gradient.addColorStop(0, "rgba(139, 92, 246, 0.6)") // Purple
        gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.4)") // Indigo
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.1)") // Blue

        ctx.beginPath()
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Inner glow
        const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30)
        innerGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)")
        innerGradient.addColorStop(1, "rgba(255, 255, 255, 0)")

        ctx.beginPath()
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2)
        ctx.fillStyle = innerGradient
        ctx.fill()
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [isListening, isSpeaking])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
