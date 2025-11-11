"use client"

import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mic, MicOff, ArrowRight, Loader2, CheckCircle2, Volume2, VolumeX, Plus } from "lucide-react"
import { toast } from "sonner"
import { useSpeechSynthesis } from "@/lib/hooks/useSpeechSynthesis"

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

type DictationField = Exclude<VoicePrompt["field"], null>

const mergeTranscript = (base: string, addition: string) => {
  const normalizedBase = base ?? ""
  const normalizedAddition = (addition ?? "").replace(/\s+/g, " ").trim()

  if (!normalizedAddition) {
    return normalizedBase
  }

  if (!normalizedBase) {
    return normalizedAddition
  }

  const needsSpace =
    !normalizedBase.endsWith(" ") &&
    !normalizedAddition.startsWith(" ") &&
    !",.!?:;".includes(normalizedAddition[0] ?? "")

  const combined = `${normalizedBase}${needsSpace ? " " : ""}${normalizedAddition}`

  return combined.replace(/\s{2,}/g, " ").trimStart()
}

const extractTranscriptDelta = (full: string, baseline: string) => {
  const source = full ?? ""
  const reference = baseline ?? ""
  let index = 0
  const max = Math.min(source.length, reference.length)

  while (index < max && source[index] === reference[index]) {
    index += 1
  }

  return source.slice(index)
}

