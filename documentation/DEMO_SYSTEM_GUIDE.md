# WAiK Demo System - Complete Guide

This guide explains the complete demo system built into the WAiK landing page project.

---

## 🎯 **Overview**

The demo system simulates a full incident reporting and management platform with:
- **Staff dashboard** - for nurses/staff to report and manage incidents
- **Admin dashboard** - for administrators to oversee all incidents
- **Voice-first incident reporting** - using Web Speech API
- **In-memory database** - with sample data
- **Authentication system** - with predefined users

---

## 🚪 **Access Points**

### **Demo Login Page**
\`\`\`
http://localhost:3000/waik-demo-start/login
\`\`\`

### **Test Credentials**

| Role | Username | Password |
|------|----------|----------|
| **Staff** | `waik-demo-staff` | `waik1+demo-staff!@#` |
| **Admin** | `waik-demo-admin` | `waik1+demo-admin!@#` |

---

## 📊 **Database Structure**

### **Location**
`lib/db.ts` - In-memory database with helper functions

### **Data Models**

#### **Users**
\`\`\`typescript
{
  id: string
  username: string
  password: string
  role: "staff" | "admin"
  name: string
  email: string
  createdAt: string
}
\`\`\`

#### **Incidents**
\`\`\`typescript
{
  id: string
  title: string
  description: string
  status: "open" | "in-progress" | "pending-review" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  staffId: string
  staffName: string
  residentName: string
  residentRoom: string
  createdAt: string
  updatedAt: string
  questions: Question[]
  summary?: string | null
}
\`\`\`

#### **Questions**
\`\`\`typescript
{
  id: string
  incidentId: string
  questionText: string
  askedBy: string
  askedAt: string
  answer?: Answer
}
\`\`\`

#### **Answers**
\`\`\`typescript
{
  id: string
  questionId: string
  answerText: string
  answeredBy: string
  answeredAt: string
  method: "text" | "voice"
}
\`\`\`

### **Sample Data**

The database comes pre-loaded with **8 sample incidents across 3 staff members**:

#### **Sarah Johnson (user-1) - 3 Incidents**

1. **Resident Fall in Room 204** (High Priority, Open)
   - Resident: Margaret Thompson, Room 204
   - Has 2 answered questions

2. **Medication Administration Delay** (Medium Priority, Open)
   - Resident: Robert Williams, Room 312
   - No questions yet

3. **Dietary Restriction Not Followed** (Low Priority, Open)
   - Resident: Elizabeth Davis, Room 108
   - Has 1 unanswered question

#### **James Martinez (user-3) - 3 Incidents**

4. **Wandering Resident - Exit Attempt** (High Priority, In-Progress)
   - Resident: Harold Bennett, Room 156
   - Has 1 answered question

5. **Aggressive Behavior Towards Staff** (Medium Priority, Pending Review)
   - Resident: Patricia Moore, Room 223
   - Has 1 unanswered question

8. **Equipment Malfunction - Wheelchair** (Urgent Priority, Open)
   - Resident: Alice Thompson, Room 189
   - Has 2 unanswered questions

#### **Emily Davis (user-4) - 2 Incidents**

6. **Skin Tear - Left Forearm** (Low Priority, Closed)
   - Resident: Dorothy Wilson, Room 145
   - Has 1 answered question
   - Includes AI summary

7. **Missed Breakfast Meal** (Medium Priority, Open)
   - Resident: George Anderson, Room 302
   - No questions yet

**This structure demonstrates:**
- ✅ Staff users see only THEIR assigned incidents (role-based access)
- ✅ Admin users see ALL incidents from ALL staff (full oversight)
- ✅ Variety in priority levels (Low, Medium, High, Urgent)
- ✅ Variety in statuses (Open, In-Progress, Pending Review, Closed)
- ✅ Different Q&A states (answered, unanswered, none)

---

## 🔌 **API Endpoints**

All APIs are located in `app/api/`

### **Authentication**
\`\`\`
POST /api/auth/login
Body: { username: string, password: string }
Response: { success: boolean, user: User | null, message: string }
\`\`\`

### **Incidents**
\`\`\`
GET /api/incidents
Response: Incident[]
\`\`\`

\`\`\`
GET /api/incidents/:id
Response: Incident
\`\`\`

\`\`\`
PATCH /api/incidents/:id
Body: Partial<Incident>
Response: Incident
\`\`\`

### **Staff-Specific**
\`\`\`
GET /api/staff/incidents?staffId={userId}
Response: { incidents: Incident[] }
\`\`\`

### **Questions & Answers**
\`\`\`
GET /api/incidents/:id/questions
Response: Question[]
\`\`\`

\`\`\`
POST /api/incidents/:id/answers
Body: { questionId: string, answerText: string, answeredBy: string, method: "text" | "voice" }
Response: { success: boolean, answer: Answer }
\`\`\`

---

## 🎭 **User Journeys**

### **Staff Journey**

1. **Login** → `/waik-demo-start/login`
   - Use staff credentials
   - Redirects to `/staff/dashboard`

2. **View Dashboard** → `/staff/dashboard`
   - See assigned incidents
   - View stats (open incidents, pending questions, completed today)
   - Click incident to view details

3. **View Incident Details** → `/staff/incidents/:id`
   - See all incident information
   - Answer pending questions (text or voice)
   - Update incident status

4. **Create New Incident** → `/staff/report`
   - Voice-first interactive reporting
   - 8-question conversation flow
   - Automatic save to database

### **Admin Journey**

1. **Login** → `/waik-demo-start/login`
   - Use admin credentials
   - Redirects to `/admin/dashboard`

2. **View Admin Dashboard** → `/admin/dashboard`
   - See ALL incidents across facility
   - Filter by status, priority
   - Search by resident name, room, or incident type
   - Sort by date, priority, or resident

3. **View Incident Details** → `/admin/incidents/:id`
   - See complete incident information
   - View all Q&A exchanges
   - Update status and priority
   - Add new questions for staff
   - View AI-generated summaries (when implemented)

4. **Manage Questions**
   - Ask new questions to staff
   - Review staff responses
   - Mark incidents as complete

---

## 🎤 **Voice Incident Reporting**

### **How It Works**

The voice reporting system (`app/staff/report/page.tsx`) uses:
- **Web Speech API** (browser built-in)
- **Speech Recognition** - converts voice to text
- **Speech Synthesis** - speaks questions to user

### **Conversation Flow**

\`\`\`
Question 0: Readiness check
  ↓
Question 1: Resident info (name, age, gender, room)
  ↓
Question 2: What happened? (full details)
  ↓
Question 3: Resident's state (appearance, feelings, behavior)
  ↓
Question 4: What you did to help
  ↓
Question 5: Resident's condition after incident
  ↓
Question 6: Why did this happen? (your assessment)
  ↓
Question 7: Prevention recommendations
  ↓
Completion: Auto-redirect to dashboard
\`\`\`

### **Features**
- ✅ Pause/resume functionality
- ✅ Repeat question capability
- ✅ Exit and save progress
- ✅ Visual feedback (listening/speaking indicators)
- ✅ Real-time transcript display
- ✅ Browser compatibility check

### **Recent Fixes (Oct 31, 2025)**

**Issue**: Report would stop progressing after question 2

**Root Cause**: Timing issues with speech recognition state management
- Speech recognition wasn't properly stopping before starting again
- State updates weren't synchronized with speech events
- No delays between speech synthesis ending and recognition starting

**Solution Applied**:
1. Added 300ms delay after speaking before starting to listen
2. Added explicit stop of recognition when speaking starts
3. Added comprehensive error handling for "already started" errors
4. Added extensive console logging for debugging
5. Added 200ms delay before executing callbacks after acknowledgments

---

## 🗄️ **Database Operations**

### **Available Functions** (`lib/db.ts`)

\`\`\`typescript
// Get entire database
getDb(): Database

// Users
getUsers(): User[]
getUserByCredentials(username, password): User | null

// Incidents
getIncidents(): Incident[]
getIncidentById(id): Incident | null
getIncidentsByStaffId(staffId): Incident[]
updateIncident(id, updates): Incident | null
addIncident(incident): Incident

// Questions & Answers
addQuestionToIncident(incidentId, question): boolean
answerQuestion(incidentId, questionId, answer): boolean
\`\`\`

### **Data Persistence**

**Important**: The current database is **in-memory only**
- Data persists **only while the server is running**
- Restarting the server resets all data to defaults
- Perfect for demos and testing
- Not suitable for production

**Future Enhancement**: Replace with lowdb for file-based persistence

---

## 🛠️ **Tech Stack**

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **State Management** | Zustand (with persist middleware) |
| **UI Components** | shadcn/ui, Radix UI, Tailwind CSS |
| **Voice** | Web Speech API (Recognition + Synthesis) |
| **Database** | In-memory (TypeScript objects) |
| **Authentication** | Simple credential check (no JWT/session) |
| **Date Handling** | date-fns |

---

## 🔍 **Troubleshooting**

### **Issue: "Not authenticated" on dashboard**

**Solution**: 
1. Go to `/waik-demo-start/login`
2. Login with valid credentials
3. Auth state is stored in localStorage via Zustand persist

### **Issue: No incidents showing up**

**Check**:
1. Open browser console
2. Look for API errors in Network tab
3. Verify API returns 200 status with data
4. Check `/api/staff/incidents?staffId=user-1` directly

**Common Cause**: Server restart cleared the in-memory database

### **Issue: Voice recognition not working**

**Requirements**:
- Use Chrome, Edge, or Safari
- Allow microphone permissions
- HTTPS connection (or localhost)

**Troubleshooting**:
1. Check console for Web Speech API support messages
2. Verify microphone permissions in browser
3. Try refreshing the page
4. Check console logs prefixed with `[v0]`

### **Issue: Voice report stops at question 2**

**Status**: Fixed in latest update (Oct 31, 2025)

**Check**:
1. Open browser console
2. Look for logs like:
   \`\`\`
   [v0] Handling response for question index: 2
   [v0] Moving to next question: 3 out of 8
   [v0] About to speak question: 3
   \`\`\`
3. If you see these logs but still stuck, there may be a browser-specific issue

---

## 🎨 **UI Components**

### **Shared Components** (`components/ui/`)
- `badge.tsx` - Status and priority badges
- `button.tsx` - Interactive buttons
- `card.tsx` - Container cards
- `input.tsx` - Form inputs
- `label.tsx` - Form labels
- `select.tsx` - Dropdown selectors
- `tabs.tsx` - Tabbed interfaces

### **Layout Components** (`app/*/layout.tsx`)
- Staff layout with staff-specific navigation
- Admin layout with admin-specific navigation
- Both include logout functionality

---

## 📱 **Responsive Design**

All dashboards and pages are fully responsive:
- **Mobile** (< 640px) - Stacked layouts, simplified navigation
- **Tablet** (640px - 1024px) - 2-column grids
- **Desktop** (> 1024px) - Full 3-4 column layouts

---

## 🚀 **Testing the Demo**

### **Quick Test Flow**

1. **Start the server**
   \`\`\`bash
   npm run dev
   \`\`\`

2. **Test Staff Flow**
   - Go to `http://localhost:3000/waik-demo-start/login`
   - Login as staff (`waik-demo-staff` / `waik1+demo-staff!@#`)
   - View dashboard with 3 incidents
   - Click on "Resident Fall in Room 204"
   - See 2 answered questions
   - Click "Create New Incident"
   - Test voice reporting (say "I am ready")

3. **Test Admin Flow**
   - Logout and login as admin (`waik-demo-admin` / `waik1+demo-admin!@#`)
   - View all 3 incidents
   - Use filters (status, priority)
   - Search for "Margaret"
   - Click on any incident
   - View full details with Q&A

### **Expected Results**

✅ APIs return 200 OK  
✅ Dashboard shows 3 sample incidents  
✅ Incident details load properly  
✅ Voice reporting asks all 8 questions  
✅ Auth persists across page refreshes  
✅ Filters and search work correctly  

---

## 🔮 **Future Enhancements**

Based on your original plan (see `Untitled-2`):

### **Phase 1: Enhanced Auth** ✅ (Complete)
- ✅ Login page
- ✅ Role-based routing
- ✅ Sample data

### **Phase 2: Admin Dashboard** ✅ (Complete)
- ✅ View all incidents
- ✅ Incident details page
- ✅ Status/priority management
- ⏳ AI summaries (pending LangGraph integration)
- ⏳ AI insights (pending LangGraph integration)
- ⏳ AI recommendations (pending LangGraph integration)

### **Phase 3: Staff Dashboard** ✅ (Complete)
- ✅ View assigned incidents
- ✅ Answer questions
- ✅ Save progress
- ⏳ Notifications system

### **Phase 4: Incident Reporting** ✅ (Complete)
- ✅ Voice-first interface
- ✅ 8-question flow
- ✅ Speech to text
- ✅ Text to speech
- ⏳ LangGraph agentic system integration

### **Phase 5: AI Integration** ⏳ (Planned)
- LangGraph multi-agent system
- OpenAI GPT-4 for summaries
- Embeddings for RAG
- Insight generation
- Recommendation engine

### **Phase 6: Persistence** ⏳ (Planned)
- Replace in-memory DB with lowdb
- File-based storage
- Data persistence across restarts

---

## 📞 **Support**

### **Console Logging**

All major operations log to console with `[v0]` prefix:
- Voice recognition events
- Speech synthesis events
- API calls
- State changes
- Errors

### **Debugging Tips**

1. **Always check console first**
2. **Monitor Network tab** for API calls
3. **Check Application tab** for localStorage (auth state)
4. **Use React DevTools** to inspect component state

---

## 🎓 **Learning Resources**

- **Next.js App Router**: https://nextjs.org/docs
- **Web Speech API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- **Zustand**: https://zustand-demo.pmnd.rs/
- **shadcn/ui**: https://ui.shadcn.com/

---

**Last Updated**: October 31, 2025  
**Version**: 1.0  
**Status**: Demo System Fully Functional ✅
