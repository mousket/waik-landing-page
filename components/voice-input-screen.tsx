"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Mic, Pause, Play, Square } from "lucide-react"

import { cn } from "@/lib/utils"

type SpeechRecognitionType = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { results: ArrayLike<SpeechRecognitionResult> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

/**
 * Single answer surface for voice + typed follow-ups (board flow — task 03d).
 * Props interface is shared with follow-on tasks; do not change without bumping those tasks.
 */
export interface VoiceInputScreenProps {
  question: string
  questionLabel?: string
  areaHint?: string
  initialTranscript?: string
  allowDefer?: boolean
  showEncouragement?: boolean
  onSubmit: (transcript: string) => void
  onDefer?: () => void
  onBack: () => void
  completionRingPercent?: number
}

const BACK_CONFIRM =
  "Leave without saving? Your answer will be lost."
const CLEAR_CONFIRM = "Clear your answer and start over?"

function buildSpeechText(event: { results: ArrayLike<SpeechRecognitionResult> }): string {
  let out = ""
  for (let i = 0; i < event.results.length; i++) {
    out += (event.results[i] as SpeechRecognitionResult)[0]!.transcript
  }
  return out
}

function CompletionRing({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent))
  const r = 16
  const c = 2 * Math.PI * r
  const offset = c - (p / 100) * c
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center text-primary">
      <svg width="40" height="40" viewBox="0 0 40 40" className="block -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" className="stroke-muted" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-medium text-foreground" aria-hidden>
        {Math.round(p)}
      </span>
    </div>
  )
}

