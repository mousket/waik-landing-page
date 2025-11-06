"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mic, MicOff, ArrowRight, Loader2, CheckCircle2, Volume2, VolumeX } from "lucide-react"
import { toast } from "sonner"

type Step = 1 | 2 | 3 | 4

interface VoicePrompt {
  step: Step
  question: string
  field: "residentName" | "roomNumber" | "narrative" | null
}

const VOICE_PROMPTS: VoicePrompt[] = [
  {
    step: 1,
    question:
      "Welcome to the incident reporting system. Let's start by getting some basic information. What is the resident's name?",
    field: "residentName",
  },
  {
    step: 2,
    question: "Thank you. What is the resident's room number?",
    field: "roomNumber",
  },
  {
    step: 3,
    question:
      "Now, please describe what happened. Take your time and provide as much detail as possible about the incident.",
    field: "narrative",
  },
  {
    step: 4,
    question:
      "Thank you for providing that information. I'm now analyzing the report and generating follow-up questions. This will just take a moment.",
    field: null,
  },
]

export default function CreateIncidentPage() {
  const router = useRouter()
  const { userId, userRole, name } = useAuthStore()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [residentName, setResidentName] = useState("")
  const [roomNumber, setRoomNumber] = useState("")
  const [narrative, setNarrative] = useState("")
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Initialize speech recognition
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"
    }

    // Speak the first prompt when page loads
    if (autoSpeak) {
      speakPrompt(VOICE_PROMPTS[0].question)
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      window.speechSynthesis.cancel()
    }
  }, [])

  const speakPrompt = (text: string) => {
    if (!autoSpeak) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  const startVoiceRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Voice recognition is not supported in your browser")
      return
    }

    setIsListening(true)

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      const currentPrompt = VOICE_PROMPTS[currentStep - 1]

      if (currentPrompt.field === "residentName") {
        setResidentName(transcript)
      } else if (currentPrompt.field === "roomNumber") {
        setRoomNumber(transcript)
      } else if (currentPrompt.field === "narrative") {
        setNarrative(transcript)
      }

      setIsListening(false)
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error("[v0] Speech recognition error:", event.error)
      toast.error("Error recognizing speech. Please try again.")
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error("[v0] Error starting recognition:", error)
      setIsListening(false)
    }
  }

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  const handleNext = () => {
    const currentPrompt = VOICE_PROMPTS[currentStep - 1]

    // Validate current step
    if (currentPrompt.field === "residentName" && !residentName.trim()) {
      toast.error("Please provide the resident's name")
      return
    }
    if (currentPrompt.field === "roomNumber" && !roomNumber.trim()) {
      toast.error("Please provide the room number")
      return
    }
    if (currentPrompt.field === "narrative" && !narrative.trim()) {
      toast.error("Please provide a description of the incident")
      return
    }

    if (currentStep === 3) {
      // Submit the incident
      handleSubmit()
    } else {
      // Move to next step
      const nextStep = (currentStep + 1) as Step
      setCurrentStep(nextStep)
      const nextPrompt = VOICE_PROMPTS[nextStep - 1]
      if (autoSpeak) {
        speakPrompt(nextPrompt.question)
      }
    }
  }

  const handleSubmit = async () => {
    setIsProcessing(true)
    setCurrentStep(4)

    // Speak the final prompt
    if (autoSpeak) {
      speakPrompt(VOICE_PROMPTS[3].question)
    }

    try {
      const response = await fetch("/api/agent/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residentName,
          roomNumber,
          narrative,
          reportedBy: userId,
          reportedByName: name,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create incident")
      }

      const data = await response.json()

      toast.success("Incident reported successfully!")

      // Wait a moment before redirecting
      setTimeout(() => {
        if (userRole === "admin") {
          router.push("/admin/dashboard")
        } else {
          router.push("/staff/dashboard")
        }
      }, 2000)
    } catch (error) {
      console.error("[v0] Error creating incident:", error)
      toast.error("Failed to create incident. Please try again.")
      setIsProcessing(false)
      setCurrentStep(3)
    }
  }

  const getCurrentValue = () => {
    const currentPrompt = VOICE_PROMPTS[currentStep - 1]
    if (currentPrompt.field === "residentName") return residentName
    if (currentPrompt.field === "roomNumber") return roomNumber
    if (currentPrompt.field === "narrative") return narrative
    return ""
  }

  const setCurrentValue = (value: string) => {
    const currentPrompt = VOICE_PROMPTS[currentStep - 1]
    if (currentPrompt.field === "residentName") setResidentName(value)
    else if (currentPrompt.field === "roomNumber") setRoomNumber(value)
    else if (currentPrompt.field === "narrative") setNarrative(value)
  }

  const currentPrompt = VOICE_PROMPTS[currentStep - 1]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl border-2">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Report New Incident
              </CardTitle>
              <CardDescription className="text-base">
                Step {currentStep} of 4 - Voice-guided incident reporting
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setAutoSpeak(!autoSpeak)
                if (!autoSpeak) {
                  speakPrompt(currentPrompt.question)
                } else {
                  stopSpeaking()
                }
              }}
              className="h-10 w-10"
            >
              {autoSpeak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stop Speaking Button */}
          {isSpeaking && (
            <Button onClick={stopSpeaking} variant="destructive" className="w-full animate-pulse">
              <VolumeX className="mr-2 h-5 w-5" />
              Stop Speaking
            </Button>
          )}

          {/* Voice Prompt */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg border-2 border-primary/20">
            <p className="text-lg font-medium text-foreground leading-relaxed">{currentPrompt.question}</p>
          </div>

          {currentStep < 4 ? (
            <>
              {/* Input Field */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {currentPrompt.field === "residentName" && "Resident Name"}
                  {currentPrompt.field === "roomNumber" && "Room Number"}
                  {currentPrompt.field === "narrative" && "Incident Description"}
                </Label>
                {currentPrompt.field === "narrative" ? (
                  <Textarea
                    value={getCurrentValue()}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="Type or use voice input..."
                    className="min-h-[200px] text-base resize-none"
                  />
                ) : (
                  <Input
                    value={getCurrentValue()}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="Type or use voice input..."
                    className="text-base h-12"
                  />
                )}
              </div>

              {/* Voice Input Button */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                  variant={isListening ? "destructive" : "outline"}
                  className="flex-1 h-14 text-base"
                  disabled={isProcessing}
                >
                  {isListening ? (
                    <>
                      <MicOff className="mr-2 h-5 w-5 animate-pulse" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-5 w-5" />
                      Use Voice Input
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleNext}
                  className="flex-1 h-14 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  disabled={isProcessing || isListening}
                >
                  {currentStep === 3 ? "Submit Report" : "Next"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </>
          ) : (
            // Processing/Success State
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              {isProcessing ? (
                <>
                  <div className="relative">
                    <Loader2 className="h-20 w-20 text-primary animate-spin" />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-xl animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-semibold">Analyzing Report...</p>
                    <p className="text-muted-foreground">Creating incident and generating follow-up questions</p>
                  </div>
                  <div className="w-full max-w-md bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent animate-[shimmer_2s_infinite]" />
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-20 w-20 text-green-500" />
                  <div className="text-center space-y-2">
                    <p className="text-xl font-semibold text-green-600">Report Submitted Successfully!</p>
                    <p className="text-muted-foreground">Redirecting to dashboard...</p>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
