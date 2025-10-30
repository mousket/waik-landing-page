"use client"
import { useEffect, useRef } from "react"

export function VoiceWaveAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
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

    // Wave parameters
    const bars = 40
    const barWidth = canvas.offsetWidth / bars
    const colors = ["#44DAD2", "#8B5CF6", "#44DAD2", "#8B5CF6"] // Turquoise and purple

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      time += 0.05

      for (let i = 0; i < bars; i++) {
        // Create wave effect with different frequencies
        const height =
          Math.sin(time + i * 0.3) * 20 + Math.sin(time * 1.5 + i * 0.2) * 15 + Math.sin(time * 0.8 + i * 0.4) * 10 + 30

        const x = i * barWidth
        const y = canvas.offsetHeight / 2 - height / 2

        // Gradient for each bar
        const gradient = ctx.createLinearGradient(x, y, x, y + height)
        gradient.addColorStop(0, colors[i % colors.length] + "80")
        gradient.addColorStop(1, colors[i % colors.length] + "20")

        ctx.fillStyle = gradient
        ctx.fillRect(x, y, barWidth - 2, height)
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
