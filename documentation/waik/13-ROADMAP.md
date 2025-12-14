# WAiK Development Roadmap

**Version**: 1.0  
**Last Updated**: December 2024  
**Current Status**: V1 MVP Complete

---

## Table of Contents

1. [Current State](#current-state)
2. [Completed Features](#completed-features)
3. [Known Issues](#known-issues)
4. [Planned Features](#planned-features)
5. [Technical Debt](#technical-debt)
6. [Future Vision](#future-vision)
7. [Priority Matrix](#priority-matrix)

---

## Current State

### V1 MVP Status: ✅ Complete

WAiK V1 is a fully functional incident reporting and investigation system for healthcare facilities.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CURRENT ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        FRONTEND (Next.js)                           │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│   │  │  Staff  │ │  Admin  │ │ Standard│ │  Chat   │ │Companion│       │   │
│   │  │Dashboard│ │Dashboard│ │  Form   │ │Reporting│ │  Voice  │       │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        API LAYER (Next.js)                          │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│   │  │Incidents│ │Questions│ │ Agent   │ │  Auth   │ │  Users  │       │   │
│   │  │  CRUD   │ │ Answers │ │Endpoints│ │  Login  │ │  List   │       │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       AGENTIC LAYER                                 │   │
│   │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │   │
│   │  │ Report Agent  │  │ Investigation │  │    Expert     │           │   │
│   │  │  (At-Scene)   │  │    Agent      │  │ Investigator  │           │   │
│   │  └───────────────┘  └───────────────┘  └───────────────┘           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     DATA LAYER (lowdb/MongoDB)                      │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │   │
│   │  │Incidents│ │  Users  │ │Questions│ │Notifs   │                   │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Completed Features

### ✅ Core Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| Next.js 14 App Router | ✅ | Full SSR/SSG support |
| TypeScript | ✅ | Strict mode |
| Tailwind CSS + shadcn/ui | ✅ | Modern UI |
| lowdb Persistence | ✅ | JSON file database |
| MongoDB Support | ✅ | Migration script ready |
| bcrypt Authentication | ✅ | Secure password hashing |
| Role-based Access | ✅ | Staff and Admin roles |
| Zustand State Management | ✅ | Auth store |

### ✅ Frontend

| Feature | Status | Notes |
|---------|--------|-------|
| Staff Dashboard | ✅ | Full CRUD, notifications |
| Admin Dashboard | ✅ | Facility-wide view |
| Incident Detail Pages | ✅ | 4 tabs, full functionality |
| Standard Voice Form | ✅ | 5-step guided input |
| Conversational Reporting | ✅ | Chat-based |
| AI Companion | ✅ | Full voice conversation |
| Intelligence Q&A | ✅ | RAG-powered chat |
| Report Card Display | ✅ | Score, strengths, gaps |
| Mobile Responsiveness | ✅ | All pages |

### ✅ Backend/API

| Feature | Status | Notes |
|---------|--------|-------|
| Incidents CRUD | ✅ | All operations |
| Questions/Answers | ✅ | Create, assign, answer |
| Staff Notifications | ✅ | Real-time polling |
| AI Report Generation | ✅ | 4-section reports |
| Human Report Storage | ✅ | Staff annotations |
| Intelligence Q&A API | ✅ | RAG endpoint |
| Agent Endpoints | ✅ | Report, Investigate |

### ✅ AI/Agentic System

| Feature | Status | Notes |
|---------|--------|-------|
| OpenAI Integration | ✅ | gpt-4o-mini default |
| Embeddings | ✅ | text-embedding-3-small |
| Report Agent | ✅ | Narrative enhancement |
| Investigation Agent | ✅ | Classification + questions |
| Expert Investigator | ✅ | Scoring + gap analysis |
| Gold Standards | ✅ | Fall subtypes defined |
| RAG Q&A | ✅ | Semantic search |
| Incident Analyzer | ✅ | Summary generation |

### ✅ Speech Features

| Feature | Status | Notes |
|---------|--------|-------|
| Web Speech API (STT) | ✅ | Chrome/Edge |
| Speech Synthesis (TTS) | ✅ | Voice prompts |
| Voice Answer Mode | ✅ | Q&A section |
| Companion Conversation | ✅ | Full hands-free |

---

## Known Issues

### 🔴 Critical

| Issue | Impact | Workaround |
|-------|--------|------------|
| None identified | - | - |

### 🟡 Medium

| Issue | Impact | Workaround |
|-------|--------|------------|
| Embedding cache is in-memory | Lost on restart | Regenerates automatically |
| No rate limiting | Could hit API limits | Manual monitoring |
| lowdb file locking | Concurrent access issues | Single instance only |

### 🟢 Low

| Issue | Impact | Workaround |
|-------|--------|------------|
| Voice recognition Chrome-only | Limited browser support | Use Chrome/Edge |
| Mobile keyboard overlap | Input obscured on some devices | Scroll manually |
| TTS voice varies by OS | Inconsistent voice | User toggleable |

### 📝 Technical Debt

| Item | Priority | Notes |
|------|----------|-------|
| Consolidate agent files | Medium | Some duplication |
| Add comprehensive error boundaries | Medium | Partial coverage |
| Unit test coverage | Low | Manual testing only |
| API documentation (OpenAPI) | Low | Manual docs exist |

---

## Planned Features

### Phase 2: Production Hardening

**Target**: Q1 2025

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| MongoDB Migration | High | Medium | Production database |
| Rate Limiting | High | Low | OpenAI protection |
| Error Logging Service | High | Medium | Sentry or similar |
| Session Management | High | Medium | JWT or sessions |
| Audit Logging | Medium | Medium | Compliance requirement |
| Backup/Restore | Medium | Medium | Data protection |

### Phase 3: Advanced AI

**Target**: Q2 2025

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Pattern Analysis | High | High | Cross-incident insights |
| Risk Prediction | High | High | ML-based scoring |
| Voice Conversation Agent | Medium | High | Replace script-based |
| Multi-Agent Collaboration | Medium | High | Complex workflows |
| Custom Question Templates | Medium | Medium | Per-facility config |
| Trend Dashboard | Medium | Medium | Analytics view |

### Phase 4: Enterprise Features

**Target**: Q3 2025

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Multi-Facility Support | High | High | Tenant isolation |
| SSO Integration | High | Medium | SAML/OAuth |
| Role Permissions Matrix | High | Medium | Fine-grained access |
| API for EHR Integration | Medium | High | HL7/FHIR |
| Mobile App (React Native) | Medium | High | Native experience |
| Offline Support | Medium | High | PWA capabilities |

### Phase 5: Compliance & Reporting

**Target**: Q4 2025

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| CMS Compliance Reports | High | Medium | Regulatory export |
| Custom Report Builder | Medium | High | User-defined |
| Bulk Export | Medium | Low | CSV/PDF |
| Scheduled Reports | Medium | Medium | Email delivery |
| Incident Comparison | Low | Medium | Side-by-side view |

---

## Technical Debt

### Immediate Priorities

1. **Database Migration**
   - Move from lowdb to MongoDB
   - Migration script exists: `backend/scripts/migrate-lowdb-to-mongo.ts`
   - Needed for: production scalability, concurrent access

2. **Error Handling**
   - Add error boundaries to all pages
   - Implement structured error logging
   - User-friendly error messages

3. **Type Safety**
   - Strict null checks on all API responses
   - Validate all external data with Zod

### Code Quality

| Area | Current | Target |
|------|---------|--------|
| Test Coverage | ~5% | 60% |
| TypeScript Strict | Partial | Full |
| ESLint Rules | Warning | Error |
| API Documentation | Manual | OpenAPI |

### Refactoring Candidates

```
lib/agents/
├── report_agent.ts           # Consider splitting by node
├── investigation_agent.ts    # Good structure
└── expert_investigator/
    ├── analyze.ts            # Could merge with finalize
    ├── fill_gaps.ts          # Keep separate
    ├── finalize.ts           # Could merge with analyze
    ├── gap_questions.ts      # Keep separate
    ├── graph.ts              # Good - orchestration only
    ├── session_store.ts      # Good - stateful
    └── state_sync.ts         # Could inline
```

---

## Future Vision

### 2025 Goals

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WAIK 2025 VISION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    INTELLIGENT PREVENTION                           │   │
│   │                                                                     │   │
│   │  "From reactive incident documentation to proactive risk           │   │
│   │   prevention through AI-powered pattern recognition"               │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   Key Capabilities:                                                         │
│                                                                             │
│   1. 🔮 PREDICTIVE ANALYTICS                                                │
│      - Identify at-risk residents before incidents                          │
│      - Suggest preventive interventions                                     │
│      - Facility-wide risk scoring                                           │
│                                                                             │
│   2. 🧠 LEARNING SYSTEM                                                     │
│      - Improve question quality from feedback                               │
│      - Adapt to facility-specific patterns                                  │
│      - Continuous Gold Standard refinement                                  │
│                                                                             │
│   3. 🔗 INTEGRATED ECOSYSTEM                                                │
│      - EHR bidirectional sync                                               │
│      - Family portal for updates                                            │
│      - Regulatory auto-reporting                                            │
│                                                                             │
│   4. 📱 UBIQUITOUS ACCESS                                                   │
│      - Native mobile apps                                                   │
│      - Wearable device integration                                          │
│      - Offline-first architecture                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Long-term Roadmap

| Year | Focus | Key Deliverables |
|------|-------|------------------|
| **2024** | V1 MVP | ✅ Complete |
| **2025 Q1** | Production | MongoDB, Auth, Logging |
| **2025 Q2** | AI Expansion | Patterns, Predictions |
| **2025 Q3** | Enterprise | Multi-tenant, SSO |
| **2025 Q4** | Compliance | Reports, Exports |
| **2026** | Integration | EHR, Mobile, Wearables |

---

## Priority Matrix

### High Impact + Low Effort (Do First)

| Feature | Impact | Effort |
|---------|--------|--------|
| Rate limiting | 🔴 Critical | 🟢 Low |
| Error logging | 🔴 Critical | 🟢 Low |
| Notification email | 🟡 Medium | 🟢 Low |
| Bulk question assign | 🟡 Medium | 🟢 Low |

### High Impact + High Effort (Plan)

| Feature | Impact | Effort |
|---------|--------|--------|
| MongoDB migration | 🔴 Critical | 🟡 Medium |
| Pattern analysis | 🔴 Critical | 🔴 High |
| Multi-facility | 🔴 Critical | 🔴 High |
| Mobile app | 🟡 Medium | 🔴 High |

### Low Impact + Low Effort (Fill)

| Feature | Impact | Effort |
|---------|--------|--------|
| UI polish | 🟢 Low | 🟢 Low |
| Loading skeletons | 🟢 Low | 🟢 Low |
| Keyboard shortcuts | 🟢 Low | 🟢 Low |

### Low Impact + High Effort (Avoid)

| Feature | Impact | Effort |
|---------|--------|--------|
| Custom themes | 🟢 Low | 🟡 Medium |
| Gamification | 🟢 Low | 🟡 Medium |

---

## Success Metrics

### Current Baseline

| Metric | Current | Target (6mo) |
|--------|---------|--------------|
| Incidents/day | N/A (demo) | 50+ |
| Report completion rate | ~100% (demo) | 95%+ |
| Avg completion time | ~5 min | <3 min |
| AI accuracy (user feedback) | N/A | 85%+ |
| Question relevance | N/A | 90%+ |

### Key Performance Indicators

1. **Time to Complete Report**
   - Baseline: 5+ minutes
   - Target: <3 minutes with AI Companion

2. **Documentation Completeness**
   - Baseline: Varies widely
   - Target: 90%+ Gold Standard compliance

3. **User Adoption**
   - Target: 80%+ staff using voice features
   - Target: 50%+ using AI Companion

4. **Compliance Readiness**
   - Target: Zero regulatory gaps on audits

---

## Contributing

### How to Propose Features

1. Check existing roadmap items
2. Create issue with feature template
3. Discuss in team meeting
4. Add to appropriate phase

### Development Process

1. Create feature branch from `main`
2. Implement with tests
3. PR with documentation updates
4. Review and merge

---

## Related Documentation

- [01-SYSTEM-OVERVIEW.md](./01-SYSTEM-OVERVIEW.md) - Current architecture
- [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) - Data model
- [04-AGENTIC-ARCHITECTURE.md](./04-AGENTIC-ARCHITECTURE.md) - Agent system
- [14-APPENDIX.md](./14-APPENDIX.md) - Setup and reference

---

*This roadmap is a living document. Updated monthly to reflect priorities and progress.*

