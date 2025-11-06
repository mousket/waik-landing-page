"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mic, MicOff, ArrowRight, Loader2, CheckCircle2, Volume2, VolumeX, Plus } from "lucide-react"
import { toast } from "sonner"

type Step = 1 | 2 | 3 | 4 | 5 | 6

interface VoicePrompt {
  step: Step
  question: string
  field: "residentName" | "roomNumber" | "narrative" | "residentState" | "environmentNotes" | null
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
      "Now, please describe what happened. Take your time and provide as much detail as possible about the incident. You can speak for up to 5 minutes, and you'll be able to add more details if needed.",
    field: "narrative",
  },
  {
    step: 4,
    question:
      "Thank you. Now, please tell me about the resident's current state. How are they doing? What are they wearing? Do they have any visible injuries, bruises, or complaints of pain?",
    field: "residentState",
  },
  {
    step: 5,
    question:
      "Finally, please describe the room and environment. Is there anything notable about the room, furniture placement, lighting, or environmental factors that could be relevant to this incident?",
    field: "environmentNotes",
  },
  {
    step: 6,
    question:
      "Thank you for providing that information. I'm now analyzing the report and generating follow-up questions. This will just take a moment.",
    field: null,
  },
]

export default function CreateIncidentPage() {
  const router = useRouter()
  const { userId, role, name } = useAuthStore()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [residentName, setResidentName] = useState("")
  const [roomNumber, setRoomNumber] = useState("")
  const [narrative, setNarrative] = useState("")
  const [residentState, setResidentState] = useState("")
  const [environmentNotes, setEnvironmentNotes] = useState("")
  const [canAddMore, setCanAddMore] = useState(false)
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleNext = () => {
    if (currentStep === 5) {
      handleSubmit()
      return
    }

    if (currentStep < 6) {
      const nextStep = (currentStep + 1) as Step
      setCurrentStep(nextStep)

      // Speak the prompt for the NEXT step, not the current one
      if (autoSpeak && nextStep < 6) {
        speakPrompt(VOICE_PROMPTS[nextStep - 1].question)
      }
    }
  }

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

    const currentPrompt = VOICE_PROMPTS[currentStep - 1]

    if (
      currentPrompt.field === "narrative" ||
      currentPrompt.field === "residentState" ||
      currentPrompt.field === "environmentNotes"
    ) {
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
    } else {
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
    }

    setIsListening(true)
    setCanAddMore(false)

    recognitionRef.current.onresult = (event: any) => {
      let transcript = ""

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }

      if (currentPrompt.field === "residentName") {
        setResidentName(transcript)
      } else if (currentPrompt.field === "roomNumber") {
        setRoomNumber(transcript)
      } else if (currentPrompt.field === "narrative") {
        setNarrative(transcript)
      } else if (currentPrompt.field === "residentState") {
        setResidentState(transcript)
      } else if (currentPrompt.field === "environmentNotes") {
        setEnvironmentNotes(transcript)
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error("[v0] Speech recognition error:", event.error)
      if (event.error !== "no-speech") {
        toast.error("Error recognizing speech. Please try again.")
      }
      setIsListening(false)
      if (
        currentPrompt.field === "narrative" ||
        currentPrompt.field === "residentState" ||
        currentPrompt.field === "environmentNotes"
      ) {
        setCanAddMore(true)
      }
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
      if (
        currentPrompt.field === "narrative" ||
        currentPrompt.field === "residentState" ||
        currentPrompt.field === "environmentNotes"
      ) {
        setCanAddMore(true)
        toast.info("Recording stopped. You can add more details if needed.")
      }
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

  const addMoreDetails = () => {
    setCanAddMore(false)
    startVoiceRecording()
  }

  const handleSubmit = async () => {
    setIsProcessing(true)
    setCurrentStep(6)

    // Speak the final prompt
    if (autoSpeak) {
      speakPrompt(VOICE_PROMPTS[5].question)
    }

    try {
      console.log("[v0] Submitting incident report...")
      console.log("[v0] User role:", role)
      console.log("[v0] User ID:", userId)
      console.log("[v0] User name:", name)

      const response = await fetch("/api/agent/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residentName,
          roomNumber,
          narrative,
          residentState,
          environmentNotes,
          reportedBy: userId,
          reportedByName: name,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create incident")
      }

      const data = await response.json()
      console.log("[v0] Incident created successfully:", data)

      setIsProcessing(false)

      toast.success("Incident reported successfully!")

      setTimeout(() => {
        console.log("[v0] Redirecting to dashboard for role:", role)
        if (role === "admin") {
          console.log("[v0] Redirecting to /admin/dashboard")
          router.push("/admin/dashboard")
        } else {
          console.log("[v0] Redirecting to /staff/dashboard")
          router.push("/staff/dashboard")
        }
      }, 2000)
    } catch (error) {
      console.error("[v0] Error creating incident:", error)
      toast.error("Failed to create incident. Please try again.")
      setIsProcessing(false)
      setCurrentStep(5)
    }
  }

  const getCurrentValue = () => {
    const currentPrompt = VOICE_PROMPTS[currentStep - 1]
    if (currentPrompt.field === "residentName") return residentName
    if (currentPrompt.field === "roomNumber") return roomNumber
    if (currentPrompt.field === "narrative") return narrative
    if (currentPrompt.field === "residentState") return residentState
    if (currentPrompt.field === "environmentNotes") return environmentNotes
    return ""
  }

  const setCurrentValue = (value: string) => {
    const currentPrompt = VOICE_PROMPTS[currentStep - 1]
    if (currentPrompt.field === "residentName") setResidentName(value)
    else if (currentPrompt.field === "roomNumber") setRoomNumber(value)
    else if (currentPrompt.field === "narrative") setNarrative(value)
    else if (currentPrompt.field === "residentState") setResidentState(value)
    else if (currentPrompt.field === "environmentNotes") setEnvironmentNotes(value)
  }

  const currentPrompt = VOICE_PROMPTS[currentStep - 1]
  const isLongFormField =
    currentPrompt.field === "narrative" ||
    currentPrompt.field === "residentState" ||
    currentPrompt.field === "environmentNotes"

  useEffect(() => {
    if (textareaRef.current && isListening) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [narrative, residentState, environmentNotes, isListening])

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
                Step {currentStep} of 6 - Voice-guided incident reporting
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
              style={{ width: `${(currentStep / 6) * 100}%` }}
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

          {currentStep < 6 ? (
            <>
              {/* Input Field */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {currentPrompt.field === "residentName" && "Resident Name"}
                  {currentPrompt.field === "roomNumber" && "Room Number"}
                  {currentPrompt.field === "narrative" && "Incident Description"}
                  {currentPrompt.field === "residentState" && "Resident State (Optional)"}
                  {currentPrompt.field === "environmentNotes" && "Environment Notes (Optional)"}
                </Label>
                {isLongFormField ? (
                  <Textarea
                    ref={textareaRef}
                    value={getCurrentValue()}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="Type or use voice input..."
                    className="min-h-[200px] max-h-[60vh] text-base resize-none overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
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

              {/* Voice Input Buttons */}
              <div className="flex flex-col gap-3">
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
                        {canAddMore ? "Continue Recording" : "Use Voice Input"}
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleNext}
                    className="flex-1 h-14 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    disabled={isProcessing || isListening}
                  >
                    {currentStep === 5 ? "Submit Report" : "Next"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>

                {canAddMore && isLongFormField && getCurrentValue().trim() && (
                  <Button
                    onClick={addMoreDetails}
                    variant="secondary"
                    className="w-full h-12 text-base"
                    disabled={isProcessing || isListening}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add More Details
                  </Button>
                )}
              </div>
            </>
          ) : (
            // Processing/Success State
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              {isProcessing ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-2xl animate-pulse" />
                    <Loader2 className="h-20 w-20 text-primary animate-spin relative z-10" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-semibold">Creating Incident Report...</p>
                    <p className="text-muted-foreground">Analyzing details and generating follow-up questions</p>
                  </div>
                  <div className="w-full max-w-md bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary via-accent to-primary animate-[shimmer_1.5s_ease-in-out_infinite] bg-[length:200%_100%]" />
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl animate-pulse" />
                    <CheckCircle2 className="h-20 w-20 text-green-500 relative z-10 animate-[scale-in_0.5s_ease-out]" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-semibold text-green-600">Report Submitted Successfully!</p>
                    <p className="text-muted-foreground">Redirecting to your dashboard...</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Incident created and questions generated</span>
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
