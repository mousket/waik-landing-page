import { useCallback, useEffect, useRef, useState } from "react"

export interface SpeakOptions {
  rate?: number
  pitch?: number
  volume?: number
  onstart?: () => void
  onend?: () => void
  voice?: SpeechSynthesisVoice
}

const canUseSpeechSynthesis = typeof window !== "undefined" && "speechSynthesis" in window

export function useSpeechSynthesis(defaultLang: string = "en") {
  const [isSupported, setIsSupported] = useState<boolean>(canUseSpeechSynthesis)
  const [voicesReady, setVoicesReady] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(canUseSpeechSynthesis)

  const synthRef = useRef<SpeechSynthesis | null>(canUseSpeechSynthesis ? window.speechSynthesis : null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (!canUseSpeechSynthesis) {
      setIsSupported(false)
      return
    }

    const synth = window.speechSynthesis
    synthRef.current = synth
    setIsSupported(true)

    const handleVoices = () => {
      const voices = synth.getVoices()
      if (!voices || voices.length === 0) return

      voiceRef.current =
        voices.find((voice) => voice.lang.toLowerCase().startsWith(defaultLang.toLowerCase())) ?? voices[0]
      setVoicesReady(true)
    }

    synth.addEventListener("voiceschanged", handleVoices)
    handleVoices()

    return () => {
      synth.removeEventListener("voiceschanged", handleVoices)
    }
  }, [defaultLang])

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (!synthRef.current || !isSupported || !autoSpeak) return false
      const trimmed = text?.trim()
      if (!trimmed) return false

      if (!voiceRef.current) {
        const voices = synthRef.current.getVoices()
        if (voices && voices.length > 0) {
          voiceRef.current =
            voices.find((voice) => voice.lang.toLowerCase().startsWith(defaultLang.toLowerCase())) ?? voices[0]
          setVoicesReady(true)
        }
      }

      const utterance = new SpeechSynthesisUtterance(trimmed)
      utterance.rate = options?.rate ?? 0.95
      utterance.pitch = options?.pitch ?? 1
      utterance.volume = options?.volume ?? 1
      utterance.voice = options?.voice ?? voiceRef.current ?? null

      const userOnStart = options?.onstart
      const userOnEnd = options?.onend
      utterance.onstart = () => {
        setIsSpeaking(true)
        userOnStart?.()
      }
      utterance.onend = () => {
        setIsSpeaking(false)
        userOnEnd?.()
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
      }

      synthRef.current.cancel()
      synthRef.current.speak(utterance)
      return true
    },
    [defaultLang, isSupported, autoSpeak],
  )

  const cancel = useCallback(() => {
    synthRef.current?.cancel()
    setIsSpeaking(false)
  }, [])

  return {
    speak,
    stopSpeaking: cancel,
    isSpeaking,
    autoSpeak,
    setAutoSpeak,
    speechSupported: isSupported,
    voicesLoaded: voicesReady,
  }
}
