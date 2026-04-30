"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Mic, Pause, Play, Square } from "lucide-react"

import { CompletionRing } from "@/components/shared/completion-ring"
import { Button } from "@/components/ui/button"
import { WaikTealHeroStrip } from "@/components/ui/waik-teal-hero-strip"
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

/**
 * WebKit / iOS often emits **cumulative** phrases per result index (each slot repeats
 * and extends the previous). Concatenating every `results[i]` duplicates text. We keep
 * one string per finalized index and merge by preferring extensions.
 */
function mergeCumulativeFinalChunks(chunks: string[]): string {
  let out = ""
  for (const raw of chunks) {
    const piece = raw
    const c = piece.trimStart()
    if (!c) continue
    const o = out.trimEnd()
    if (!o) {
      out = piece
      continue
    }
    const oTrim = o.trim()
    if (c.startsWith(oTrim) || c.toLowerCase().startsWith(oTrim.toLowerCase())) {
      out = piece
      continue
    }
    const joiner = o.endsWith(" ") || piece.startsWith(" ") ? "" : " "
    out = o + joiner + piece
  }
  return out
}

function joinTranscriptSegments(base: string, addition: string): string {
  const a = base.trimEnd()
  const b = addition.trim()
  if (!b) return a
  if (!a) return b
  const joiner = a.endsWith(" ") || b.startsWith(" ") ? "" : " "
  return (a + joiner + b).trim()
}

const PRIMARY_CTA =
  "group relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#0D7377] to-[#0b6569] text-base font-semibold text-white shadow-lg shadow-[#0D7377]/30 ring-1 ring-[#0D7377]/30 transition-all hover:from-[#0f858a] hover:to-[#0D7377] hover:shadow-xl hover:shadow-[#0D7377]/35 motion-safe:active:scale-[0.99] motion-safe:hover:scale-[1.01] motion-reduce:hover:scale-100 motion-reduce:active:scale-100"

