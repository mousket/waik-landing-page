"use client"
import { useEffect, useRef } from "react"

export function LoginWaveAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Animation variables
    let animationId: number
    let time = 0

    // Wave parameters - more subtle and elegant
    const waves = 3
    const colors = [
      { color: "#44DAD2", opacity: 0.15 }, // Turquoise
      { color: "#3B82F6", opacity: 0.12 }, // Blue
      { color: "#8B5CF6", opacity: 0.1 }, // Purple
    ]

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      time += 0.008 // Slower, more elegant movement

      for (let w = 0; w < waves; w++) {
        ctx.beginPath()

        const amplitude = 40 + w * 15
        const frequency = 0.015 - w * 0.003
        const phase = time + w * 0.5
        const yOffset = canvas.offsetHeight / 2 + w * 30

        // Draw smooth wave
        for (let x = 0; x < canvas.offsetWidth; x++) {
          const y =
            Math.sin(x * frequency + phase) * amplitude +
            Math.sin(x * frequency * 2 + phase * 1.5) * (amplitude * 0.5) +
            yOffset

          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        // Complete the path to create filled area
        ctx.lineTo(canvas.offsetWidth, canvas.offsetHeight)
        ctx.lineTo(0, canvas.offsetHeight)
        ctx.closePath()

        // Apply gradient fill
        const gradient = ctx.createLinearGradient(0, yOffset - amplitude, 0, canvas.offsetHeight)
        gradient.addColorStop(
          0,
          colors[w].color +
            Math.floor(colors[w].opacity * 255)
              .toString(16)
              .padStart(2, "0"),
        )
        gradient.addColorStop(1, colors[w].color + "00")

        ctx.fillStyle = gradient
        ctx.fill()
      }

      animationId = requestAnimationFrame(animate)
    }

    if (!reduceMotion) {
      animate()
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (!reduceMotion) cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
