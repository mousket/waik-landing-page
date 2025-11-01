# AI Integration Guide - WAiK Intelligence System

## 🎯 **Overview**

The WAiK system now includes AI-powered intelligence features using OpenAI and LangChain.js:

1. **AI Report Generation** - Automatic summaries, insights, recommendations, and actions
2. **Human Report System** - Staff-created reports with admin editing
3. **Incident Intelligence** - RAG-based Q&A about incidents
4. **Vector Embeddings** - Semantic search through incident Q&A

---

## 🏗️ **Architecture**

\`\`\`
┌─────────────────┐
│   User Query    │
└────────┬────────┘
         │
    ┌────▼────┐
    │   API   │
    └────┬────┘
         │
    ┌────▼─────────────────┐
    │  LangChain Agents    │
    │  ├─ Incident Analyzer│
    │  └─ Intelligence Q&A │
    └────┬─────────────────┘
         │
    ┌────▼──────┐    ┌──────────┐
    │  OpenAI   │────│ Embeddings│
    │  GPT-4    │    │   Cache   │
    └───────────┘    └──────────┘
         │
    ┌────▼────┐
    │  lowdb  │
    │ (Reports│
    │  Saved) │
    └─────────┘
\`\`\`

---

## 📁 **File Structure**

\`\`\`
lib/
├── openai.ts                    ← OpenAI client & utilities
├── embeddings.ts                ← Vector embeddings cache
├── agents/
│   ├── incident-analyzer.ts    ← AI report generator
│   └── intelligence-qa.ts      ← RAG Q&A system
└── types.ts                     ← Updated with report types

app/api/incidents/[id]/
├── ai-report/
│   └── route.ts                 ← Generate AI reports
├── human-report/
│   └── route.ts                 ← CRUD for human reports
└── intelligence/
    └── route.ts                 ← Ask questions (RAG)

data/
├── db.json                      ← Main database
└── embeddings.json              ← Vector cache (generated)
\`\`\`

---

## 🤖 **AI Features**

### **1. AI Report Generation**

**Endpoint**: `POST /api/incidents/:id/ai-report`

**What it does:**
- Analyzes all incident data and Q&A
- Generates 4 sections:
  - **Summary**: Concise overview (2-3 sentences)
  - **Insights**: Answer 4 critical questions
  - **Recommendations**: 3-5 actionable improvements
  - **Actions**: Specific action items with assignments

**Example:**
\`\`\`typescript
// Call from frontend
const response = await fetch(`/api/incidents/inc-1/ai-report`, {
  method: "POST"
})
const { aiReport } = await response.json()
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "aiReport": {
    "summary": "...",
    "insights": "...",
    "recommendations": "...",
    "actions": "...",
    "generatedAt": "2024-01-20T15:00:00Z",
    "model": "gpt-4-turbo-preview",
    "confidence": 0.95
  }
}
\`\`\`

---

### **2. Human Report System**

**Endpoints:**
- `PUT /api/incidents/:id/human-report` - Create/update
- `GET /api/incidents/:id/human-report` - Retrieve
- `DELETE /api/incidents/:id/human-report` - Delete

**What it does:**
- Staff creates initial report (4 sections)
- Admin can edit and update
- Tracks creation and edit history

**Example:**
\`\`\`typescript
// Save human report
await fetch(`/api/incidents/inc-1/human-report`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    summary: "Staff-written summary...",
    insights: "What I observed...",
    recommendations: "What we should do...",
    actions: "Steps I'm taking...",
    userId: "user-1"
  })
})
\`\`\`

---

### **3. Incident Intelligence (RAG)**

**Endpoint**: `POST /api/incidents/:id/intelligence`

**What it does:**
- Users ask questions about the incident
- AI uses RAG to find relevant Q&A
- Generates contextual answers

**Example:**
\`\`\`typescript
// Ask a question
const response = await fetch(`/api/incidents/inc-1/intelligence`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: "Was the resident injured in the fall?"
  })
})

const { answer } = await response.json()
// answer: "Yes, the resident sustained minor bruising..."
\`\`\`

---

## 🧠 **How the AI Works**

### **Incident Analyzer Agent**

Uses **LangChain.js** with OpenAI GPT-4:

\`\`\`typescript
class IncidentAnalyzerAgent {
  async generateReport(incident) {
    // Parallel generation for speed
    const [summary, insights, recommendations, actions] = await Promise.all([
      this.generateSummary(context),
      this.generateInsights(context),
      this.generateRecommendations(context),
      this.generateActions(context),
    ])
    
    return { summary, insights, recommendations, actions, ... }
  }
}
\`\`\`

**Prompts are designed for:**
- Healthcare compliance focus
- CMS guideline awareness
- Actionable outputs
- Professional medical documentation

---

### **Intelligence Q&A Agent (RAG)**

Uses **Retrieval-Augmented Generation**:

\`\`\`typescript
class IntelligenceQAAgent {
  async answerQuestion(incident, question) {
    // 1. Find relevant Q&A using embeddings
    const relevantQA = await searchSimilarQuestions(incident, question, 3)
    
    // 2. Build context with incident + relevant Q&A
    const context = buildContext(incident, relevantQA)
    
    // 3. Generate answer using GPT-4
    const answer = await model.invoke({ context, question })
    
    return answer
  }
}
\`\`\`

**Benefits:**
- Answers based on actual incident data
- Semantic search finds relevant info
- No hallucinations (grounded in context)
- Fast and accurate

---

## 📊 **Vector Embeddings**

### **How It Works:**

**Ad Hoc Generation:**
\`\`\`
User accesses incident
  ↓
Check embeddings cache (data/embeddings.json)
  ↓
Cache miss? → Generate embedding → Cache it
  ↓
Cache hit? → Use cached embedding
\`\`\`

**What Gets Embedded:**
- Full incident (title + description + all Q&A)
- Each individual Q&A pair
- Updated when incident changes

**Cache Structure:**
\`\`\`json
{
  "inc-1": {
    "incidentEmbedding": [0.123, 0.456, ...],
    "questionEmbeddings": {
      "q-1": [0.789, ...],
      "q-2": [0.234, ...]
    },
    "lastUpdated": "2024-01-20T10:00:00Z"
  }
}
\`\`\`

**Cache Invalidation:**
- Automatic: When `incident.updatedAt` > `cache.lastUpdated`
- Manual: Call `clearIncidentCache(incidentId)`

---

## 🔧 **Configuration**

### **Required Environment Variable:**

Add to `.env.local`:
\`\`\`env
OPENAI_API_KEY=sk-your-api-key-here
\`\`\`

**Get your API key:**
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Copy and paste into `.env.local`

### **Model Configuration:**

Models are configured via environment variables in `.env.local`:
\`\`\`env
# LLM for reports & intelligence (default: gpt-4o-mini)
OPENAI_LLM_MODEL=gpt-4o-mini

# Embedding model for RAG (default: text-embedding-3-small)
OPENAI_TEXT_EMBEDDING_MODEL=text-embedding-3-small
\`\`\`

**Why gpt-4o-mini?**
- ✅ 80% cheaper than gpt-4o ($0.15 vs $2.50 per 1M tokens)
- ✅ Fast responses (1-2 seconds)
- ✅ High quality for healthcare documentation
- ✅ Perfect price/performance ratio

**Model Options:**
- `gpt-4o-mini` ⭐ RECOMMENDED - Fast, cheap, great quality
- `gpt-4o` - Better quality, 17x more expensive
- `gpt-4-turbo` - Excellent quality, 67x more expensive
- `gpt-3.5-turbo` - Cheapest but lower quality

**Current defaults in `lib/openai.ts`:**
\`\`\`typescript
export const AI_CONFIG = {
  model: process.env.OPENAI_LLM_MODEL || "gpt-4o-mini",
  embeddingModel: process.env.OPENAI_TEXT_EMBEDDING_MODEL || "text-embedding-3-small",
  temperature: 0.7,
  maxTokens: 2000,
}
\`\`\`

---

## 🎨 **UI Integration**

### **Admin Incident Details Page:**

**Tabs:**
1. 📄 **Overview** - Incident details, status, priority
2. 💬 **Q&A** - Questions and answers
3. 🎤 **Intelligence** - Ask AI about the incident (RAG)
4. ✨ **AI Summary** - View/Generate AI report
5. 📝 **Human Report** - Create/Edit staff report

### **Staff Incident Details Page:**

**Tabs:**
1. 📄 **Overview** - View incident details
2. 💬 **Q&A** - Answer assigned questions
3. 🎤 **Intelligence** - Ask AI about the incident
4. ✨ **AI Summary** - View AI report (read-only)

---

## 🧪 **Testing**

### **Test 1: Generate AI Report**

\`\`\`
1. Login as admin
2. Go to incident details (inc-6 has sample data)
3. Click "AI Summary" tab
4. Click "Generate AI Report" button
5. Wait ~10-15 seconds
6. See summary, insights, recommendations, actions ✅
\`\`\`

### **Test 2: Create Human Report**

\`\`\`
1. Login as staff
2. Go to any incident
3. Fill in the 4 fields (summary, insights, recommendations, actions)
4. Click "Save Report"
5. Refresh page - report is saved ✅
\`\`\`

### **Test 3: Ask Intelligence Question**

\`\`\`
1. Go to any incident with answered questions
2. Click "Intelligence" tab
3. Type: "Was the resident injured?"
4. Click "Ask"
5. Get AI answer based on incident Q&A ✅
\`\`\`

---

## 💡 **Key Insights on the Implementation**

### **Why Two Report Types?**

**Human Report:**
- ✅ Staff knowledge and observations
- ✅ Compliance documentation
- ✅ Legal record
- ✅ Required for audit trail

**AI Report:**
- ✅ Pattern identification across incidents
- ✅ Consistent analysis framework
- ✅ Time-saving for routine incidents
- ✅ Training tool for new staff

**Both together** provide comprehensive incident documentation!

---

### **Why Ad Hoc Embeddings?**

**Pros:**
- ✅ No bloat in main database
- ✅ Regenerable anytime
- ✅ Only generate when needed
- ✅ Cache speeds up repeat access
- ✅ Can delete cache without losing data

**Cons:**
- ❌ First access is slower (generates embedding)
- ❌ Separate file to manage

**For demo with <100 incidents:** Ad hoc is perfect!

---

## 📈 **Performance**

### **AI Report Generation:**
- **Time**: 10-15 seconds
- **Cost**: ~$0.05 per report (GPT-4)
- **Tokens**: ~800 input + 500 output

### **Intelligence Q&A:**
- **Time**: 2-5 seconds
- **Cost**: ~$0.01 per question
- **Tokens**: ~300 input + 150 output

### **Embedding Generation:**
- **Time**: 1-2 seconds per incident
- **Cost**: ~$0.0001 per incident
- **Cache Hit**: <1ms

---

## 🔒 **Security & Best Practices**

### **API Key Security:**
✅ Never commit `.env.local` to git  
✅ Use environment variables  
✅ Rotate keys regularly  
✅ Monitor usage on OpenAI dashboard  

### **Error Handling:**
✅ Check if OpenAI is configured before use  
✅ Graceful fallbacks if API fails  
✅ User-friendly error messages  
✅ Log errors for debugging  

### **Cost Management:**
✅ Cache embeddings (don't regenerate)  
✅ Generate AI reports on-demand (not automatic)  
✅ Set token limits  
✅ Monitor usage  

---

## 🚀 **Future Enhancements**

### **Short Term:**
- [ ] Add "Regenerate" button for AI reports
- [ ] Show token usage/cost estimates
- [ ] Add confidence scores to answers
- [ ] Batch embedding generation

### **Long Term:**
- [ ] Multi-agent conversation system
- [ ] Custom fine-tuned models
- [ ] Real-time voice-to-AI integration
- [ ] Cross-incident pattern analysis
- [ ] Predictive risk assessment

---

## 📚 **Related Documentation**

- `DATABASE_REFACTOR_NOV1.md` - lowdb implementation
- `DEMO_SYSTEM_GUIDE.md` - Complete system guide
- `PROJECT_SETUP.md` - Setup instructions

---

## ⚡ **Quick Start**

### **1. Get OpenAI API Key:**
\`\`\`
https://platform.openai.com/api-keys
\`\`\`

### **2. Add to .env.local:**
\`\`\`env
# Required
OPENAI_API_KEY=sk-your-key-here

# Optional (these are the defaults)
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_TEXT_EMBEDDING_MODEL=text-embedding-3-small
\`\`\`

### **3. Restart Server:**
\`\`\`bash
pkill -9 node
npm run dev
\`\`\`

### **4. Test:**
\`\`\`
- Login as admin
- Go to incident inc-6
- Try generating AI report
- Try asking intelligence questions
\`\`\`

---

**Last Updated**: November 1, 2025  
**Status**: Ready for testing  
**Next**: UI integration & user testing