const MIC_GLYPH =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0D7377] to-[#0A3D40] text-white shadow-lg shadow-[#0D7377]/30 ring-2 ring-white/40 dark:ring-white/10 sm:h-12 sm:w-12"

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
  /** Draft typed while recording; flushed in one go so we never insert spaces between single characters. */
  const [appendBuffer, setAppendBuffer] = useState("")

  const preVoiceTranscriptRef = useRef(initialTranscript)
  /** Final transcripts keyed by `results` index — avoids iOS/WebKit cumulative duplication. */
  const finalTranscriptByIndexRef = useRef<Record<number, string>>({})
  const recognitionRef = useRef<SpeechRecognitionType | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const consecutiveNoSpeechRef = useRef(0)
  const awaitingAnswerRef = useRef(true)
  const textFallbackBlockRef = useRef<HTMLDivElement | null>(null)
  const mainTranscriptRef = useRef<HTMLTextAreaElement | null>(null)
  const needResumeAfterVisibilityRef = useRef(false)
  const isRecordingRef = useRef(false)
  const isPausedRef = useRef(false)
  const onVisibilityResumeRef = useRef<() => void>(() => {})
  const appendInputId = React.useId()
  /** Latest transcript for recognition.onend restarts (iOS re-starts sessions without a React render). */
  const transcriptSnapshotRef = useRef(transcript)

  isRecordingRef.current = isRecording
  isPausedRef.current = isPaused

  useEffect(() => {
    transcriptSnapshotRef.current = transcript
  }, [transcript])

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
    finalTranscriptByIndexRef.current = {}
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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      consecutiveNoSpeechRef.current = 0
      const results = event.results

      let interim = ""
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        if (!r.isFinal) {
          interim += r[0]?.transcript ?? ""
        }
      }

      for (let i = event.resultIndex; i < results.length; i++) {
        const r = results[i]
        if (r.isFinal) {
          const text = r[0]?.transcript ?? ""
          if (text) {
            finalTranscriptByIndexRef.current[i] = text
          }
        }
      }

      const indices = Object.keys(finalTranscriptByIndexRef.current)
        .map(Number)
        .sort((x, y) => x - y)
      const chunks = indices.map((k) => finalTranscriptByIndexRef.current[k]).filter(Boolean)
      const mergedFinals = mergeCumulativeFinalChunks(chunks)
      const spoken = joinTranscriptSegments(mergedFinals, interim)

      if (!spoken.trim()) return
      setTranscript(joinTranscriptSegments(preVoiceTranscriptRef.current, spoken))
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
        preVoiceTranscriptRef.current = transcriptSnapshotRef.current.trimEnd()
        finalTranscriptByIndexRef.current = {}
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
      finalTranscriptByIndexRef.current = {}
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
    finalTranscriptByIndexRef.current = {}
    consecutiveNoSpeechRef.current = 0
  }

  const handleDone = () => {
    const t = transcript.trim()
    if (t.length < 10) {
      return
    }
    onSubmit(t)
  }

  const flushAppendToTranscript = useCallback(() => {
    const chunk = appendBuffer.trim()
    if (!chunk) return
    setTranscript((prev) => {
      const t = prev.trimEnd()
      const join = t.length === 0 ? "" : t.endsWith(" ") || chunk.startsWith(" ") ? "" : " "
      return `${t}${join}${chunk}`
    })
    setAppendBuffer("")
    requestAnimationFrame(() => {
      const main = mainTranscriptRef.current
      if (main) main.scrollTop = main.scrollHeight
    })
  }, [appendBuffer])

  useEffect(() => {
    if (!isRecording) setAppendBuffer("")
  }, [isRecording])

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

  /** While the mic is actively capturing (not paused), keep the main field pinned to the latest STT / append text. */
  useEffect(() => {
    if (!isRecording || isPaused) return
    const el = mainTranscriptRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [transcript, isRecording, isPaused])

  return (
    <div className="flex min-h-0 w-full max-md:flex-none flex-col pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:flex-1 md:pb-0">
      <div className="mx-auto flex w-full max-w-[min(26rem,calc(100vw-1.5rem))] max-md:flex-none flex-col max-md:min-h-0 min-h-0 flex-1 px-2 pb-3 pt-1 sm:max-w-[min(28rem,calc(100vw-1.75rem))] sm:px-2.5 sm:pb-3 sm:pt-1.5">
        <div
          className={cn(
            "flex min-h-0 min-w-0 max-md:flex-none flex-1 flex-col max-md:overflow-visible overflow-hidden rounded-2xl border border-[#0D7377]/25 bg-background shadow-2xl shadow-[#0A3D40]/20 duration-300 dark:border-[#0D7377]/35 dark:shadow-black/35",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 motion-reduce:animate-none",
          )}
        >
          <WaikTealHeroStrip heightClassName="h-[72px] sm:h-20" />

          <div className="flex min-h-0 min-w-0 max-md:flex-none flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-2.5 py-1.5 sm:px-3 sm:py-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl text-foreground hover:bg-muted/80"
                onClick={handleBack}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {questionLabel ? (
                <span className="line-clamp-1 flex-1 text-center text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary/80 sm:text-xs sm:tracking-[0.2em]">
                  {questionLabel}
                </span>
              ) : (
                <span className="flex-1" />
              )}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                {completionRingPercent != null ? (
                  <CompletionRing percent={completionRingPercent} size={34} strokeWidth={3} showLabel />
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 max-md:flex-none max-md:overflow-visible md:min-h-0 md:overflow-y-auto md:overscroll-contain md:[scrollbar-gutter:stable]">
              <div
                className={cn(
                  "space-y-3 px-3 pb-10 pt-3 sm:space-y-3.5 sm:px-4 sm:pt-4 md:pb-28",
                  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:[animation-delay:80ms] motion-reduce:animate-none",
                )}
              >
                <div className="flex gap-2.5 sm:gap-3">
                  <div className={cn(MIC_GLYPH, isRecording && !isPaused && "motion-safe:animate-pulse")} aria-hidden>
                    <Mic className="h-5 w-5 opacity-95 sm:h-6 sm:w-6" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <h1 className="text-lg font-semibold leading-snug tracking-tight text-[#0A3D40] dark:text-foreground sm:text-xl">
                      {question}
                    </h1>
                    <div
                      className="h-px w-full max-w-[180px] bg-gradient-to-r from-[#0D7377] via-[#44DAD2]/80 to-transparent opacity-90"
                      aria-hidden
                    />
                    {areaHint ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">{areaHint}</p>
                    ) : null}
                    {showEncouragement ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Extra detail now means fewer follow-up questions later.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Your answer
                  </label>
                  <textarea
                    ref={mainTranscriptRef}
                    value={transcript}
                    onChange={(e) => handleTranscriptChange(e.target.value)}
                    placeholder={
                      voiceUnavailable
                        ? "Type your answer…"
                        : "Speak or type — your words appear here…"
                    }
                    readOnly={!voiceUnavailable && isRecording && !isPaused}
                    className={cn(
                      "min-h-[9rem] w-full max-h-[min(36vh,17rem)] resize-none overflow-y-auto rounded-xl border border-primary/15 bg-muted/25 p-2.5 font-sans text-sm leading-relaxed tracking-normal text-foreground antialiased shadow-inner scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20 sm:min-h-[10rem] sm:max-h-[min(40vh,19rem)] sm:p-3 sm:text-[0.9375rem]",
                      !voiceUnavailable && isRecording && !isPaused && "cursor-default opacity-95",
                    )}
                  />
                </div>

                {voiceUnavailable ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Voice is not available on this device — use the field above.
                  </p>
                ) : null}

                {!voiceUnavailable ? (
                  <div className="space-y-2 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.05] via-background to-accent/[0.03] px-2 py-2 shadow-sm sm:px-2.5 sm:py-2 md:py-2">
                    <div className="flex min-h-[3rem] flex-nowrap items-center justify-between gap-2 sm:min-h-[3.25rem]">
                      <span className="w-12 shrink-0 text-[0.55rem] font-bold uppercase leading-tight tracking-wide text-primary/75 sm:w-14 sm:text-[0.6rem]">
                        Record
                      </span>
                      <button
                        type="button"
                        onClick={toggleRecordPress}
                        className={cn(
                          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md ring-2 ring-white/25 transition-transform motion-safe:active:scale-[0.98] sm:h-12 sm:w-12 sm:shadow-lg",
                          isRecording
                            ? isPaused
                              ? "bg-rose-600 shadow-rose-600/20"
                              : "animate-pulse bg-rose-600 shadow-rose-600/25"
                            : "bg-gradient-to-br from-[#0D7377] to-[#0A3D40] shadow-[#0D7377]/30",
                        )}
                        aria-pressed={isRecording}
                        aria-label={isRecording ? "Stop recording" : "Start recording"}
                      >
                        {isRecording ? <Square className="h-5 w-5 sm:h-5 sm:w-5" /> : <Mic className="h-5 w-5" />}
                      </button>
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-1.5">
                        {isRecording ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 shrink-0 rounded-lg border-primary/35 bg-background/90 px-2.5 text-xs font-medium text-primary hover:bg-primary/[0.06] sm:h-9 sm:px-3 sm:text-sm"
                            onClick={togglePause}
                          >
                            {isPaused ? (
                              <>
                                <Play className="mr-1 h-3.5 w-3.5 sm:mr-1.5 sm:h-4 sm:w-4" />
                                Resume
                              </>
                            ) : (
                              <>
                                <Pause className="mr-1 h-3.5 w-3.5 sm:mr-1.5 sm:h-4 sm:w-4" />
                                Pause
                              </>
                            )}
                          </Button>
                        ) : null}
                        {transcript.length > 0 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 shrink-0 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground sm:px-2.5 sm:text-sm"
                            onClick={handleClear}
                          >
                            Clear
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div ref={textFallbackBlockRef} className="space-y-2" id={`append-fallback-${appendInputId}`}>
                  {showTextFallbackPrompt ? (
                    <p className="text-sm font-medium text-foreground">Having trouble with voice? Add text below.</p>
                  ) : null}
                  {!voiceUnavailable ? (
                    <div className="w-full min-w-0">
                      <label
                        htmlFor={appendInputId}
                        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Add while recording
                      </label>
                      <p className="mb-1.5 text-[0.7rem] leading-snug text-muted-foreground sm:text-xs">
                        Type a phrase, then <span className="font-medium text-foreground/80">Add</span> or{" "}
                        <span className="font-medium text-foreground/80">Enter</span> — it joins your answer as normal
                        text. Pause the mic to edit the main box.
                      </p>
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch sm:gap-2">
                        <textarea
                          id={appendInputId}
                          value={appendBuffer}
                          onChange={(e) => setAppendBuffer(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              flushAppendToTranscript()
                            }
                          }}
                          className="min-h-[3.25rem] min-w-0 flex-1 resize-none rounded-xl border border-border/80 bg-background px-2.5 py-2 font-sans text-sm leading-normal tracking-normal text-foreground antialiased shadow-sm placeholder:text-muted-foreground/70 sm:min-h-[3.5rem] sm:px-3 sm:py-2 sm:text-[0.9375rem]"
                          placeholder="Phrase to add…"
                          rows={2}
                          disabled={!isRecording || isPaused}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 shrink-0 rounded-xl px-3 text-xs font-semibold sm:h-auto sm:self-stretch sm:px-4 sm:text-sm"
                          disabled={!appendBuffer.trim() || !isRecording || isPaused}
                          onClick={flushAppendToTranscript}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {!voiceUnavailable ? (
                  <div
                    className={cn(
                      "sticky bottom-0 z-[5] -mx-3 mt-2 border-t border-border/45 bg-gradient-to-t from-muted/25 to-background px-3 pt-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/92 md:hidden",
                      "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]",
                    )}
                  >
                    <Button
                      type="button"
                      disabled={!isDoneActive}
                      aria-label="Save answer"
                      className={cn(
                        "h-12 w-full shrink-0 rounded-xl text-base font-semibold shadow-md",
                        !isDoneActive && "cursor-not-allowed bg-muted text-muted-foreground shadow-none ring-0 hover:scale-100",
                        isDoneActive && PRIMARY_CTA,
                      )}
                      onClick={handleDone}
                    >
                      {isDoneActive ? (
                        <span className="relative inline-flex w-full items-center justify-center gap-2">
                          Save answer
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </span>
                      ) : (
                        <span className="inline-flex w-full items-center justify-center gap-2 text-muted-foreground">
                          Save answer (10+ characters)
                          <ArrowRight className="h-4 w-4 opacity-50" aria-hidden />
                        </span>
                      )}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className={cn(
                "shrink-0 space-y-2 border-t border-border/50 bg-background/95 px-3 pt-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 sm:px-4 sm:pb-3.5 sm:pt-3",
                "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:[animation-delay:140ms] motion-reduce:animate-none",
              )}
            >
              <Button
                type="button"
                disabled={!isDoneActive}
                className={cn(
                  "w-full",
                  !voiceUnavailable && "hidden md:inline-flex",
                  voiceUnavailable && "inline-flex",
                  !isDoneActive && "cursor-not-allowed bg-muted text-muted-foreground shadow-none ring-0 hover:scale-100",
                  isDoneActive && PRIMARY_CTA,
                )}
                onClick={handleDone}
              >
                {isDoneActive ? (
                  <>
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="relative inline-flex w-full items-center justify-center gap-2">
                      Save answer
                      <ArrowRight className="h-4 w-4 motion-safe:group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </>
                ) : (
                  <span className="inline-flex w-full items-center justify-center gap-2">
                    Save answer
                    <ArrowRight className="h-4 w-4 opacity-50" aria-hidden />
                  </span>
                )}
              </Button>
              {brief ? (
                <p className="text-center text-xs leading-snug text-amber-800 dark:text-amber-200/90 sm:text-sm">
                  Brief answers are ok — a bit more detail strengthens the chart.
                </p>
              ) : null}
              {allowDefer && onDefer ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full rounded-xl font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  onClick={() => onDefer()}
                >
                  Save for later — I can’t answer now
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceInputScreen
