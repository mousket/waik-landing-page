# V0 UI Requirements - AI Intelligence Features

## 🎯 **Overview**

The backend AI system is complete. We need V0 to create the frontend UI components to interact with these AI features.

**Backend APIs Ready:**
- `POST /api/incidents/:id/ai-report` - Generate AI report
- `PUT /api/incidents/:id/human-report` - Save staff report
- `POST /api/incidents/:id/intelligence` - Ask questions about incident
- `GET /api/incidents/:id/human-report` - Get staff report
- `GET /api/incidents/:id/ai-report` - Get AI report

---

## 📝 **Component 1: AI Report Display**

### **Location**
Admin & Staff Incident Details Page → "AI Summary" tab

### **Current State**
Shows placeholder: "AI Summary Coming Soon"

### **What to Build**

**Component Name**: `AIReportDisplay.tsx`

**Props:**
\`\`\`typescript
{
  incidentId: string
  existingReport?: AIReport  // If report already exists
  canGenerate: boolean       // Admin can generate, staff view-only
}
\`\`\`

**Features:**
1. **If no report exists:**
   - Show "Generate AI Report" button
   - On click: `POST /api/incidents/:id/ai-report`
   - Show loading spinner (10-15 seconds)
   - Display generated report

2. **If report exists:**
   - Display in beautiful card layout
   - 4 sections: Summary, Insights, Recommendations, Actions
   - Show metadata: Generated date, model, confidence
   - "Regenerate Report" button (admin only)

3. **Display Format:**
   - **Summary**: Large, highlighted text
   - **Insights**: Bullet points or numbered list
   - **Recommendations**: Numbered list with icons
   - **Actions**: Checklist style with role badges

**Design:**
- Use existing card/badge components
- Gradient backgrounds (primary/accent)
- Icons: Sparkles (summary), Brain (insights), Lightbulb (recommendations), Target (actions)
- Loading: Spinning icon with "Generating AI report..."
- Error handling: User-friendly messages

---

## 📋 **Component 2: Human Report Form**

### **Location**
Staff Incident Details Page → NEW "Staff Report" tab  
Admin Incident Details Page → NEW "Staff Report" tab

### **Current State**
Doesn't exist - need to add new tab

### **What to Build**

**Component Name**: `HumanReportForm.tsx`

**Props:**
\`\`\`typescript
{
  incidentId: string
  existingReport?: HumanReport
  userId: string
  userRole: "staff" | "admin"
}
\`\`\`

**Features:**
1. **Form with 4 text areas:**
   - Summary (required, 3-5 sentences)
   - Insights (required, observations)
   - Recommendations (required, actionable items)
   - Actions (required, specific steps)

2. **Permissions:**
   - Staff: Can create & edit their own reports
   - Admin: Can edit any report

3. **Auto-save:**
   - Save draft every 30 seconds
   - Show "Saving..." indicator
   - Show "Last saved" timestamp

4. **Metadata Display:**
   - "Created by: [Name]"
   - "Last edited by: [Name] on [Date]"

5. **Actions:**
   - "Save Report" button (primary)
   - "Cancel" button (secondary)
   - "Delete Report" button (admin only, destructive)

**API Calls:**
- Save: `PUT /api/incidents/:id/human-report`
- Load: `GET /api/incidents/:id/human-report`
- Delete: `DELETE /api/incidents/:id/human-report`

**Design:**
- Clean form layout
- Clear labels and placeholders
- Validation (required fields)
- Success/error toasts (using sonner)

---

## 💬 **Component 3: Intelligence Chat Interface**

### **Location**
Admin & Staff Incident Details Page → "Intelligence" tab

### **Current State**
Shows placeholder: "Intelligence system coming soon"

### **What to Build**

**Component Name**: `IntelligenceChat.tsx`

**Props:**
\`\`\`typescript
{
  incidentId: string
  incident: Incident  // For context
}
\`\`\`

**Features:**
1. **Chat Interface:**
   - Message history (user questions + AI answers)
   - Input field with placeholder: "Ask a question about this incident..."
   - Send button + Enter key support
   - Voice input button (🎤) using Web Speech API

2. **Message Display:**
   - User messages: Right-aligned, accent color
   - AI messages: Left-aligned, primary color
   - Timestamps
   - Copy answer button

3. **Smart Features:**
   - Suggested questions (based on incident)
   - "Clear conversation" button
   - Loading indicator while AI responds

4. **API Integration:**
   - `POST /api/incidents/:id/intelligence`
   - Request: `{ question: string }`
   - Response: `{ answer: string, timestamp: string }`

**Suggested Questions Examples:**
- "What injuries did the resident sustain?"
- "What preventive measures should be taken?"
- "Was proper protocol followed?"
- "What equipment was involved?"

**Design:**
- Chat bubble style (modern messaging UI)
- Smooth auto-scroll to new messages
- Responsive (mobile-friendly)
- Icons: Mic for voice, Send for submit

---

## 🎤 **Component 4: Enhanced Voice Incident Reporter** (OPTIONAL)

### **Location**
Staff → "Create New Incident" (replaces current basic version)

### **Current State**
Basic hardcoded 8-question script (works but not intelligent)

### **What to Enhance**

**Component Name**: `AIVoiceReporter.tsx`

**Instead of hardcoded questions:**
- AI agent asks dynamic questions
- Follows up based on answers
- Asks clarifying questions
- Adapts to incident type

**This requires backend work from us first!**

**Status**: ⏸️ Phase 2 (after UI is done)

---

## 📱 **Component 5: Tab Updates**

### **Admin Incident Details Page**

**Current tabs:**
1. Overview
2. Q&A
3. Intelligence (placeholder)
4. AI Summary (placeholder)
5. WAiK Agent (placeholder)

**Update to:**
1. Overview (keep as is)
2. Q&A (keep as is)
3. Intelligence → **Replace with IntelligenceChat component**
4. AI Report → **Replace with AIReportDisplay component**
5. Staff Report → **NEW - Add HumanReportForm component**

---

### **Staff Incident Details Page**

**Current tabs:**
1. Overview
2. Q&A  
3. Intelligence (placeholder)
4. AI Summary (placeholder)

**Update to:**
1. Overview (keep as is)
2. Q&A (keep as is)
3. Intelligence → **Replace with IntelligenceChat component**
4. AI Summary → **Replace with AIReportDisplay (read-only)**
5. My Report → **NEW - Add HumanReportForm (staff creates)**

---

## 🎨 **Design Guidelines for V0**

### **Visual Style:**
- Use existing gradient theme (primary/accent)
- Match current card/badge components
- Consistent with landing page aesthetic
- Professional healthcare vibe

### **Components to Reuse:**
- `Card`, `CardHeader`, `CardContent` (already exists)
- `Badge` (for roles, status)
- `Button` (primary/secondary/destructive)
- `Textarea` (for report forms)
- `Tabs`, `TabsList`, `TabsTrigger` (already in use)

### **Icons (lucide-react):**
- Sparkles - AI features
- Brain - Intelligence/insights
- Lightbulb - Recommendations
- Target - Actions
- FileText - Reports
- MessageSquare - Q&A
- Mic - Voice features

---

## 🔄 **Integration Flow**

### **How V0's Components Will Connect:**

\`\`\`
User clicks "Generate AI Report"
        ↓
<AIReportDisplay />
        ↓
POST /api/incidents/:id/ai-report (our backend)
        ↓
AI Agent generates report (our code)
        ↓
Returns report data
        ↓
Component displays 4 sections ✅
\`\`\`

---

## 📦 **V0 Prompt Summary**

**"Create 3 main components for our AI intelligence system:**

**1. AIReportDisplay** - Shows AI-generated incident reports with 4 sections (summary, insights, recommendations, actions). Includes "Generate Report" button that calls `POST /api/incidents/:id/ai-report`. Should handle loading state and display metadata.

**2. HumanReportForm** - Editable form with 4 text areas for staff to create reports. Auto-saves drafts. Calls `PUT /api/incidents/:id/human-report`. Shows creation/edit history. Admin can edit any report, staff only their own.

**3. IntelligenceChat** - Chat interface where users ask questions about incidents. Calls `POST /api/incidents/:id/intelligence`. Shows conversation history. Supports voice input via Web Speech API.

**Use our existing design system (shadcn/ui components, gradients with primary/accent colors, lucide-react icons). Make it beautiful and professional for healthcare.**"

---

## 🎯 **After V0 Creates the UI**

### **What We Build Together Next:**

#### **Phase 2A: Voice Interaction Agent** (Your original Phase 4)
- Replace hardcoded question script
- Build conversational AI agent
- Dynamic question generation
- Intelligent follow-ups
- Real agentic system

#### **Phase 2B: Advanced Analytics**
- Cross-incident pattern detection
- Predictive risk assessment
- Facility-wide insights
- Trend analysis

#### **Phase 2C: Production Readiness**
- Cost monitoring
- Usage analytics
- Rate limiting
- Error recovery
- Audit logging

---

## 📊 **Phases Overview**

### **✅ Phase 1: Foundation (COMPLETE)**
- Database (lowdb)
- Authentication (bcrypt)
- Basic CRUD
- Sample data

### **✅ Phase 1.5: AI Intelligence (COMPLETE - We Just Did This!)**
- AI agents built
- RAG implemented
- APIs created
- Backend ready

### **🎨 Phase 2A: UI Integration (V0's Work - NEXT)**
- AI Report Display
- Human Report Form
- Intelligence Chat
- Tab updates

### **🤖 Phase 2B: Advanced AI (After UI - We Build Together)**
- Conversational voice agent
- Multi-agent collaboration
- Pattern analysis
- Predictive insights

### **🚀 Phase 3: Production Polish (Final)**
- Performance optimization
- Cost monitoring
- Security hardening
- Deployment

---

## ✅ **Summary**

### **What We Have:**
✅ Complete AI backend  
✅ All API endpoints  
✅ Agents ready to use  
✅ Database persistent  

### **What V0 Needs to Build:**
🎨 AI Report Display UI  
🎨 Human Report Form UI  
🎨 Intelligence Chat UI  
🎨 Tab integrations  

### **What We Build After UI:**
🤖 Conversational voice agent  
🤖 Advanced analytics  
🤖 Production features  

### **Timeline:**
- **V0 UI work**: 1-2 days
- **Our advanced AI**: 2-3 days
- **Polish & deploy**: 1 day

---

**Next Steps:**
1. ✅ Add OpenAI key to `.env.local`
2. ✅ Test backend APIs work
3. → Send requirements to V0 (use V0_UI_REQUIREMENTS.md)
4. → V0 builds UI components
5. → We build advanced AI features

**Ready to send to V0?** The backend is solid! 🚀
