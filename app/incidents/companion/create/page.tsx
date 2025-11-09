"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Volume2, VolumeX, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { CompanionWaveAnimation } from "@/components/companion-wave-animation"

type ConversationStep =
  | "greeting"
  | "narrative-1" // Resident name and room
  | "narrative-2" // What happened
  | "narrative-3" // Resident state
  | "narrative-4" // Environment
  | "analyzing"
  | "follow-up-1"
  | "follow-up-2"
  | "follow-up-3"
  | "follow-up-4"
  | "saving"
  | "report-card"
  | "complete"

const AI_MESSAGES = {
  greeting:
    "Hello! I'm WAiK, your AI assistant. I'm here to help you report an incident. Let's start by gathering the basic information.",
  "narrative-1": "Can you please tell me the resident's name and room number?",
  "narrative-2":
    "Thank you. Now, can you tell me everything that happened? Please describe the incident in as much detail as possible.",
  "narrative-3":
    "Got it. Now tell me about the resident's state - their physical condition, mental state, clothing, and overall disposition at the time of the incident.",
  "narrative-4":
    "Almost done with the basics. Please tell me about the environment - describe the room, the circumstances surrounding the fall, and any details that could have influenced or contributed to what happened.",
  analyzing: "Thank you. Let me analyze that and prepare some follow-up questions...",
  "follow-up-1": "Was the floor wet or cluttered at the time of the incident?",
  "follow-up-2": "What was the resident wearing on their feet?",
  "follow-up-3": "Were there any witnesses to the incident?",
  "follow-up-4": "What was the lighting like in the area where the incident occurred?",
  saving: "Thank you. I'm now creating your incident report...",
  reportCard: "Your report has been created successfully. Here's your quality score.",
}

