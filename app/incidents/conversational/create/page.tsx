"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, Send, Loader2, Volume2, VolumeX, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  type: "ai" | "user"
  text: string
  timestamp: Date
}

type ConversationStep =
  | "greeting"
  | "narrative"
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
    "Hello! I'm here to help you report an incident quickly and conversationally. I'll guide you through this process by asking a few questions. Let's start - can you tell me what happened? Please describe the incident in detail, including the resident's name, room number, and what occurred.",
  analyzing:
    "Thank you for that detailed description. I'm analyzing your report and preparing some follow-up questions to ensure we have all the necessary information. This will just take a moment...",
  "follow-up-1": "Was the floor wet or cluttered at the time of the incident?",
  "follow-up-2": "What was the resident wearing on their feet?",
  "follow-up-3": "Were there any witnesses to the incident?",
  "follow-up-4": "What was the lighting like in the area where the incident occurred?",
  saving:
    "Thank you for providing that information. I'm now creating your incident report and saving all the details...",
  reportCard:
    "Your incident report has been created successfully. Based on the information you provided, I've generated a quality score for your report.",
}

export default function ConversationalCreatePage() {
  const router = useRouter()
  const { userId, role, name } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentInput, setCurrentInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [currentStep, setCurrentStep] = useState<ConversationStep>("greeting")
  const [isProcessing, setIsProcessing] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [conversationStarted, setConversationStarted] = useState(false)
  const [reportScore, setReportScore] = useState<number | null>(null)
  const [reportFeedback, setReportFeedback] = useState<string>("")
  const [awaitingStart, setAwaitingStart] = useState(true)

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Conversation data
  const narrativeRef = useRef("")
  const followUp1Ref = useRef("")
  const followUp2Ref = useRef("")
  const followUp3Ref = useRef("")
  const followUp4Ref = useRef("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis
    }

    const loadVoices = () => {
      if (!synthRef.current) return false

      const voices = synthRef.current.getVoices()
      console.log("[v0] 🎤 Speech synthesis voices loaded:", voices.length)

      if (voices.length > 0) {
        const samanthaVoice = voices.find((v) => v.name.toLowerCase().includes("samantha"))
        const defaultEnglishVoice = voices.find((v) => v.lang.startsWith("en"))
        const selectedVoice = samanthaVoice || defaultEnglishVoice || voices[0]

        setSelectedVoice(selectedVoice)
        setVoicesLoaded(true)
        console.log("[v0] 🎤 Selected voice:", selectedVoice?.name)
        return true
      }
      return false
    }

    if (!loadVoices()) {
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = loadVoices
      }

      setTimeout(() => {
        if (synthRef.current && synthRef.current.getVoices().length === 0) {
          const utterance = new SpeechSynthesisUtterance("")
          synthRef.current.speak(utterance)
          synthRef.current.cancel()
          setTimeout(loadVoices, 100)
        }
      }, 100)
    }

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const speak = (text: string) => {
    if (!autoSpeak || !synthRef.current || !voicesLoaded || !selectedVoice) {
      console.log("[v0] ❌ Cannot speak - missing requirements")
      return
    }

    // Cancel any existing speech
    synthRef.current.cancel()
    setIsSpeaking(false)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = selectedVoice
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      console.log("[v0] 🔊 Speaking started")
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      console.log("[v0] 🔇 Speaking ended")
      setIsSpeaking(false)
    }

    utterance.onerror = (event) => {
      console.error("[v0] ❌ Speech error:", event.error)
      if (event.error !== "canceled") {
        console.error("[v0] Speech synthesis error:", event.error)
      }
      setIsSpeaking(false)
    }

    console.log("[v0] 🎤 Speaking with voice:", selectedVoice.name)
    synthRef.current.speak(utterance)
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    setIsSpeaking(false)
  }

  const addAIMessage = (text: string) => {
    const message: Message = {
      id: `ai-${Date.now()}`,
      type: "ai",
      text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, message])
    speak(text)
  }

  const addUserMessage = (text: string) => {
    const message: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, message])
  }

  const handleStartConversation = () => {
    if (!voicesLoaded) {
      toast.error("Voice system is still loading. Please wait a moment.")
      return
    }
    setAwaitingStart(false)
    setConversationStarted(true)
    setTimeout(() => {
      addAIMessage(AI_MESSAGES.greeting)
    }, 500)
  }

  const startVoiceRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Voice recognition is not supported in your browser")
      return
    }

    setIsListening(true)
    setCurrentInput("")

    recognitionRef.current.onresult = (event: any) => {
      let transcript = ""
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setCurrentInput(transcript)
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error("[v0] Speech recognition error:", event.error)
      if (event.error !== "no-speech") {
        toast.error("Error recognizing speech. Please try again.")
      }
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

  const handleSend = async () => {
    if (!currentInput.trim() || isProcessing) return

    stopSpeaking()
    addUserMessage(currentInput)

    const userResponse = currentInput
    setCurrentInput("")

    switch (currentStep) {
      case "greeting":
        narrativeRef.current = userResponse
        setIsProcessing(true)
        addAIMessage(AI_MESSAGES.analyzing)

        setTimeout(() => {
          setIsProcessing(false)
          setCurrentStep("follow-up-1")
          setTimeout(() => {
            addAIMessage(AI_MESSAGES["follow-up-1"])
          }, 1000)
        }, 3000)
        break

      case "follow-up-1":
        followUp1Ref.current = userResponse
        setCurrentStep("follow-up-2")
        setTimeout(() => {
          addAIMessage(AI_MESSAGES["follow-up-2"])
        }, 500)
        break

      case "follow-up-2":
        followUp2Ref.current = userResponse
        setCurrentStep("follow-up-3")
        setTimeout(() => {
          addAIMessage(AI_MESSAGES["follow-up-3"])
        }, 500)
        break

      case "follow-up-3":
        followUp3Ref.current = userResponse
        setCurrentStep("follow-up-4")
        setTimeout(() => {
          addAIMessage(AI_MESSAGES["follow-up-4"])
        }, 500)
        break

      case "follow-up-4":
        followUp4Ref.current = userResponse
        setIsProcessing(true)
        setCurrentStep("saving")
        addAIMessage(AI_MESSAGES.saving)

        try {
          const response = await fetch("/api/agent/report-conversational", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              narrative: narrativeRef.current,
              followUp1: followUp1Ref.current,
              followUp2: followUp2Ref.current,
              followUp3: followUp3Ref.current,
              followUp4: followUp4Ref.current,
              reportedBy: userId,
              reportedByName: name,
            }),
          })

          if (!response.ok) throw new Error("Failed to create report")

          const data = await response.json()
          setReportScore(data.score)
          setReportFeedback(data.feedback)

          setIsProcessing(false)
          setCurrentStep("report-card")
          setTimeout(() => {
            addAIMessage(AI_MESSAGES.reportCard)
          }, 1000)
        } catch (error) {
          console.error("[v0] Error creating report:", error)
          toast.error("Failed to create report. Please try again.")
          setIsProcessing(false)
        }
        break
    }
  }

  const handleFinish = () => {
    stopSpeaking()
    if (role === "admin") {
      router.push("/admin/dashboard")
    } else {
      router.push("/staff/dashboard")
    }
  }

  return (
    <div className="fixed inset-0 lg:left-72 bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-lg px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Conversational Reporting</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">AI-guided incident documentation</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setAutoSpeak(!autoSpeak)
            if (autoSpeak) {
              stopSpeaking()
            }
          }}
          className="h-9 w-9 sm:h-10 sm:w-10"
        >
          {autoSpeak ? <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />}
        </Button>
      </div>

      {awaitingStart ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <Card className="max-w-md w-full p-6 sm:p-8 text-center space-y-4 sm:space-y-6 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-blue-500/20">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">Ready to Start?</h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                I'll guide you through reporting an incident using voice and text. Click the button below when you're
                ready to begin.
              </p>
            </div>
            <Button
              onClick={handleStartConversation}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:opacity-90"
              disabled={!voicesLoaded}
            >
              {voicesLoaded ? (
                <>
                  <Volume2 className="mr-2 h-5 w-5" />
                  Start Conversation
                </>
              ) : (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading Voice System...
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Make sure your device volume is turned up and you're in a quiet environment.
            </p>
          </Card>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.type === "ai" ? "justify-start" : "justify-end")}>
                  <Card
                    className={cn(
                      "max-w-[85%] sm:max-w-[80%] p-3 sm:p-4",
                      message.type === "ai"
                        ? "bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-blue-500/20"
                        : "bg-muted",
                    )}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </Card>
                </div>
              ))}

              {isProcessing && (
                <div className="flex justify-start">
                  <Card className="max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-sm">Processing...</p>
                    </div>
                  </Card>
                </div>
              )}

              {currentStep === "report-card" && reportScore !== null && (
                <div className="flex justify-center">
                  <Card className="max-w-md w-full p-6 bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
                    <div className="text-center space-y-4">
                      <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                      <h2 className="text-2xl font-bold">Report Quality Score</h2>
                      <div className="text-6xl font-bold text-green-600">{reportScore}/10</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{reportFeedback}</p>
                      <Button onClick={handleFinish} className="w-full" size="lg">
                        Finish & Return to Dashboard
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          {currentStep !== "report-card" && currentStep !== "complete" && (
            <div className="border-t bg-background/95 backdrop-blur-lg p-4 sm:p-6">
              <div className="max-w-4xl mx-auto space-y-3">
                {isSpeaking && (
                  <Button onClick={stopSpeaking} variant="destructive" className="w-full animate-pulse">
                    <VolumeX className="mr-2 h-5 w-5" />
                    Stop Speaking
                  </Button>
                )}

                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="Type your response or use voice input..."
                    className="min-h-[60px] max-h-[200px] resize-none flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                  />
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      className="h-[60px] w-[60px]"
                      disabled={isProcessing || isSpeaking}
                    >
                      {isListening ? <MicOff className="h-6 w-6 animate-pulse" /> : <Mic className="h-6 w-6" />}
                    </Button>
                    <Button
                      onClick={handleSend}
                      size="icon"
                      className="h-[60px] w-[60px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:opacity-90"
                      disabled={!currentInput.trim() || isProcessing || isListening}
                    >
                      <Send className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
