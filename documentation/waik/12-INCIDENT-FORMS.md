# WAiK Incident Creation Forms

**Version**: 1.0  
**Last Updated**: December 2024  
**Applies To**: Staff and Admin users

---

## Table of Contents

1. [Overview](#overview)
2. [Form Comparison](#form-comparison)
3. [Standard Voice-Guided Form](#standard-voice-guided-form)
4. [Conversational Reporting](#conversational-reporting)
5. [AI Companion](#ai-companion)
6. [Data Flow](#data-flow)
7. [Speech Recognition](#speech-recognition)
8. [Text-to-Speech](#text-to-speech)

---

## Overview

WAiK provides three distinct methods for creating incident reports, each optimized for different scenarios and user preferences:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INCIDENT CREATION OPTIONS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│   │                     │  │                     │  │                     │ │
│   │   📝 STANDARD       │  │   💬 CONVERSATIONAL │  │   🎙️ AI COMPANION   │ │
│   │   Voice-Guided      │  │   Chat-Based        │  │   Full Voice        │ │
│   │                     │  │                     │  │                     │ │
│   ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤ │
│   │                     │  │                     │  │                     │ │
│   │ • 5 structured      │  │ • Text chat with    │  │ • Hands-free        │ │
│   │   questions         │  │   AI investigator   │  │   conversation      │ │
│   │ • Voice or text     │  │ • Back-and-forth    │  │ • WAiK speaks &     │ │
│   │ • Step-by-step      │  │   Q&A               │  │   listens           │ │
│   │ • Progress bar      │  │ • Dynamic follow-up │  │ • Auto-scoring      │ │
│   │                     │  │                     │  │ • Report card       │ │
│   │                     │  │                     │  │                     │ │
│   └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                             │
│           Best for:              Best for:              Best for:           │
│        Quick reports         Detailed follow-up      Bedside reporting     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Form Comparison

| Feature | Standard | Conversational | AI Companion |
|---------|----------|----------------|--------------|
| **Route** | `/incidents/create` | `/incidents/conversational/create` | `/incidents/companion/create` |
| **Input Mode** | Voice + Text | Text | Full Voice |
| **Structure** | 5 fixed steps | Free-form chat | 4 prompts + follow-ups |
| **AI Interaction** | Post-submit | Real-time chat | Continuous conversation |
| **Hands-Free** | Partial | No | Yes |
| **Report Card** | No | No | Yes (immediate) |
| **Follow-up Questions** | Generated after | Asked during | Asked during |
| **Best For** | Structured reporting | Complex incidents | Bedside/mobile |

---

## Standard Voice-Guided Form

### File

`app/incidents/create/page.tsx`

### Purpose

Structured 5-step form that guides staff through essential incident information with voice and text input options.

### Steps

| Step | Field | Prompt |
|------|-------|--------|
| 1 | `residentName` | "What is the resident's name?" |
| 2 | `roomNumber` | "What is the resident's room number?" |
| 3 | `narrative` | "Please describe what happened..." |
| 4 | `residentState` | "Tell me about the resident's current state..." |
| 5 | `environmentNotes` | "Describe the room and environment..." |
| 6 | Processing | AI analyzes and generates questions |

### Voice Prompts Configuration

```typescript
const VOICE_PROMPTS: VoicePrompt[] = [
  {
    step: 1,
    question: "Welcome to the incident reporting system. Let's start by getting some basic information. What is the resident's name?",
    field: "residentName",
  },
  {
    step: 2,
    question: "Thank you. What is the resident's room number?",
    field: "roomNumber",
  },
  {
    step: 3,
    question: "Now, please describe what happened. Take your time and provide as much detail as possible...",
    field: "narrative",
  },
  // ...
]
```

### Input Modes

**Text Input**:
- Short fields: `<Input>` component
- Long fields: `<Textarea>` with auto-scroll

**Voice Input**:
- Click "Use Voice Input" to start
- Speech recognition captures answer
- Transcript appears in input field
- "Add More Details" for long-form fields

### Voice Recording Logic

```typescript
const startVoiceRecording = () => {
  // Set continuous mode for long-form fields
  if (isLongFormField) {
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
  } else {
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
  }
  
  recognitionRef.current.start()
}
```

### Submission Flow

```typescript
const handleSubmit = async () => {
  setIsProcessing(true)
  setCurrentStep(6)
  
  const response = await fetch("/api/agent/report", {
    method: "POST",
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
  
  // Stream response for real-time feedback
  const reader = response.body.getReader()
  // Process events...
}
```

### Processing States

```
Step 6: Processing
├── "Creating Incident Report..."
├── "Analyzing details and generating follow-up questions"
├── Shimmer loading bar
└── On complete: Redirect to dashboard
```

---

## Conversational Reporting

### File

`app/incidents/conversational/create/page.tsx` → `app/staff/report/page.tsx`

### Purpose

Text-based chat interface where staff converse with the AI investigator to build a complete report.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONVERSATIONAL FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User                         AI Investigator                              │
│     │                               │                                       │
│     │  "I need to report a fall"    │                                       │
│     │─────────────────────────────>│                                       │
│     │                               │                                       │
│     │  "Tell me more about what    │                                       │
│     │   happened..."               │                                       │
│     │<─────────────────────────────│                                       │
│     │                               │                                       │
│     │  "The resident slipped in    │                                       │
│     │   the bathroom at 8 AM..."   │                                       │
│     │─────────────────────────────>│                                       │
│     │                               │                                       │
│     │  "Were there any injuries?   │                                       │
│     │   What was the floor like?"  │                                       │
│     │<─────────────────────────────│                                       │
│     │                               │                                       │
│     │  "Minor bruising on hip.     │                                       │
│     │   Floor was wet..."          │                                       │
│     │─────────────────────────────>│                                       │
│     │                               │                                       │
│     │  [Report saved with 6        │                                       │
│     │   follow-up questions]       │                                       │
│     │<─────────────────────────────│                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Features

- Real-time AI responses
- Dynamic question generation based on narrative gaps
- Chat history maintained throughout session
- Multiple exchanges before final submission

### API Endpoint

Uses the Expert Investigator system:

```
POST /api/agent/report-conversational

Actions:
- "start": Initialize session with narrative
- "answer": Submit answer to question
- Returns: nextQuestions, score, feedback
```

---

## AI Companion

### File

`app/incidents/companion/create/page.tsx`

### Purpose

Fully hands-free voice conversation where WAiK speaks prompts and listens to responses, ideal for bedside reporting.

### Conversation Steps

```typescript
type ConversationStep = 
  | "greeting"     // WAiK introduces itself
  | "narrative"    // 4 structured prompts
  | "analyzing"    // Processing narrative
  | "follow-up"    // Asking generated questions
  | "report-card"  // Displaying score
  | "complete"     // Session ended
```

### Narrative Prompts

```typescript
const NARRATIVE_PROMPTS = [
  {
    key: "resident",
    prompt: "First, please share the resident's full name and room number..."
  },
  {
    key: "incident",
    prompt: "Now walk me through everything that happened in detail..."
  },
  {
    key: "residentState",
    prompt: "Tell me about the resident's current state..."
  },
  {
    key: "environment",
    prompt: "Describe the environment and circumstances around the fall..."
  },
]
```

### Voice System

**Text-to-Speech**:
```typescript
const speak = (text: string) => {
  if (!autoSpeak) return
  
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = selectedVoice  // Samantha or default English
  utterance.rate = 0.9
  utterance.pitch = 1.0
  
  utterance.onend = () => {
    // Start listening after speaking
    setTimeout(() => startListening(), delay)
  }
  
  synthRef.current.speak(utterance)
}
```

**Speech-to-Text**:
```typescript
recognitionRef.current.onresult = (event) => {
  for (let i = 0; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript
    if (event.results[i].isFinal) {
      // Commit answer
      setCurrentText(prev => prev + " " + transcript)
    } else {
      // Show interim
      setInterimTranscript(transcript)
    }
  }
}
```

### UI Components

**Wave Animation**:
```typescript
<CompanionWaveAnimation 
  isListening={isListening} 
  isSpeaking={isSpeaking} 
/>
```

Displays animated visualization based on current state:
- Pulsing waves when WAiK is speaking
- Active waves when listening
- Idle state when waiting

### Report Card Display

At session end, displays:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REPORT COMPLETE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ✓ Report Complete                                 │
│                                                                             │
│                              8.5/10                                         │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  Good coverage of incident details. Consider adding more specific    │ │
│   │  information about the resident's footwear and immediate response.   │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   [Show Detailed Report Card]                                               │
│                                                                             │
│   ┌─ What You Did Well ────────────────────────────────────────────────────┐│
│   │  [+] Clear timeline of events                                         ││
│   │  [+] Described resident position at time of fall                      ││
│   │  [+] Noted immediate actions taken                                    ││
│   └───────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│   ┌─ What Needs Work ──────────────────────────────────────────────────────┐│
│   │  [!] Footwear not mentioned                                           ││
│   │  [!] Bed rail status unclear                                          ││
│   └───────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│                      [Finish & Return to Dashboard]                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Session Management

Uses Expert Investigator API:

```typescript
// Start session
const startResponse = await fetch("/api/agent/report-conversational", {
  method: "POST",
  body: JSON.stringify({
    action: "start",
    incidentId: incident.id,
    narrative: narrativeSummary,
    investigatorId: "agent-companion",
    investigatorName: "WAiK Companion Investigator",
  }),
})

// Answer question
const answerResponse = await fetch("/api/agent/report-conversational", {
  method: "POST",
  body: JSON.stringify({
    action: "answer",
    sessionId: agentSessionId,
    questionId: currentQuestion.id,
    answerText: userResponse,
    method: "voice",
  }),
})
```

---

## Data Flow

### Standard Form → Report Agent

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  User Input  │────►│  /api/agent/     │────►│   Database   │
│  (5 fields)  │     │  report          │     │   Incident   │
└──────────────┘     └──────────────────┘     └──────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  Investigation   │
                     │  Agent           │
                     │  (Questions)     │
                     └──────────────────┘
```

### Companion → Expert Investigator

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Voice       │────►│  /api/incidents  │────►│   Database   │
│  (4 prompts) │     │  (create)        │     │   Incident   │
└──────────────┘     └──────────────────┘     └──────────────┘
                              │
                              ▼
┌──────────────┐     ┌──────────────────┐
│  Q&A Loop    │◄───►│  /api/agent/     │
│  (Voice)     │     │  report-conv     │
└──────────────┘     └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  Expert          │
                     │  Investigator    │
                     │  (Score + Gaps)  │
                     └──────────────────┘
```

---

## Speech Recognition

### Browser Support

```typescript
const SpeechRecognition = 
  (window as any).SpeechRecognition || 
  (window as any).webkitSpeechRecognition

if (!SpeechRecognition) {
  toast.error("Speech recognition not supported. Use Chrome or Edge.")
}
```

### Configuration

```typescript
recognitionRef.current.continuous = false    // Single phrase
recognitionRef.current.interimResults = true // Show partial results
recognitionRef.current.lang = "en-US"        // Language
```

### Mobile Detection

```typescript
const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
// Mobile devices handle dictation differently
```

### Error Handling

| Error | Handling |
|-------|----------|
| `not-allowed` | Show mic permission error, reset to start |
| `no-speech` | Silent restart of recognition |
| `aborted` | No action needed |
| Other | Toast error message |

---

## Text-to-Speech

### Voice Selection

```typescript
const loadVoices = () => {
  const voices = speechSynthesis.getVoices()
  
  // Prefer Samantha (natural-sounding)
  const samantha = voices.find(v => 
    v.name.toLowerCase().includes("samantha")
  )
  
  // Fallback to any English voice
  const englishVoice = voices.find(v => 
    v.lang.startsWith("en")
  )
  
  setSelectedVoice(samantha || englishVoice || voices[0])
}
```

### Speech Parameters

```typescript
const utterance = new SpeechSynthesisUtterance(text)
utterance.voice = selectedVoice
utterance.rate = 0.9      // Slightly slower for clarity
utterance.pitch = 1.0     // Natural pitch
utterance.volume = 1.0    // Full volume
```

### Auto-Speak Toggle

All forms include a toggle to enable/disable TTS:

```typescript
<Button onClick={() => setAutoSpeak(!autoSpeak)}>
  {autoSpeak ? <Volume2 /> : <VolumeX />}
</Button>
```

---

## Shared Hooks

### useSpeechSynthesis

```typescript
// lib/hooks/useSpeechSynthesis.ts
export function useSpeechSynthesis(lang: string = "en") {
  const [speechSupported, setSpeechSupported] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  
  const speak = (text: string, options?: SpeakOptions) => {
    // ...
  }
  
  const stopSpeaking = () => {
    speechSynthesis.cancel()
  }
  
  return {
    speak,
    stopSpeaking,
    autoSpeak,
    setAutoSpeak,
    speechSupported,
    voicesLoaded,
  }
}
```

---

## Form Validation

### Required Fields

| Form | Required | Optional |
|------|----------|----------|
| Standard | residentName, roomNumber, narrative | residentState, environmentNotes |
| Conversational | narrative | All from chat |
| Companion | All 4 prompts | None |

### Validation Logic

```typescript
// Standard form - check before next step
const handleNext = () => {
  if (!getCurrentValue().trim()) {
    toast.error("Please provide an answer before continuing")
    return
  }
  setCurrentStep(prev => prev + 1)
}
```

---

## Accessibility

### Voice Features

- All forms support voice input for hands-free use
- TTS provides audio feedback
- Visual indicators show listening/speaking states

### Keyboard Navigation

- Tab through form fields
- Enter to submit
- Escape to cancel voice input

### Visual Feedback

- Progress bars show form completion
- Loading spinners during processing
- Success/error toasts
- Color-coded status indicators

---

## Related Documentation

- [04-AGENTIC-ARCHITECTURE.md](./04-AGENTIC-ARCHITECTURE.md) - Agent system
- [05-REPORT-AGENT.md](./05-REPORT-AGENT.md) - Standard form processing
- [07-EXPERT-INVESTIGATOR.md](./07-EXPERT-INVESTIGATOR.md) - Companion scoring

---

*WAiK's three incident creation modes ensure every staff member can report effectively, whether they prefer structured forms, chat interfaces, or fully hands-free voice conversations.*

