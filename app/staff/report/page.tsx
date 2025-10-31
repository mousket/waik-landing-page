"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Mic, Pause, RotateCcw, X } from "lucide-react"

// Define the conversation script
const conversationScript = [
  {
    id: 0,
    question: "I am ready to start the incident report. Please say 'I am ready to start' to begin.",
    trigger: ["ready", "start", "begin"],
  },
  {
    id: 1,
    question: "Tell us about the resident info? We are expecting the resident's name, age, gender, and room number.",
    acknowledgment: "Great.",
  },
  {
    id: 2,
    question: "Take your time and in full details walk through everything that happened?",
    acknowledgment: "Got it.",
  },
  {
    id: 3,
    question: "Describe the state of the resident from what they are wearing to how they are feeling and acting.",
    acknowledgment: "Got it.",
  },
  {
    id: 4,
    question: "Describe in full details everything you did to help the resident.",
    acknowledgment: "Got it.",
  },
  {
    id: 5,
    question: "What is your assessment of the resident's condition after the incident?",
    acknowledgment: "Got it.",
  },
  {
    id: 6,
    question: "What is your assessment of why the incident happened?",
    acknowledgment: "Got it.",
  },
  {
    id: 7,
    question: "What is your assessment of what could have been done to prevent the incident?",
    acknowledgment: "Got it.",
  },
]

const finalMessage =
  "Thank you for your time. We will generate insights from the incident report. We will let you know if we need more information."

