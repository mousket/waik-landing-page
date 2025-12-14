# WAiK System Overview

**Version**: 1.0  
**Last Updated**: December 2024  
**Status**: Production-Ready Demo

---

## Table of Contents

1. [What is WAiK?](#what-is-waik)
2. [Core Problem & Solution](#core-problem--solution)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Key Components](#key-components)
6. [Data Flow](#data-flow)
7. [User Roles](#user-roles)
8. [Directory Structure](#directory-structure)

---

## What is WAiK?

WAiK (pronounced "wake") is an AI-powered incident reporting and investigation platform designed for senior care facilities. It transforms the traditionally time-consuming process of documenting falls and other incidents into a streamlined, voice-enabled experience that takes under 5 minutes.

### Core Value Proposition

- **For Staff**: Report incidents in 5 minutes via voice instead of 45+ minutes of paperwork
- **For Administrators**: Receive complete, compliance-ready reports with AI-generated insights
- **For Facilities**: Reduce documentation burden, improve compliance, prevent future incidents

---

## Core Problem & Solution

### The Problem

In senior care facilities, incident reporting (especially falls) is:
- **Time-consuming**: 45-60 minutes per incident for proper documentation
- **Incomplete**: Staff rush through forms, missing critical details
- **Delayed**: Staff prioritize resident care, documentation happens later
- **Non-compliant**: Missing information leads to regulatory issues

### The WAiK Solution

WAiK uses a **Two-Agent Architecture** to solve this:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WAiK TWO-AGENT SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐         ┌─────────────────────────────────┐   │
│  │   AGENT 1           │         │   AGENT 2                       │   │
│  │   "The Reporter"    │ ──────► │   "The Investigator"            │   │
│  │                     │ handoff │                                 │   │
│  │   • Live, at-scene  │         │   • Asynchronous, background    │   │
│  │   • Voice-enabled   │         │   • Expert analysis             │   │
│  │   • 5 minutes max   │         │   • Question generation         │   │
│  │   • Core facts only │         │   • Gap identification          │   │
│  └─────────────────────┘         └─────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Agent 1 (Reporter)**: Captures the essential facts from staff at the scene in under 5 minutes via voice.

**Agent 2 (Investigator)**: Analyzes the initial report, classifies the incident subtype, identifies gaps, and generates expert follow-up questions — all automatically in the background.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WAiK ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        FRONTEND (Next.js 14)                         │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│   │  │   Landing   │  │    Staff    │  │    Admin    │  │   Incident  │  │  │
│   │  │    Page     │  │  Dashboard  │  │  Dashboard  │  │   Detail    │  │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│   │                                                                      │  │
│   │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│   │  │              Voice-Enabled Incident Creation Flows              │ │  │
│   │  │     • Standard Create  • Companion Mode  • Conversational      │ │  │
│   │  └─────────────────────────────────────────────────────────────────┘ │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                      API LAYER (Next.js Routes)                      │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│   │  │ /api/auth   │  │/api/incidents│ │ /api/agent  │  │ /api/staff  │  │  │
│   │  │   login     │  │   CRUD      │  │  report     │  │  endpoints  │  │  │
│   │  │             │  │   + AI      │  │  investigate│  │             │  │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                      AGENT LAYER (LangChain.js)                      │  │
│   │  ┌─────────────────────┐      ┌───────────────────────────────────┐  │  │
│   │  │    Report Agent     │      │      Investigation Agent          │  │  │
│   │  │  (report_agent.ts)  │      │  (investigation_agent.ts)         │  │  │
│   │  └─────────────────────┘      └───────────────────────────────────┘  │  │
│   │                                                                      │  │
│   │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│   │  │              Expert Investigator (Conversational)               │ │  │
│   │  │   • Session Management  • Gap Analysis  • Scoring  • Finalize  │ │  │
│   │  └─────────────────────────────────────────────────────────────────┘ │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        AI LAYER (OpenAI)                             │  │
│   │  ┌─────────────────────┐      ┌───────────────────────────────────┐  │  │
│   │  │   GPT-4o-mini       │      │   text-embedding-3-small          │  │  │
│   │  │   (LLM responses)   │      │   (Vector embeddings for RAG)     │  │  │
│   │  └─────────────────────┘      └───────────────────────────────────┘  │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                      DATA LAYER (MongoDB)                            │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│   │  │    Users    │  │  Incidents  │  │  Questions  │  │Notifications│  │  │
│   │  │             │  │ (embedded)  │  │ (embedded)  │  │             │  │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│   │                                                                      │  │
│   │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│   │  │           Vector Store (Embeddings Cache - JSON file)           │ │  │
│   │  └─────────────────────────────────────────────────────────────────┘ │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | React framework with App Router | 14.2.6 |
| React | UI library | 18.2.0 |
| TypeScript | Type-safe JavaScript | 5.9.3 |
| Tailwind CSS | Utility-first styling | 4.1.9 |
| shadcn/ui | Component library (Radix-based) | Latest |
| Lucide React | Icon library | 0.454.0 |
| Zustand | State management | Latest |
| Sonner | Toast notifications | Latest |

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js API Routes | REST API endpoints | 14.2.6 |
| MongoDB | Primary database | 7.0.0 |
| Mongoose | MongoDB ODM | 8.19.3 |
| bcryptjs | Password hashing | 3.0.3 |

### AI & Intelligence
| Technology | Purpose | Version |
|------------|---------|---------|
| OpenAI | LLM and embeddings provider | 6.7.0 |
| LangChain.js | Agent orchestration | 1.0.2 |
| @langchain/openai | OpenAI integration for LangChain | 1.0.0 |

### Voice & Speech
| Technology | Purpose |
|------------|---------|
| Web Speech API | Browser-native speech recognition |
| SpeechSynthesis API | Text-to-speech for AI responses |

### Deployment
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment (v18+) |
| cPanel | Production hosting option |
| Vercel | Alternative deployment platform |

---

## Key Components

### 1. Agentic System

The core intelligence of WAiK resides in the agent layer:

#### Report Agent (`lib/agents/report_agent.ts`)
- **Purpose**: Handles live, at-the-scene incident reporting
- **Input**: Resident info, narrative, resident state, environment notes
- **Output**: Created incident, admin notifications, investigation trigger
- **Features**:
  - Narrative enhancement via AI
  - Automatic incident creation
  - Admin notification dispatch
  - Handoff to Investigation Agent

#### Investigation Agent (`lib/agents/investigation_agent.ts`)
- **Purpose**: Analyzes incidents and generates follow-up questions
- **Input**: Incident ID (triggered by Report Agent)
- **Output**: Classified subtype, queued expert questions
- **Features**:
  - Subtype classification (wheelchair, bed, slip, lift, unknown)
  - Template-based question generation
  - AI-enhanced question tailoring
  - Question deduplication

#### Expert Investigator (`lib/agents/expert_investigator/`)
- **Purpose**: Conversational gap-filling and scoring
- **Features**:
  - Session-based conversation management
  - Real-time gap analysis
  - Completeness scoring (0-100)
  - Dynamic question generation based on answers

### 2. Gold Standards System

WAiK uses "Gold Standards" — comprehensive checklists based on expert compliance requirements:

- **Global Fall Standards**: 25+ fields covering all fall incidents
- **Subtype Standards**: Specialized fields for each fall type
  - `fall-bed`: Bed height, rails, floor mats
  - `fall-wheelchair`: Brakes, cushion, footrests
  - `fall-slip`: Floor condition, lighting, obstructions
  - `fall-lift`: Lift type, staff count, sling condition

### 3. Vector Embeddings (RAG)

For the Intelligence Q&A feature:
- Questions and answers are vectorized using `text-embedding-3-small`
- Stored in `data/embeddings.json`
- Enables semantic search across incident data
- Powers the "Ask Intelligence" feature

### 4. Notification System

Real-time notifications for:
- `incident-created`: New incident reported
- `investigation-started`: Investigation agent activated
- `follow-up-required`: Questions need answers
- `investigation-completed`: All questions answered

---

## Data Flow

### Incident Creation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Staff     │     │   Report    │     │  Database   │     │Investigation│
│   Member    │────►│   Agent     │────►│  (MongoDB)  │────►│   Agent     │
│             │     │             │     │             │     │             │
│ Voice Input │     │ Enhance &   │     │ Save        │     │ Classify &  │
│ (5 mins)    │     │ Create      │     │ Incident    │     │ Generate Qs │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                                       │
                           ▼                                       ▼
                    ┌─────────────┐                         ┌─────────────┐
                    │   Notify    │                         │   Queue     │
                    │   Admins    │                         │  Questions  │
                    └─────────────┘                         └─────────────┘
```

### Question-Answer Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Staff     │     │   Expert    │     │   Gap       │     │   Score     │
│   Answers   │────►│ Investigator│────►│  Analysis   │────►│   Update    │
│   Question  │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Generate   │
                    │  Next Qs    │
                    └─────────────┘
```

---

## User Roles

### Staff Role
- **Access**: Staff dashboard, incident creation, incident details (own incidents)
- **Capabilities**:
  - Create new incidents via voice or text
  - View assigned incidents
  - Answer follow-up questions
  - View incident reports and intelligence

### Admin Role
- **Access**: Admin dashboard, all incidents, full incident details
- **Capabilities**:
  - View all facility incidents
  - Add questions to any incident
  - View/generate AI reports
  - Create/edit human reports
  - Access intelligence Q&A
  - Start conversational investigations

---

## Directory Structure

```
waik-landing-page/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin pages
│   │   ├── dashboard/            # Admin dashboard
│   │   └── incidents/[id]/       # Admin incident detail
│   ├── api/                      # API routes
│   │   ├── agent/                # Agent endpoints
│   │   │   ├── report/           # Report agent API
│   │   │   ├── investigate/      # Investigation agent API
│   │   │   └── report-conversational/  # Expert investigator API
│   │   ├── auth/                 # Authentication
│   │   ├── incidents/            # Incident CRUD + AI features
│   │   └── staff/                # Staff-specific endpoints
│   ├── incidents/                # Incident creation flows
│   │   ├── create/               # Standard creation
│   │   ├── companion/            # Companion mode (guided voice)
│   │   └── conversational/       # Conversational mode
│   ├── staff/                    # Staff pages
│   │   ├── dashboard/            # Staff dashboard
│   │   ├── incidents/[id]/       # Staff incident detail
│   │   └── report/               # Quick report page
│   └── waik-demo-start/          # Demo login page
│
├── backend/                      # Backend utilities
│   └── src/
│       ├── lib/                  # MongoDB connection
│       ├── models/               # Mongoose schemas
│       └── services/             # Business logic services
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   └── [feature-components]      # Feature-specific components
│
├── lib/                          # Core library code
│   ├── agents/                   # Agent implementations
│   │   ├── expert_investigator/  # Conversational investigator
│   │   ├── report_agent.ts       # Report agent
│   │   ├── investigation_agent.ts # Investigation agent
│   │   ├── incident-analyzer.ts  # AI report generator
│   │   └── intelligence-qa.ts    # RAG Q&A agent
│   ├── auth-store.ts             # Authentication state
│   ├── db.ts                     # Database operations
│   ├── embeddings.ts             # Vector embedding utilities
│   ├── gold_standards.ts         # Compliance standards types
│   ├── openai.ts                 # OpenAI client
│   ├── types.ts                  # TypeScript types
│   └── utils/                    # Utility functions
│
├── data/                         # Local data files
│   ├── db.json                   # Legacy lowdb data
│   └── embeddings.json           # Vector embeddings cache
│
├── documentation/                # Project documentation
│   ├── waik/                     # WAiK system docs (this folder)
│   └── [other docs]              # Setup guides, roadmaps
│
├── public/                       # Static assets
└── scripts/                      # Build/utility scripts
```

---

## Quick Start Reference

### Environment Variables Required

```env
# Database
DATABASE_URL=mongodb://...
MONGODB_DB_NAME=waik-demo

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_TEXT_EMBEDDING_MODEL=text-embedding-3-small

# Production
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://waik.care
```

### Key Commands

```bash
# Development
npm run dev

# Production build
npm run build
npm run start

# Static homepage export
npm run build:static
```

---

## Related Documentation

- [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) - Detailed database schemas
- [03-API-REFERENCE.md](./03-API-REFERENCE.md) - Complete API documentation
- [04-AGENTIC-ARCHITECTURE.md](./04-AGENTIC-ARCHITECTURE.md) - Deep dive into agents

---

*This document provides a high-level overview. For specific implementation details, refer to the related documentation files.*