export function VoiceInputScreen({
  question,
  questionLabel,
  areaHint,
  initialTranscript = "",
  allowDefer = false,
  showEncouragement = false,
  onSubmit,
  onDefer,
  onBack,
  completionRingPercent,
}: VoiceInputScreenProps) {
  const [transcript, setTranscript] = useState(initialTranscript)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showTextFallbackPrompt, setShowTextFallbackPrompt] = useState(false)
  const [voiceUnavailable, setVoiceUnavailable] = useState(false)

  const preVoiceTranscriptRef = useRef(initialTranscript)
  const recognitionRef = useRef<SpeechRecognitionType | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const consecutiveNoSpeechRef = useRef(0)
  const awaitingAnswerRef = useRef(true)
  const textFallbackBlockRef = useRef<HTMLDivElement | null>(null)
  const needResumeAfterVisibilityRef = useRef(false)
  const isRecordingRef = useRef(false)
  const isPausedRef = useRef(false)
  const onVisibilityResumeRef = useRef<() => void>(() => {})
  const appendInputId = React.useId()

  isRecordingRef.current = isRecording
  isPausedRef.current = isPaused

  useEffect(() => {
    if (typeof window === "undefined") return
    setVoiceUnavailable(
      !(
        (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
      ),
    )
  }, [])

  useEffect(() => {
    if (initialTranscript) {
      setTranscript(initialTranscript)
      preVoiceTranscriptRef.current = initialTranscript
    }
  }, [initialTranscript])

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release()
    } catch {
      /* optional API */
    }
    wakeLockRef.current = null
  }, [])

  const hardStopRecognition = useCallback(() => {
    const r = recognitionRef.current
    if (r) {
      r.onend = null
      try {
        r.stop()
      } catch {
        /* already stopped */
      }
    }
    recognitionRef.current = null
  }, [])

  const stopSession = useCallback(() => {
    hardStopRecognition()
    setIsRecording(false)
    setIsPaused(false)
    void releaseWakeLock()
  }, [hardStopRecognition, releaseWakeLock])

  const startRecording = useCallback(() => {
    if (typeof window === "undefined" || voiceUnavailable) {
      return
    }
    preVoiceTranscriptRef.current = transcript.trimEnd()
    setShowTextFallbackPrompt(false)
    setIsPaused(false)
    isPausedRef.current = false

    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionType }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionType })
        .webkitSpeechRecognition
    if (!Ctor) {
      setVoiceUnavailable(true)
      return
    }

    hardStopRecognition()

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: { results: ArrayLike<SpeechRecognitionResult> }) => {
      consecutiveNoSpeechRef.current = 0
      const t = buildSpeechText(event)
      if (!t.trim()) {
        return
      }
      const pre = preVoiceTranscriptRef.current
      const next = (pre + (pre && t ? (pre.endsWith(" ") || t.startsWith(" ") ? "" : " ") : "") + t).trim()
      setTranscript(next)
    }

    recognition.onerror = (event: { error: string }) => {
      if (event.error === "no-speech") {
        consecutiveNoSpeechRef.current += 1
        if (consecutiveNoSpeechRef.current >= 2) {
          setShowTextFallbackPrompt(true)
          textFallbackBlockRef.current?.scrollIntoView({ behavior: "smooth" })
        }
      }
    }

    recognition.onend = () => {
      if (isRecordingRef.current && !isPausedRef.current && recognitionRef.current) {
        try {
          recognition.start()
        } catch {
          /* ignore */
        }
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setIsRecording(false)
      return
    }
    setIsRecording(true)
    isRecordingRef.current = true
    void navigator.wakeLock
      ?.request?.("screen")
      .then((lock) => {
        wakeLockRef.current = lock
      })
      .catch(() => {
        /* not supported */
      })
  }, [hardStopRecognition, transcript, voiceUnavailable])

  onVisibilityResumeRef.current = startRecording

  const toggleRecordPress = useCallback(() => {
    if (isRecording) {
      stopSession()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopSession])

  const togglePause = useCallback(() => {
    const r = recognitionRef.current
    if (!r) {
      return
    }
    if (isPaused) {
      preVoiceTranscriptRef.current = transcript.trimEnd()
      setIsPaused(false)
      isPausedRef.current = false
      try {
        r.start()
      } catch {
        startRecording()
      }
    } else {
      setIsPaused(true)
      isPausedRef.current = true
      try {
        r.stop()
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keep stable; reads latest transcript when pausing without recreating on each keystroke
  }, [isPaused, startRecording])

  const handleTranscriptChange = (v: string) => {
    setTranscript(v)
  }

  const handleBack = () => {
    if (transcript.trim().length > 0) {
      if (typeof window !== "undefined" && !window.confirm(BACK_CONFIRM)) {
        return
      }
    }
    onBack()
  }

  const handleClear = () => {
    if (typeof window !== "undefined" && !window.confirm(CLEAR_CONFIRM)) {
      return
    }
    setTranscript("")
    preVoiceTranscriptRef.current = ""
    consecutiveNoSpeechRef.current = 0
  }

  const handleDone = () => {
    const t = transcript.trim()
    if (t.length < 10) {
      return
    }
    onSubmit(t)
  }

  const handleAppendInput: React.FormEventHandler<HTMLTextAreaElement> = (e) => {
    const el = e.currentTarget
    const v = el.value
    if (!v) {
      return
    }
    setTranscript((prev) => prev + (prev ? (prev.endsWith(" ") || v.startsWith(" ") ? "" : " ") : "") + v)
    el.value = ""
  }

  const trimmedLen = transcript.trim().length
  const isDoneActive = trimmedLen >= 10
  const brief = trimmedLen >= 10 && trimmedLen <= 30

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (isRecordingRef.current && !isPausedRef.current) {
          needResumeAfterVisibilityRef.current = true
        }
      } else if (
        document.visibilityState === "visible" &&
        needResumeAfterVisibilityRef.current &&
        !isRecordingRef.current &&
        !isPausedRef.current &&
        awaitingAnswerRef.current
      ) {
        needResumeAfterVisibilityRef.current = false
        setTimeout(() => {
          onVisibilityResumeRef.current()
        }, 1000)
      }
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  useEffect(() => {
    return () => {
      awaitingAnswerRef.current = false
      stopSession()
    }
  }, [stopSession])

  return (
    <div
      className="flex min-h-0 min-h-[100dvh] flex-1 flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5"
    >
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/30 bg-background/80 px-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-full text-foreground hover:bg-muted/80"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        {questionLabel ? (
          <span className="line-clamp-1 flex-1 text-center text-sm font-medium text-muted-foreground">
            {questionLabel}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <div className="relative h-10 w-10">
          {completionRingPercent != null ? (
            <div className="relative flex h-10 w-10 items-center justify-center">
              <CompletionRing percent={completionRingPercent} />
            </div>
          ) : (
            <span className="inline-block w-10" />
          )}
        </div>
      </div>

      {/* Question */}
      <div className="shrink-0 px-4 py-6">
        <h1 className="text-lg font-semibold text-foreground">{question}</h1>
        {areaHint ? <p className="mt-1 text-sm italic text-muted-foreground">{areaHint}</p> : null}
        {showEncouragement ? (
          <p className="mt-2 text-sm italic text-muted-foreground">
            Feel free to include any other details — the more you share, the fewer questions remain.
          </p>
        ) : null}
      </div>

      {/* Transcript */}
      <div className="min-h-0 flex-1 px-4">
        <textarea
          value={transcript}
          onChange={(e) => handleTranscriptChange(e.target.value)}
          placeholder="Your answer will appear here as you speak..."
          readOnly={!voiceUnavailable && isRecording && !isPaused}
          className="min-h-[160px] w-full resize-none rounded-xl border border-border bg-card p-3 text-base text-foreground shadow-sm"
        />
      </div>

      {voiceUnavailable ? (
        <p className="px-4 pb-2 text-sm text-muted-foreground">
          Voice input is not available on this device. Please type your answer.
        </p>
      ) : null}

      {/* Voice row */}
      {!voiceUnavailable ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={toggleRecordPress}
            className={cn(
              "inline-flex h-16 w-16 min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-md",
              isRecording
                ? isPaused
                  ? "bg-rose-600"
                  : "animate-pulse bg-rose-600"
                : "bg-primary hover:opacity-95",
            )}
            aria-pressed={isRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
          {isRecording ? (
            <button
              type="button"
              onClick={togglePause}
              className="inline-flex min-h-10 min-w-[4.5rem] items-center justify-center rounded-md border-2 border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
            >
              {isPaused ? (
                <>
                  <Play className="mr-1 h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="mr-1 h-4 w-4" />
                  Pause
                </>
              )}
            </button>
          ) : null}
          {transcript.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex min-h-10 min-w-[4rem] items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/80"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Text append fallback (always for speech devices; for no-voice, main textarea is enough) */}
      <div
        ref={textFallbackBlockRef}
        className="shrink-0 space-y-1 px-4 pb-2"
        id={`append-fallback-${appendInputId}`}
      >
        {showTextFallbackPrompt ? (
          <p className="text-sm text-foreground">Having trouble with voice? Type your answer below.</p>
        ) : null}
        {!voiceUnavailable ? (
          <>
            <label htmlFor={appendInputId} className="sr-only">
              Or type to add to your answer
            </label>
            <textarea
              id={appendInputId}
              onInput={handleAppendInput as unknown as React.FormEventHandler<HTMLTextAreaElement>}
              className="min-h-[64px] w-full rounded-md border border-border bg-card p-2 text-sm"
              placeholder="Or type your answer here..."
            />
          </>
        ) : null}
      </div>

      {/* Done */}
      <div className="mt-auto space-y-2 px-4 pb-4">
        <button
          type="button"
          onClick={handleDone}
          disabled={!isDoneActive}
          className={cn(
            "w-full min-h-12 rounded-xl py-4 text-center text-base font-semibold text-primary-foreground",
            isDoneActive
              ? "cursor-pointer bg-primary hover:opacity-95"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          Done
        </button>
        {brief ? (
          <p className="text-center text-sm text-amber-700">
            This answer is brief — more detail makes for a stronger report.
          </p>
        ) : null}
      </div>

      {allowDefer && onDefer ? (
        <div className="px-4 pb-6 text-center">
          <button
            type="button"
            onClick={() => onDefer()}
            className="text-sm text-muted-foreground underline decoration-muted-foreground underline-offset-2 hover:text-foreground"
          >
            I cannot answer this right now — save for later
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default VoiceInputScreen