export default function StaffReportPage() {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [answers, setAnswers] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [browserSupport, setBrowserSupport] = useState(true)

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    // Check browser support
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition || !window.speechSynthesis) {
        setBrowserSupport(false)
        console.log("[v0] Browser does not support Web Speech API")
        return
      }

      // Initialize Speech Recognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        console.log("[v0] Speech recognized:", transcript)
        setTranscript(transcript)
        handleUserResponse(transcript)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.log("[v0] Speech recognition error:", event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        console.log("[v0] Speech recognition ended")
        setIsListening(false)
      }

      // Initialize Speech Synthesis
      synthRef.current = window.speechSynthesis

      // Start the conversation
      speakQuestion(0)
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

  const speakQuestion = (questionIndex: number) => {
    if (!synthRef.current || isPaused) return

    const question = conversationScript[questionIndex]
    const utterance = new SpeechSynthesisUtterance(question.question)

    utterance.onstart = () => {
      console.log("[v0] Started speaking question:", questionIndex)
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      console.log("[v0] Finished speaking question:", questionIndex)
      setIsSpeaking(false)
      // Start listening after speaking
      if (!isPaused) {
        startListening()
      }
    }

    synthRef.current.speak(utterance)
  }

  const speakAcknowledgment = (text: string, callback: () => void) => {
    if (!synthRef.current || isPaused) return

    const utterance = new SpeechSynthesisUtterance(text)

    utterance.onstart = () => {
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      callback()
    }

    synthRef.current.speak(utterance)
  }

  const startListening = () => {
    if (!recognitionRef.current || isPaused || isListening) return

    try {
      console.log("[v0] Starting to listen...")
      recognitionRef.current.start()
      setIsListening(true)
    } catch (error) {
      console.log("[v0] Error starting recognition:", error)
    }
  }

  const handleUserResponse = (transcript: string) => {
    const currentQuestion = conversationScript[currentQuestionIndex]

    // Handle initial trigger
    if (currentQuestionIndex === 0) {
      const lowerTranscript = transcript.toLowerCase()
      const hasKeyword = currentQuestion.trigger?.some((keyword) => lowerTranscript.includes(keyword))

      if (hasKeyword) {
        // Move to first real question
        const nextIndex = 1
        setAnswers([transcript])
        setCurrentQuestionIndex(nextIndex)

        speakAcknowledgment("Great. Let's begin.", () => {
          speakQuestion(nextIndex)
        })
      } else {
        // Repeat the trigger question
        speakQuestion(0)
      }
      return
    }

    // Save the answer
    const newAnswers = [...answers, transcript]
    setAnswers(newAnswers)

    // Check if we're done
    if (currentQuestionIndex === conversationScript.length - 1) {
      // Final acknowledgment and completion
      speakAcknowledgment("Got it.", () => {
        const finalUtterance = new SpeechSynthesisUtterance(finalMessage)
        finalUtterance.onend = () => {
          setIsComplete(true)
          setTimeout(() => {
            router.push("/staff/dashboard")
          }, 2000)
        }
        synthRef.current?.speak(finalUtterance)
      })
    } else {
      // Move to next question
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)

      const acknowledgmentText = currentQuestion.acknowledgment || "Got it."

      speakAcknowledgment(acknowledgmentText, () => {
        speakQuestion(nextIndex)
      })
    }
  }

  const handlePause = () => {
    setIsPaused(true)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    setIsListening(false)
    setIsSpeaking(false)
  }

  const handleRepeatQuestion = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
    setIsSpeaking(false)

    setTimeout(() => {
      speakQuestion(currentQuestionIndex)
    }, 300)
  }

  const handleExit = () => {
    setIsExiting(true)

    // Stop all speech and recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    setIsListening(false)
    setIsSpeaking(false)

    // Speak exit message
    const exitMessage = "Thank you for starting this process. You can resume anytime you want."
    const utterance = new SpeechSynthesisUtterance(exitMessage)

    utterance.onend = () => {
      setTimeout(() => {
        router.push("/staff/dashboard")
      }, 1000)
    }

    synthRef.current?.speak(utterance)
  }

  if (!browserSupport) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Browser Not Supported</h1>
          <p className="text-muted-foreground">
            Your browser does not support the Web Speech API. Please use Chrome, Edge, or Safari to access this feature.
          </p>
        </div>
      </div>
    )
  }

  const currentQuestion = conversationScript[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 border border-primary/10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Incident Report
            </h1>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {conversationScript.length}
            </p>
          </div>

          {/* Animated Orb */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Outer pulse rings */}
              {(isListening || isSpeaking) && (
                <>
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <div
                    className="absolute inset-0 rounded-full bg-primary/20 animate-ping"
                    style={{ animationDelay: "0.5s" }}
                  />
                </>
              )}

              {/* Main orb */}
              <div
                className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isListening
                    ? "bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-500/50"
                    : isSpeaking
                      ? "bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/50"
                      : "bg-gradient-to-br from-gray-300 to-gray-400"
                }`}
              >
                <Mic className={`w-12 h-12 text-white ${isListening ? "animate-pulse" : ""}`} />
              </div>

              {/* Status text */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <p className="text-sm font-medium text-muted-foreground">
                  {isListening ? "Listening..." : isSpeaking ? "Speaking..." : isPaused ? "Paused" : "Ready"}
                </p>
              </div>
            </div>
          </div>

          {/* Question Display */}
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-6 md:p-8 mb-8 mt-12 border border-primary/10">
            <p className="text-lg md:text-xl text-center leading-relaxed text-foreground">
              {isExiting
                ? "Thank you for starting this process. You can resume anytime you want."
                : isComplete
                  ? finalMessage
                  : currentQuestion.question}
            </p>
          </div>

          {/* Transcript Display */}
          {transcript && !isExiting && (
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">Your response:</p>
              <p className="text-foreground">{transcript}</p>
            </div>
          )}

          {/* Control Buttons */}
          {!isComplete && !isExiting && (
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={handlePause}
                variant="outline"
                size="lg"
                className="gap-2 bg-transparent"
                disabled={isPaused}
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
              <Button onClick={handleRepeatQuestion} variant="outline" size="lg" className="gap-2 bg-transparent">
                <RotateCcw className="w-4 h-4" />
                Repeat Question
              </Button>
              <Button
                onClick={handleExit}
                variant="outline"
                size="lg"
                className="gap-2 bg-transparent border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <X className="w-4 h-4" />
                Exit
              </Button>
            </div>
          )}

          {/* Completion Message */}
          {(isComplete || isExiting) && (
            <div className="text-center">
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Speak clearly into your microphone. The system will guide you through the report.</p>
        </div>
      </div>
    </div>
  )
}
