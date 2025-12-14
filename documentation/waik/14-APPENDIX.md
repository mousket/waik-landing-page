# WAiK Appendix

**Version**: 1.0  
**Last Updated**: December 2024

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Environment Variables](#environment-variables)
3. [Quick Start](#quick-start)
4. [Common Commands](#common-commands)
5. [File Structure](#file-structure)
6. [API Quick Reference](#api-quick-reference)
7. [Glossary](#glossary)
8. [Troubleshooting](#troubleshooting)
9. [Documentation Index](#documentation-index)

---

## Environment Setup

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18+ | LTS recommended |
| **npm** | 9+ | Comes with Node.js |
| **pnpm** | 8+ | Optional, faster |

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd waik-landing-page

# Install dependencies
npm install --legacy-peer-deps
# OR
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local
```

### Development Server

```bash
# Start development server
npm run dev

# Server runs at http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

---

## Environment Variables

### Required Variables

```env
# OpenAI Configuration (Required for AI features)
OPENAI_API_KEY=sk-your-openai-api-key
```

### Optional Variables

```env
# Model Selection (defaults shown)
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_TEXT_EMBEDDING_MODEL=text-embedding-3-small

# Server Configuration
NODE_ENV=development
PORT=3000

# Production URL
NEXT_PUBLIC_SITE_URL=https://waik.care

# MongoDB (for production)
DATABASE_URL=mongodb://localhost:27017/waik
```

### Environment File Locations

| File | Purpose | Git Status |
|------|---------|------------|
| `.env.local` | Local development | Ignored |
| `.env.development` | Development defaults | Ignored |
| `.env.production` | Production values | Ignored |
| `.env.example` | Template for setup | Tracked |

---

## Quick Start

### 1. First-Time Setup

```bash
# Install and configure
npm install --legacy-peer-deps
cp .env.example .env.local
# Add your OPENAI_API_KEY to .env.local
```

### 2. Start Development

```bash
npm run dev
# Open http://localhost:3000
```

### 3. Demo Login

| Role | Username | Password |
|------|----------|----------|
| Staff | sarah.johnson | password123 |
| Admin | admin.user | admin123 |

Navigate to: `http://localhost:3000/waik-demo-start/login`

### 4. Test AI Features

```bash
# Create an incident via the Standard Form
# The AI will enhance the narrative and generate questions
```

---

## Common Commands

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Database

| Command | Description |
|---------|-------------|
| `npm run migrate` | Migrate lowdb to MongoDB |

### Utilities

| Command | Description |
|---------|-------------|
| `npm run build:static` | Export homepage as static |

---

## File Structure

```
waik-landing-page/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin pages
│   │   ├── dashboard/            # Admin dashboard
│   │   ├── incidents/[id]/       # Incident detail
│   │   └── layout.tsx            # Admin layout
│   ├── api/                      # API routes
│   │   ├── agent/                # Agent endpoints
│   │   │   ├── investigate/      # Investigation agent
│   │   │   ├── report/           # Report agent
│   │   │   └── report-conversational/
│   │   ├── auth/                 # Authentication
│   │   ├── incidents/            # Incident CRUD
│   │   │   └── [id]/             # Per-incident routes
│   │   │       ├── ai-report/
│   │   │       ├── answers/
│   │   │       ├── human-report/
│   │   │       ├── intelligence/
│   │   │       ├── questions/
│   │   │       └── report-card/
│   │   ├── staff/                # Staff-specific
│   │   └── users/                # User management
│   ├── incidents/                # Incident creation forms
│   │   ├── create/               # Standard form
│   │   ├── conversational/       # Chat-based
│   │   └── companion/            # Voice companion
│   ├── staff/                    # Staff pages
│   │   ├── dashboard/
│   │   ├── incidents/[id]/
│   │   └── report/
│   ├── waik-demo-start/          # Demo entry
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage (landing)
│
├── backend/                      # Backend utilities
│   ├── scripts/                  # Migration scripts
│   └── src/
│       ├── models/               # Mongoose models
│       └── services/             # Business logic
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   └── *.tsx                     # Feature components
│
├── lib/                          # Core libraries
│   ├── agents/                   # AI agents
│   │   ├── expert_investigator/  # Expert system
│   │   ├── incident-analyzer.ts  # Report generator
│   │   ├── intelligence-qa.ts    # RAG Q&A
│   │   ├── investigation_agent.ts
│   │   └── report_agent.ts
│   ├── hooks/                    # React hooks
│   ├── utils/                    # Utilities
│   ├── auth-store.ts             # Zustand auth
│   ├── db.ts                     # Database access
│   ├── embeddings.ts             # Vector cache
│   ├── gold_standards.ts         # Compliance fields
│   ├── openai.ts                 # OpenAI client
│   └── types.ts                  # TypeScript types
│
├── data/                         # Data files
│   └── db.json                   # lowdb database
│
├── documentation/                # Documentation
│   └── waik/                     # System docs (this folder)
│
├── public/                       # Static assets
│
├── .env.example                  # Environment template
├── next.config.mjs               # Next.js config
├── package.json                  # Dependencies
├── server.js                     # Custom server
└── tsconfig.json                 # TypeScript config
```

---

## API Quick Reference

### Authentication

```
POST /api/auth/login
Body: { username, password }
Returns: { success, user: { id, name, role } }
```

### Incidents

```
GET    /api/incidents                      # List all (admin)
GET    /api/staff/incidents?staffId=       # List for staff
POST   /api/incidents                      # Create
GET    /api/incidents/:id                  # Get one
PATCH  /api/incidents/:id                  # Update
DELETE /api/incidents/:id                  # Delete
```

### Questions & Answers

```
GET    /api/incidents/:id/questions        # List questions
POST   /api/incidents/:id/questions        # Add question
PATCH  /api/incidents/:id/questions/:qId   # Update/assign
POST   /api/incidents/:id/answers          # Submit answer
```

### AI Features

```
POST   /api/incidents/:id/ai-report        # Generate AI report
GET    /api/incidents/:id/report-card      # Get scoring
POST   /api/incidents/:id/intelligence     # Ask question (RAG)
```

### Agents

```
POST   /api/agent/report                   # Run report agent
POST   /api/agent/investigate              # Run investigation
POST   /api/agent/report-conversational    # Expert investigator
```

---

## Glossary

### Core Concepts

| Term | Definition |
|------|------------|
| **Incident** | A documented event (e.g., fall) requiring investigation |
| **Initial Report** | First narrative captured at the scene |
| **Investigation** | Follow-up process to gather complete information |
| **Gold Standard** | Expert-defined checklist for compliance |
| **Subtype** | Specific category (e.g., fall-wheelchair, fall-bed) |

### User Roles

| Role | Description |
|------|-------------|
| **Staff** | Healthcare workers who create and respond to reports |
| **Admin** | Supervisors who manage all incidents facility-wide |

### AI/Agent Terms

| Term | Definition |
|------|------------|
| **Report Agent** | AI that processes initial voice narratives |
| **Investigation Agent** | AI that classifies and generates questions |
| **Expert Investigator** | AI that scores and fills gaps |
| **RAG** | Retrieval-Augmented Generation (answers from data) |
| **Embedding** | Vector representation for semantic search |
| **Gold Standard** | Compliance checklist for scoring |

### Incident States

| Status | Meaning |
|--------|---------|
| **open** | Newly created, awaiting investigation |
| **in-progress** | Under active investigation |
| **pending-review** | Ready for admin review |
| **closed** | Fully documented and resolved |

### Priority Levels

| Priority | Meaning |
|----------|---------|
| **urgent** | Immediate action required |
| **high** | Serious incident, quick response |
| **medium** | Standard incident |
| **low** | Minor incident |

### Question Sources

| Source | Origin |
|--------|--------|
| **ai-generated** | Created by Investigation Agent |
| **voice-report** | Extracted from voice narrative |
| **manual** | Added by admin |

---

## Troubleshooting

### Common Issues

#### "OpenAI API key not configured"

```bash
# Check your .env.local file
cat .env.local | grep OPENAI

# Should show:
# OPENAI_API_KEY=sk-...
```

#### "Speech recognition not supported"

- Use Chrome or Edge browser
- Ensure microphone permissions granted
- Check HTTPS in production

#### "Port 3000 already in use"

```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

#### "Module not found"

```bash
# Reinstall dependencies
rm -rf node_modules
npm install --legacy-peer-deps
```

#### "Database file locked"

- Only run one instance at a time with lowdb
- For production, migrate to MongoDB

#### "AI responses are slow"

- First request loads embeddings (~5s)
- Subsequent requests are faster
- Check OpenAI API status

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm run dev

# Check browser console for [v0] logs
```

### Reset Data

```bash
# Backup current data
cp data/db.json data/db.backup.json

# Reset to sample data
git checkout data/db.json
```

---

## Documentation Index

### System Overview

| Document | Description |
|----------|-------------|
| [01-SYSTEM-OVERVIEW.md](./01-SYSTEM-OVERVIEW.md) | High-level architecture |
| [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) | Data model reference |
| [03-API-REFERENCE.md](./03-API-REFERENCE.md) | Complete API documentation |

### Agentic System

| Document | Description |
|----------|-------------|
| [04-AGENTIC-ARCHITECTURE.md](./04-AGENTIC-ARCHITECTURE.md) | Two-agent strategy |
| [05-REPORT-AGENT.md](./05-REPORT-AGENT.md) | At-scene reporter |
| [06-INVESTIGATION-AGENT.md](./06-INVESTIGATION-AGENT.md) | Classification & questions |
| [07-EXPERT-INVESTIGATOR.md](./07-EXPERT-INVESTIGATOR.md) | Scoring & gap analysis |

### AI & Intelligence

| Document | Description |
|----------|-------------|
| [08-AI-INTEGRATION.md](./08-AI-INTEGRATION.md) | OpenAI, embeddings, RAG |
| [09-GOLD-STANDARDS.md](./09-GOLD-STANDARDS.md) | Compliance framework |

### Frontend

| Document | Description |
|----------|-------------|
| [10-STAFF-DASHBOARD.md](./10-STAFF-DASHBOARD.md) | Staff user interface |
| [11-ADMIN-DASHBOARD.md](./11-ADMIN-DASHBOARD.md) | Admin capabilities |
| [12-INCIDENT-FORMS.md](./12-INCIDENT-FORMS.md) | All creation modes |

### Project Management

| Document | Description |
|----------|-------------|
| [13-ROADMAP.md](./13-ROADMAP.md) | Planned features |
| [14-APPENDIX.md](./14-APPENDIX.md) | This document |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WAIK QUICK REFERENCE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEVELOPMENT                          PRODUCTION                            │
│  ────────────                         ──────────                            │
│  npm run dev                          npm run build                         │
│  http://localhost:3000                npm run start                         │
│                                                                             │
│  DEMO LOGIN                           API BASE                              │
│  ──────────                           ────────                              │
│  Staff: sarah.johnson/password123     /api/incidents                        │
│  Admin: admin.user/admin123           /api/agent/report                     │
│                                                                             │
│  INCIDENT CREATION                    AI FEATURES                           │
│  ─────────────────                    ───────────                           │
│  /incidents/create       (Standard)   Report Agent → Enhance narrative      │
│  /incidents/conv../create (Chat)      Investigation → Classify + questions  │
│  /incidents/comp../create (Voice)     Expert Inv → Score + gaps             │
│                                       Intelligence → RAG Q&A                │
│                                                                             │
│  FALL SUBTYPES                        INCIDENT STATUS                       │
│  ─────────────                        ───────────────                       │
│  fall-wheelchair                      open → in-progress →                  │
│  fall-bed                             pending-review → closed               │
│  fall-slip                                                                  │
│  fall-lift                                                                  │
│  fall-unknown                                                               │
│                                                                             │
│  KEY FILES                                                                  │
│  ─────────                                                                  │
│  lib/agents/          Agent implementations                                 │
│  lib/gold_standards.ts Compliance checklists                                │
│  lib/openai.ts        AI configuration                                      │
│  data/db.json         Local database                                        │
│                                                                             │
│  ENVIRONMENT                                                                │
│  ───────────                                                                │
│  OPENAI_API_KEY       Required for AI                                       │
│  DATABASE_URL         MongoDB (production)                                  │
│  NEXT_PUBLIC_SITE_URL Production URL                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Support

### Getting Help

1. Check this documentation first
2. Review troubleshooting section
3. Search existing issues
4. Create new issue with details

### Reporting Issues

Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS version
- Console errors (if any)
- Screenshots (if UI issue)

---

*This appendix provides quick reference for daily development. For detailed explanations, see the linked documents.*

