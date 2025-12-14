"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export function useSpeechSynthesis(lang = "en-US") {
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    // Check if speech synthesis is supported
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSpeechSupported(true)

      // Load voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          setVoicesLoaded(true)
        }
      }

      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!speechSupported || !text) return

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang

      // Try to find a voice that matches the language
      const voices = window.speechSynthesis.getVoices()
      const voice = voices.find((v) => v.lang.startsWith(lang.split("-")[0]))
      if (voice) {
        utterance.voice = voice
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [speechSupported, lang],
  )

  const stopSpeaking = useCallback(() => {
    if (speechSupported) {
      window.speechSynthesis.cancel()
    }
  }, [speechSupported])

  return {
    speak,
    stopSpeaking,
    autoSpeak,
    setAutoSpeak,
    speechSupported,
    voicesLoaded,
  }
}