export default function CreateIncidentPage() {
  const router = useRouter()
  const { userId, role, name } = useAuthStore()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [residentName, setResidentName] = useState("")
  const [roomNumber, setRoomNumber] = useState("")
  const [narrative, setNarrative] = useState("")
  const [residentState, setResidentState] = useState("")
  const [environmentNotes, setEnvironmentNotes] = useState("")
  const [canAddMore, setCanAddMore] = useState(false)
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dictationFinalRef = useRef<Record<DictationField, string>>({
    residentName: "",
    roomNumber: "",
    narrative: "",
    residentState: "",
    environmentNotes: "",
  })
  const hasSpokenInitialPromptRef = useRef(false)
  const {
    speak: speakTTS,
    stopSpeaking: stopTTS,
    autoSpeak,
    setAutoSpeak,
    speechSupported,
    voicesLoaded,
  } = useSpeechSynthesis("en")

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
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"
    }

    return () => {
      recognitionRef.current?.stop()
      stopTTS()
    }
  }, [stopTTS])

  useEffect(() => {
    if (!speechSupported && autoSpeak) {
      setAutoSpeak(false)
      toast.warning("Speech synthesis is not available in this browser. Prompts will be displayed as text only.")
    }
  }, [speechSupported, autoSpeak])

  useEffect(() => {
    if (voicesLoaded && autoSpeak && !hasSpokenInitialPromptRef.current) {
      speakPrompt(VOICE_PROMPTS[0].question)
      hasSpokenInitialPromptRef.current = true
    }
  }, [voicesLoaded, autoSpeak])

  const speakPrompt = (text: string) => {
    if (!autoSpeak) return
    if (!speechSupported) return

    const success = speakTTS(text, {
      rate: 0.9,
      onstart: () => setIsSpeaking(true),
      onend: () => setIsSpeaking(false),
    })

    if (!success) {
      toast.error("Unable to play the prompt audio.")
    }
  }

  const stopSpeaking = () => {
    stopTTS()
    setIsSpeaking(false)
  }

  const startVoiceRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Voice recognition is not supported in your browser")
      return
    }

    const currentPrompt = VOICE_PROMPTS[currentStep - 1]

    if (currentPrompt.field) {
      dictationFinalRef.current[currentPrompt.field] = getCurrentValue()
    }

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
      if (!currentPrompt.field) return

      let committedValue = dictationFinalRef.current[currentPrompt.field] ?? ""
      let interimDelta = ""

      const startIndex = typeof event.resultIndex === "number" ? event.resultIndex : 0

      for (let i = startIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const phrase = result?.[0]?.transcript ?? ""
        if (!phrase) continue

        if (result.isFinal) {
          const normalizedCommitted = committedValue.trim()
          const normalizedPhrase = phrase.trim()

          if (normalizedCommitted && !normalizedPhrase.startsWith(normalizedCommitted)) {
            committedValue = normalizedPhrase
          } else {
            const delta = extractTranscriptDelta(phrase, committedValue)
            committedValue = mergeTranscript(committedValue, delta)
          }

          interimDelta = ""
        } else {
          interimDelta = extractTranscriptDelta(phrase, committedValue)
        }
      }

      dictationFinalRef.current[currentPrompt.field] = committedValue

      if (interimDelta) {
        const preview = mergeTranscript(committedValue, interimDelta)
        updateFieldValue(currentPrompt.field, () => preview, { final: false })
      } else {
        updateFieldValue(currentPrompt.field, () => committedValue, { final: true })
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

      if (!response.ok || !response.body) {
        throw new Error("Failed to create incident")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let createdIncidentId: string | null = null
      let redirectScheduled = false
      const warningMessages = new Set<string>()

      const scheduleRedirectOnce = (incidentId: string) => {
        createdIncidentId = incidentId
        if (redirectScheduled) return
        redirectScheduled = true

        setIsProcessing(false)
        toast.success("Incident reported successfully!")

        setTimeout(() => {
          console.log("[v0] Redirecting to dashboard for role:", role)
          if (role === "admin") {
            router.push("/admin/dashboard")
          } else {
            router.push("/staff/dashboard")
          }
        }, 2000)
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let newlineIndex
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim()
          buffer = buffer.slice(newlineIndex + 1)
          if (!line) continue

          try {
            const event = JSON.parse(line)
            console.log("[v0] Reporter agent event:", event)

            if (event.type === "error") {
              if (event.node === "report_agent") {
                throw new Error(event.error || "Reporter agent error")
              } else {
                console.warn(`[v0] Reporter agent warning from ${event.node}: ${event.error}`)
                const warningMessage = event.error || `Reporter agent warning from ${event.node}`
                if (!warningMessages.has(warningMessage)) {
                  toast.warning(warningMessage)
                  warningMessages.add(warningMessage)
                }
                continue
              }
            }

            if (event.type === "incident_created") {
              scheduleRedirectOnce(event.incidentId)
              continue
            }

            if (event.type === "complete") {
              if (event.incidentId) {
                scheduleRedirectOnce(event.incidentId)
              }
              continue
            }
          } catch (parseError) {
            console.error("[v0] Failed to parse reporter agent event", parseError)
          }
        }
      }

      if (!createdIncidentId && buffer.trim().length > 0) {
        try {
          const event = JSON.parse(buffer)
          if (event.type === "incident_created" || event.type === "complete") {
            scheduleRedirectOnce(event.incidentId)
          } else if (event.type === "error") {
            if (event.node === "report_agent") {
              throw new Error(event.error || "Reporter agent error")
            } else {
              console.warn(`[v0] Reporter agent warning from ${event.node}: ${event.error}`)
              const warningMessage = event.error || `Reporter agent warning from ${event.node}`
              if (!warningMessages.has(warningMessage)) {
                toast.warning(warningMessage)
                warningMessages.add(warningMessage)
              }
            }
          }
        } catch (parseError) {
          console.error("[v0] Failed to parse trailing reporter agent event", parseError)
        }
      }

      if (!createdIncidentId) {
        throw new Error("Reporter agent did not return an incident ID")
      }

      console.log("[v0] Incident created successfully:", createdIncidentId)

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

  const updateFieldValue = (
    field: DictationField,
    updater: (prev: string) => string,
    options: { final?: boolean } = {},
  ) => {
    const { final = true } = options

    const applySetter = (setter: Dispatch<SetStateAction<string>>) => {
      setter((prev) => {
        const nextValue = updater(prev)
        if (final) {
          dictationFinalRef.current[field] = nextValue
        }
        return nextValue
      })
    }

    switch (field) {
      case "residentName":
        applySetter(setResidentName)
        break
      case "roomNumber":
        applySetter(setRoomNumber)
        break
      case "narrative":
        applySetter(setNarrative)
        break
      case "residentState":
        applySetter(setResidentState)
        break
      case "environmentNotes":
        applySetter(setEnvironmentNotes)
        break
      default:
        break
    }
  }

  const setCurrentValue = (value: string) => {
    const currentPrompt = VOICE_PROMPTS[currentStep - 1]
    if (!currentPrompt.field) return
    updateFieldValue(currentPrompt.field, () => value, { final: true })
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