export default function CompanionCreatePage() {
  const router = useRouter()
  const { userId, role, name } = useAuthStore()
  const [currentText, setCurrentText] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [currentStep, setCurrentStep] = useState<ConversationStep>("greeting")
  const [isProcessing, setIsProcessing] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [reportScore, setReportScore] = useState<number | null>(null)
  const [reportFeedback, setReportFeedback] = useState<string>("")
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  const [reportDetails, setReportDetails] = useState<{
    whatYouDidWell: string[]
    whatWasMissed: string[]
  } | null>(null)
  const [awaitingStart, setAwaitingStart] = useState(true)
  const [interimTranscript, setInterimTranscript] = useState("")

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSpeakingRef = useRef(false)
  const isListeningRef = useRef(false)
  const speechEndTimerRef = useRef<NodeJS.Timeout | null>(null)

  const narrative1Ref = useRef("") // Name and room
  const narrative2Ref = useRef("") // What happened
  const narrative3Ref = useRef("") // Resident state
  const narrative4Ref = useRef("") // Environment
  const followUp1Ref = useRef("")
  const followUp2Ref = useRef("")
  const followUp3Ref = useRef("")
  const followUp4Ref = useRef("")

  useEffect(() => {
    console.log("[v0] 🎤 Initializing voice systems...")

    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis
      console.log("[v0] ✅ Speech synthesis available:", !!synthRef.current)
    }

    const loadVoices = () => {
      if (!synthRef.current) {
        console.log("[v0] ❌ No speech synthesis available")
        return false
      }

      const voices = synthRef.current.getVoices()
      console.log("[v0] 🔊 Available voices:", voices.length)

      if (voices.length > 0) {
        const samanthaVoice = voices.find((v) => v.name.toLowerCase().includes("samantha"))
        const defaultEnglishVoice = voices.find((v) => v.lang.startsWith("en"))
        const selectedVoice = samanthaVoice || defaultEnglishVoice || voices[0]

        console.log("[v0] ✅ Selected voice:", selectedVoice.name, selectedVoice.lang)
        setSelectedVoice(selectedVoice)
        setVoicesLoaded(true)
        return true
      }
      console.log("[v0] ⏳ Waiting for voices to load...")
      return false
    }

    if (!loadVoices()) {
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = () => {
          console.log("[v0] 🔄 Voices changed event triggered")
          loadVoices()
        }
      }
    }

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      console.log("[v0] ✅ Speech recognition available")
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onstart = () => {
        console.log("[v0] 🎤 Speech recognition STARTED")
      }

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ""
        let interimText = ""

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimText += transcript
          }
        }

        if (finalTranscript) {
          setCurrentText((prev) => {
            const newText = (prev + " " + finalTranscript).trim()
            return newText
          })

          if (speechEndTimerRef.current) {
            clearTimeout(speechEndTimerRef.current)
          }
          speechEndTimerRef.current = setTimeout(() => {
            handleSubmit()
          }, 2000)
        }
        setInterimTranscript(interimText)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("[v0] ❌ Speech recognition error:", event.error)
        if (event.error !== "no-speech" && event.error !== "aborted") {
          toast.error(`Speech recognition error: ${event.error}`)
        }
      }

      recognitionRef.current.onend = () => {
        console.log("[v0] 🔚 Speech recognition ended")
        if (
          isListeningRef.current &&
          currentStep !== "report-card" &&
          currentStep !== "complete" &&
          currentStep !== "analyzing" &&
          currentStep !== "saving"
        ) {
          console.log("[v0] 🔄 Restarting speech recognition...")
          try {
            recognitionRef.current.start()
          } catch (error) {
            console.log("[v0] ⚠️ Recognition restart failed:", error)
          }
        }
      }
    } else {
      console.error("[v0] ❌ Speech recognition NOT available in this browser")
      toast.error("Speech recognition is not supported in this browser. Please use Chrome or Edge.")
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
      if (speechEndTimerRef.current) {
        clearTimeout(speechEndTimerRef.current)
      }
    }
  }, [])

  const speak = (text: string) => {
    console.log("[v0] 💬 speak() called with text:", text.substring(0, 50) + "...")
    console.log("[v0] 💬 autoSpeak:", autoSpeak, "voicesLoaded:", voicesLoaded, "selectedVoice:", !!selectedVoice)

    if (!autoSpeak) {
      console.log("[v0] 🔇 Auto-speak is disabled")
      return
    }

    if (!synthRef.current || !voicesLoaded || !selectedVoice) {
      console.log("[v0] ❌ Cannot speak - missing requirements")
      return
    }

    if (isListeningRef.current) {
      console.log("[v0] 🛑 Stopping listening while AI speaks")
      stopListening()
    }

    if (isSpeakingRef.current && currentUtteranceRef.current) {
      console.log("[v0] 🛑 Already speaking, canceling current utterance")
      synthRef.current.cancel()
      currentUtteranceRef.current = null
      isSpeakingRef.current = false
      setIsSpeaking(false)
      setTimeout(() => speakImmediate(text), 100)
    } else {
      speakImmediate(text)
    }
  }

  const speakImmediate = (text: string) => {
    console.log("[v0] 🗣️ speakImmediate() called")
    if (!synthRef.current || !selectedVoice) {
      console.log("[v0] ❌ Cannot speak immediately - missing requirements")
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = selectedVoice
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0

    currentUtteranceRef.current = utterance
    console.log("[v0] 🎙️ Created utterance with voice:", selectedVoice.name)

    utterance.onstart = () => {
      console.log("[v0] ▶️ Speech STARTED")
      isSpeakingRef.current = true
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      console.log("[v0] ⏹️ Speech ENDED")
      isSpeakingRef.current = false
      setIsSpeaking(false)
      currentUtteranceRef.current = null

      if (
        !isListeningRef.current &&
        currentStep !== "report-card" &&
        currentStep !== "complete" &&
        currentStep !== "analyzing" &&
        currentStep !== "saving"
      ) {
        console.log("[v0] 🎤 Starting listening after speech ended")
        setTimeout(() => {
          startListening()
        }, 500)
      }
    }

    utterance.onerror = (event) => {
      if (event.error !== "canceled") {
        console.error("[v0] ❌ Speech synthesis error:", event.error)
      }
      isSpeakingRef.current = false
      setIsSpeaking(false)
      currentUtteranceRef.current = null
    }

    console.log("[v0] 📢 Calling speechSynthesis.speak()")
    synthRef.current.speak(utterance)
  }

  const stopSpeaking = () => {
    console.log("[v0] 🛑 stopSpeaking() called")
    if (synthRef.current && isSpeakingRef.current) {
      synthRef.current.cancel()
      currentUtteranceRef.current = null
      isSpeakingRef.current = false
      setIsSpeaking(false)
      console.log("[v0] ✅ Speech stopped")
    }
  }

  const startListening = () => {
    console.log("[v0] 🎤 startListening() called")
    if (!recognitionRef.current) {
      console.log("[v0] ❌ No recognition ref available")
      return
    }

    if (isListeningRef.current) {
      console.log("[v0] ⚠️ Already listening")
      return
    }

    if (isSpeakingRef.current) {
      console.log("[v0] ⚠️ Cannot start listening while AI is speaking")
      return
    }

    try {
      console.log("[v0] 🔊 Starting speech recognition...")
      recognitionRef.current.start()
      isListeningRef.current = true
      setIsListening(true)
      console.log("[v0] ✅ Speech recognition started")
    } catch (error) {
      console.error("[v0] ❌ Failed to start recognition:", error)
    }
  }

  const stopListening = () => {
    console.log("[v0] 🛑 stopListening() called")
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop()
      isListeningRef.current = false
      setIsListening(false)
      console.log("[v0] ✅ Listening stopped")
    }
  }

  const handleStartConversation = () => {
    console.log("[v0] 🚀 Starting conversation!")
    console.log("[v0] 🔊 Voices loaded:", voicesLoaded)

    if (!voicesLoaded) {
      toast.error("Voice system is still loading. Please wait a moment.")
      return
    }
    setAwaitingStart(false)
    setTimeout(() => {
      console.log("[v0] 💬 Speaking greeting message...")
      speak(AI_MESSAGES.greeting)
    }, 500)
  }

  const handleSubmit = async () => {
    console.log("[v0] 📤 handleSubmit() called")

    if (speechEndTimerRef.current) {
      clearTimeout(speechEndTimerRef.current)
      speechEndTimerRef.current = null
    }

    stopListening()
    const userResponse = currentText.trim()

    if (!userResponse) {
      console.log("[v0] ⚠️ No user response to submit")
      return
    }

    console.log("[v0] 📝 User response:", userResponse)
    console.log("[v0] 📍 Current step:", currentStep)

    setCurrentText("")
    setInterimTranscript("")

    switch (currentStep) {
      case "greeting":
        setCurrentStep("narrative-1")
        setTimeout(() => {
          speak(AI_MESSAGES["narrative-1"])
        }, 500)
        break

      case "narrative-1":
        narrative1Ref.current = userResponse
        setCurrentStep("narrative-2")
        setTimeout(() => {
          speak(AI_MESSAGES["narrative-2"])
        }, 500)
        break

      case "narrative-2":
        narrative2Ref.current = userResponse
        setCurrentStep("narrative-3")
        setTimeout(() => {
          speak(AI_MESSAGES["narrative-3"])
        }, 500)
        break

      case "narrative-3":
        narrative3Ref.current = userResponse
        setCurrentStep("narrative-4")
        setTimeout(() => {
          speak(AI_MESSAGES["narrative-4"])
        }, 500)
        break

      case "narrative-4":
        narrative4Ref.current = userResponse
        setIsProcessing(true)
        setCurrentStep("analyzing")
        speak(AI_MESSAGES.analyzing)

        setTimeout(() => {
          setIsProcessing(false)
          setCurrentStep("follow-up-1")
          setTimeout(() => {
            speak(AI_MESSAGES["follow-up-1"])
          }, 1000)
        }, 3000)
        break

      case "follow-up-1":
        followUp1Ref.current = userResponse
        setCurrentStep("follow-up-2")
        setTimeout(() => {
          speak(AI_MESSAGES["follow-up-2"])
        }, 500)
        break

      case "follow-up-2":
        followUp2Ref.current = userResponse
        setCurrentStep("follow-up-3")
        setTimeout(() => {
          speak(AI_MESSAGES["follow-up-3"])
        }, 500)
        break

      case "follow-up-3":
        followUp3Ref.current = userResponse
        setCurrentStep("follow-up-4")
        setTimeout(() => {
          speak(AI_MESSAGES["follow-up-4"])
        }, 500)
        break

      case "follow-up-4":
        followUp4Ref.current = userResponse
        setIsProcessing(true)
        setCurrentStep("saving")
        speak(AI_MESSAGES.saving)

        try {
          const combinedNarrative = `Resident: ${narrative1Ref.current}\n\nIncident Details: ${narrative2Ref.current}\n\nResident State: ${narrative3Ref.current}\n\nEnvironment: ${narrative4Ref.current}`

          const response = await fetch("/api/agent/report-conversational", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              narrative: combinedNarrative,
              followUp1: followUp1Ref.current,
              followUp2: followUp2Ref.current,
              followUp3: followUp3Ref.current,
              followUp4: followUp4Ref.current,
              reportedBy: userId,
              reportedByName: name,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error("[v0] ❌ API error:", errorText)
            throw new Error(`Failed to create report: ${response.status}`)
          }

          const data = await response.json()

          setReportScore(data.score)
          setReportFeedback(data.feedback)
          setReportDetails({
            whatYouDidWell: data.whatYouDidWell || [],
            whatWasMissed: data.whatWasMissed || [],
          })

          setIsProcessing(false)
          setCurrentStep("report-card")

          setTimeout(() => {
            const combinedMessage = `Thank you. The report is complete and saved. Your initial narrative scored ${data.score} out of 10. ${data.feedback}`
            speak(combinedMessage)
          }, 1000)
        } catch (error) {
          console.error("[v0] ❌ Error creating report:", error)
          toast.error("Failed to create report. Please try again.")
          setIsProcessing(false)
        }
        break
    }
  }

  const handleFinish = () => {
    console.log("[v0] 🏁 Finishing conversation")
    stopSpeaking()
    stopListening()
    if (role === "admin") {
      router.push("/admin/dashboard")
    } else {
      router.push("/staff/dashboard")
    }
  }

  const getCurrentMessage = () => {
    if (currentStep === "greeting") return AI_MESSAGES.greeting
    if (currentStep === "narrative-1") return AI_MESSAGES["narrative-1"]
    if (currentStep === "narrative-2") return AI_MESSAGES["narrative-2"]
    if (currentStep === "narrative-3") return AI_MESSAGES["narrative-3"]
    if (currentStep === "narrative-4") return AI_MESSAGES["narrative-4"]
    if (currentStep === "analyzing") return AI_MESSAGES.analyzing
    if (currentStep === "follow-up-1") return AI_MESSAGES["follow-up-1"]
    if (currentStep === "follow-up-2") return AI_MESSAGES["follow-up-2"]
    if (currentStep === "follow-up-3") return AI_MESSAGES["follow-up-3"]
    if (currentStep === "follow-up-4") return AI_MESSAGES["follow-up-4"]
    if (currentStep === "saving") return AI_MESSAGES.saving
    if (currentStep === "report-card") return AI_MESSAGES.reportCard
    return ""
  }

  return (
    <div className="fixed inset-0 lg:left-72 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 flex flex-col overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 animate-pulse" />
      </div>

      <div className="relative z-10 border-b border-white/20 bg-white/10 backdrop-blur-xl px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button variant="ghost" size="sm" onClick={handleFinish} className="gap-2 -ml-2 text-white hover:bg-white/20">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="text-center absolute left-1/2 -translate-x-1/2">
            <h1 className="text-lg sm:text-xl font-bold text-white">AI Companion</h1>
            <p className="text-xs sm:text-sm text-white/80 hidden sm:block">Voice-first reporting</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setAutoSpeak(!autoSpeak)
              if (autoSpeak) {
                stopSpeaking()
              }
            }}
            className="h-9 w-9 sm:h-10 sm:w-10 text-white hover:bg-white/20"
          >
            {autoSpeak ? <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
        </div>
      </div>

      {awaitingStart ? (
        <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full p-8 text-center space-y-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Ready to Start?</h2>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                I'll guide you through reporting an incident using natural conversation. Just speak naturally, and I'll
                listen.
              </p>
            </div>
            <Button
              onClick={handleStartConversation}
              size="lg"
              className="w-full bg-white text-indigo-600 hover:bg-white/90 font-semibold"
              disabled={!voicesLoaded}
            >
              {voicesLoaded ? "Start Conversation" : "Loading Voice System..."}
            </Button>
            <p className="text-xs text-white/60">Make sure your volume is up and you're in a quiet space.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 space-y-8 overflow-y-auto pb-24">
            {currentStep !== "report-card" ? (
              <>
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 shrink-0">
                  <CompanionWaveAnimation isListening={isListening} isSpeaking={isSpeaking} />
                </div>

                <div className="max-w-2xl w-full p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
                  <p className="text-lg sm:text-xl text-center text-white leading-relaxed">{getCurrentMessage()}</p>
                </div>

                {(currentText || interimTranscript) && (
                  <div className="max-w-2xl w-full p-4 bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl max-h-64 overflow-y-auto">
                    <p className="text-sm text-white/90 break-words">
                      <span className="font-semibold">You:</span> {currentText}
                      <span className="text-white/60 italic">{interimTranscript}</span>
                    </p>
                  </div>
                )}

                {currentText.trim() && !isProcessing && (
                  <div className="w-full max-w-2xl flex justify-center pb-4">
                    <Button
                      onClick={handleSubmit}
                      size="lg"
                      className="bg-white text-indigo-600 hover:bg-white/90 font-semibold px-8 shadow-xl"
                    >
                      Submit Response
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full max-w-md h-full pb-8">
                <div className="p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl space-y-6">
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-20 w-20 text-green-400 mx-auto drop-shadow-lg" />
                    <h2 className="text-3xl font-bold text-white">Report Complete</h2>
                    <div className="text-7xl font-bold text-white drop-shadow-lg">{reportScore}/10</div>
                    <p className="text-white/80 text-sm leading-relaxed">{reportFeedback}</p>
                  </div>

                  <Button
                    onClick={() => setShowDetailedReport(!showDetailedReport)}
                    variant="outline"
                    className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30"
                    size="lg"
                  >
                    {showDetailedReport ? "Hide Detailed Report Card" : "Show Detailed Report Card"}
                  </Button>

                  {showDetailedReport && reportDetails && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="space-y-3 bg-green-500/20 p-4 rounded-2xl border border-green-400/30">
                        <h3 className="font-semibold text-green-300 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" />
                          What You Did Well
                        </h3>
                        <ul className="space-y-2">
                          {reportDetails.whatYouDidWell.map((item, index) => (
                            <li key={index} className="flex gap-2 text-sm text-white/90">
                              <span className="text-green-400 shrink-0">[+]</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-3 bg-orange-500/20 p-4 rounded-2xl border border-orange-400/30">
                        <h3 className="font-semibold text-orange-300 flex items-center gap-2">
                          <span className="text-orange-400 text-lg">[!]</span>
                          What Was Missed
                        </h3>
                        <ul className="space-y-2">
                          {reportDetails.whatWasMissed.map((item, index) => (
                            <li key={index} className="flex gap-2 text-sm text-white/90">
                              <span className="text-orange-400 shrink-0">[!]</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleFinish}
                    className="w-full bg-white text-indigo-600 hover:bg-white/90 font-semibold"
                    size="lg"
                  >
                    Finish & Return to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-20 pb-6 flex justify-center pointer-events-none">
            <div className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full">
              <p className="text-sm text-white/80">
                {isListening
                  ? "🎤 Listening..."
                  : isSpeaking
                    ? "💬 Speaking..."
                    : isProcessing
                      ? "⏳ Processing..."
                      : "✓ Ready"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
