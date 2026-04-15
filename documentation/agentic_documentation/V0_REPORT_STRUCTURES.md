# 📊 Human Report & AI Report Structures for V0

**Date**: November 2, 2025  
**For**: Vercel V0 UI Implementation  
**Status**: Complete with Real Examples  

---

## 📋 **TypeScript Interfaces**

### **HumanReport Interface:**

```typescript
interface HumanReport {
  summary: string              // Brief incident summary
  insights: string             // What we learned
  recommendations: string      // What we recommend
  actions: string              // Specific action items
  createdBy: string            // User ID who created
  createdAt: string            // ISO timestamp
  lastEditedBy?: string        // User ID who last edited (optional)
  lastEditedAt?: string        // ISO timestamp (optional)
}
```

### **AIReport Interface:**

```typescript
interface AIReport {
  summary: string              // AI-generated summary
  insights: string             // AI analysis
  recommendations: string      // AI recommendations
  actions: string              // AI-suggested actions
  generatedAt: string          // ISO timestamp
  model: string                // "gpt-4o-mini"
  confidence: number           // 0.0 to 1.0
  promptTokens?: number        // Optional usage stats
  completionTokens?: number    // Optional usage stats
}
```

---

## 📝 **Real Example: Human Report**

**From incident inc-6 (Skin Tear):**

```json
{
  "summary": "During morning care, discovered a small skin tear on Dorothy Wilson's left forearm. Wound was cleaned per protocol, antibiotic ointment applied, and covered with non-adherent dressing. Daughter was notified immediately and expressed gratitude for prompt care.",
  
  "insights": "Skin tear likely occurred during sleep due to fragile skin. No signs of trauma or external cause. Resident takes blood thinners which increases skin fragility.",
  
  "recommendations": "Continue monitoring skin integrity during all care activities. Consider long-sleeve protection garments at night. Review blood thinner dosage with physician if skin tears become frequent.",
  
  "actions": "Daily dressing changes for 7 days. Photograph healing progress. Family follow-up call scheduled for end of week.",
  
  "createdBy": "user-4",
  "createdAt": "2024-01-20T11:00:00Z",
  "lastEditedBy": "user-2",
  "lastEditedAt": "2024-01-20T14:30:00Z"
}
```

---

## 🤖 **Real Example: AI Report**

**From incident inc-6 (Skin Tear):**

```json
{
  "summary": "Minor skin tear incident on left forearm of 82-year-old resident during morning care routine. Proper wound care protocol followed immediately. Family notification completed with positive response.",
  
  "insights": "1. What happened? Small skin tear discovered during routine morning care\n2. What happened to the resident? Minor injury with proper immediate treatment, no complications\n3. How could we have prevented this? Increased monitoring of skin integrity for residents on anticoagulants, protective garments\n4. What should we do to prevent future incidents? Implement proactive skin protection protocols for high-risk residents",
  
  "recommendations": "1. Implement protective garment protocol for residents with fragile skin\n2. Staff training on gentle handling techniques for residents on blood thinners\n3. Daily skin integrity assessments during care routines\n4. Consider consult with wound care specialist for prevention strategies",
  
  "actions": "1. Nursing Director: Review and update skin care protocols (within 1 week)\n2. CNA Team: Attend skin integrity training session (within 2 weeks)\n3. Charge Nurse: Implement daily skin checks for high-risk residents (immediate)\n4. Facility Manager: Source appropriate protective garments (within 1 week)",
  
  "generatedAt": "2024-01-20T15:00:00Z",
  "model": "gpt-4o-mini",
  "confidence": 0.95,
  "promptTokens": 523,
  "completionTokens": 287
}
```

---

## 🎨 **UI Component Structure for V0**

### **Insights Section (Human Report - Editable)**

```tsx
<Card>
  <CardHeader>
    <CardTitle>📝 Incident Insights (Staff/Admin Report)</CardTitle>
    <CardDescription>
      Human-written analysis and recommendations
      {humanReport?.lastEditedBy && (
        <span className="text-xs">
          Last edited by {getUserName(humanReport.lastEditedBy)} 
          on {formatDate(humanReport.lastEditedAt)}
        </span>
      )}
    </CardDescription>
  </CardHeader>
  <CardContent className="grid gap-6 md:grid-cols-2">
    {/* Card 1: Summary */}
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-base">📋 Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief overview of what happened..."
          rows={4}
        />
      </CardContent>
    </Card>

    {/* Card 2: Insights */}
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader>
        <CardTitle className="text-base">💡 Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={insights}
          onChange={(e) => setInsights(e.target.value)}
          placeholder="What we learned about what happened..."
          rows={4}
        />
      </CardContent>
    </Card>

    {/* Card 3: Recommendations */}
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="text-base">🎯 Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          placeholder="What we recommend doing..."
          rows={4}
        />
      </CardContent>
    </Card>

    {/* Card 4: Actions */}
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="text-base">✅ Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={actions}
          onChange={(e) => setActions(e.target.value)}
          placeholder="Specific action items with owners and timelines..."
          rows={4}
        />
      </CardContent>
    </Card>
  </CardContent>
  <CardFooter>
    <Button onClick={handleSaveHumanReport}>
      Save Insights
    </Button>
  </CardFooter>
</Card>
```

---

### **WAiK Agent Section (AI Report - Read-Only with Generate)**

```tsx
<Card className="border-gradient-to-r from-primary to-accent">
  <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <CardTitle>🤖 WAiK AI Insights</CardTitle>
      </div>
      
      {/* Generate Button - Admin Only, 5+ questions */}
      {role === "admin" && (
        <Button
          onClick={handleGenerateAI}
          disabled={answeredCount < 5 || generating}
          className="bg-gradient-to-r from-primary to-accent"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate WAiK Insights
            </>
          )}
        </Button>
      )}
    </div>
    
    {answeredCount < 5 && (
      <div className="text-xs text-muted-foreground mt-2">
        Need {5 - answeredCount} more answered questions to generate AI insights
        ({answeredCount}/5)
      </div>
    )}
    
    {aiReport && (
      <CardDescription>
        Generated on {formatDate(aiReport.generatedAt)} 
        using {aiReport.model} (Confidence: {(aiReport.confidence * 100).toFixed(0)}%)
      </CardDescription>
    )}
  </CardHeader>
  
  {aiReport ? (
    <CardContent className="grid gap-6 md:grid-cols-2">
      {/* Card 1: AI Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{aiReport.summary}</p>
        </CardContent>
      </Card>

      {/* Card 2: AI Insights */}
      <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{aiReport.insights}</p>
        </CardContent>
      </Card>

      {/* Card 3: AI Recommendations */}
      <Card className="border-green-500/20 bg-gradient-to-br from-green-50 to-green-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{aiReport.recommendations}</p>
        </CardContent>
      </Card>

      {/* Card 4: AI Actions */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            AI-Suggested Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{aiReport.actions}</p>
        </CardContent>
      </Card>
    </CardContent>
  ) : (
    <CardContent className="text-center py-8">
      <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground">No AI insights generated yet</p>
      {answeredCount >= 5 && role === "admin" && (
        <p className="text-sm text-muted-foreground mt-2">
          Click "Generate WAiK Insights" to analyze this incident
        </p>
      )}
    </CardContent>
  )}
</Card>
```

---

## 📊 **Field Content Examples**

### **Summary (2-3 sentences):**
```
"During morning care, discovered a small skin tear on Dorothy Wilson's left forearm. 
Wound was cleaned per protocol, antibiotic ointment applied, and covered with 
non-adherent dressing. Daughter was notified immediately and expressed gratitude 
for prompt care."
```

**Characteristics:**
- Concise overview
- What happened
- Key actions taken
- Outcome

---

### **Insights (Analysis - can be numbered list):**
```
"Skin tear likely occurred during sleep due to fragile skin. No signs of trauma 
or external cause. Resident takes blood thinners which increases skin fragility."
```

**Or (AI format with structure):**
```
"1. What happened? Small skin tear discovered during routine morning care
2. What happened to the resident? Minor injury with proper immediate treatment, no complications
3. How could we have prevented this? Increased monitoring of skin integrity for residents on anticoagulants
4. What should we do to prevent future incidents? Implement proactive skin protection protocols"
```

**Characteristics:**
- Root cause analysis
- Contributing factors
- Prevention insights
- Lessons learned

---

### **Recommendations (Action-oriented):**
```
"Continue monitoring skin integrity during all care activities. Consider long-sleeve 
protection garments at night. Review blood thinner dosage with physician if skin 
tears become frequent."
```

**Or (AI format with numbered list):**
```
"1. Implement protective garment protocol for residents with fragile skin
2. Staff training on gentle handling techniques for residents on blood thinners
3. Daily skin integrity assessments during care routines
4. Consider consult with wound care specialist for prevention strategies"
```

**Characteristics:**
- Specific recommendations
- Can be numbered list
- Actionable items
- Based on incident analysis

---

### **Actions (Specific tasks with owners and deadlines):**
```
"Daily dressing changes for 7 days. Photograph healing progress. Family follow-up 
call scheduled for end of week."
```

**Or (AI format with responsibility and timeline):**
```
"1. Nursing Director: Review and update skin care protocols (within 1 week)
2. CNA Team: Attend skin integrity training session (within 2 weeks)
3. Charge Nurse: Implement daily skin checks for high-risk residents (immediate)
4. Facility Manager: Source appropriate protective garments (within 1 week)"
```

**Characteristics:**
- Specific tasks
- Assigned owners (who)
- Deadlines (when)
- Measurable outcomes

---

## 🎨 **Visual Differences for V0**

### **Human Report (Insights Section):**

**Design:**
- 📝 Editable (Textareas)
- 🎨 Softer colors (blue, purple, green, orange pastels)
- 💾 Save button
- 👤 Shows "Last edited by [name]"
- ✏️ Edit icon or indicator
- 🌐 Mobile-friendly grid

**Colors:**
- Summary: Blue (`border-blue-200 bg-blue-50/50`)
- Insights: Purple (`border-purple-200 bg-purple-50/50`)
- Recommendations: Green (`border-green-200 bg-green-50/50`)
- Actions: Orange (`border-orange-200 bg-orange-50/50`)

---

### **AI Report (WAiK Agent Section):**

**Design:**
- 🤖 Read-only (not editable)
- ✨ AI aesthetic (gradients, sparkles, animations)
- 🎨 Vibrant AI colors (primary/accent gradients)
- ⚡ Generate button (admin only, pulsing effect)
- 📊 Shows confidence score and model
- 🔄 Can regenerate

**Colors:**
- Primary gradient (`bg-gradient-to-r from-primary to-accent`)
- Card backgrounds with subtle gradients
- Sparkle/Brain icons with animations
- Header with animated pulse effect

**Animations:**
- Sparkle icon: `animate-pulse`
- Generate button: Gradient with hover effect
- Loading state: Spinning icon
- Card reveal: Fade-in animation

---

## 📱 **Mobile-Friendly Layout**

### **Desktop (md and up):**
```tsx
<div className="grid gap-6 md:grid-cols-2">
  {/* 2 columns - 2x2 grid */}
  <Card>Summary</Card>
  <Card>Insights</Card>
  <Card>Recommendations</Card>
  <Card>Actions</Card>
</div>
```

### **Mobile:**
```tsx
<div className="grid gap-6">
  {/* 1 column - stacked */}
  <Card>Summary</Card>
  <Card>Insights</Card>
  <Card>Recommendations</Card>
  <Card>Actions</Card>
</div>
```

**Responsive classes:**
- `md:grid-cols-2` - 2 columns on medium screens and up
- `grid-cols-1` - 1 column on mobile (default)
- `gap-6` - Consistent spacing

---

## 🎯 **Mock Data for V0 Testing**

### **Mock HumanReport:**

```typescript
const mockHumanReport: HumanReport = {
  summary: "Resident experienced a fall while attempting to get out of bed unassisted. Staff responded immediately, assessed for injuries, and provided comfort. No serious injuries sustained, minor bruising observed on left hip.",
  
  insights: "Fall occurred during early morning hours when resident attempted to use restroom without calling for assistance. Bed alarm was not activated at the time. Resident has history of attempting independent mobility despite fall risk assessment.",
  
  recommendations: "Reinforce importance of call button usage with resident and family. Ensure bed alarms are consistently activated, especially during night shifts. Consider increased monitoring during high-risk times (early morning, evening).",
  
  actions: "1. Bed alarm compliance check added to shift checklist\n2. Family meeting scheduled for tomorrow to discuss safety measures\n3. Physical therapy evaluation requested to assess mobility and recommend assistive devices\n4. Night staff to perform hourly safety rounds",
  
  createdBy: "user-1",
  createdAt: "2024-01-20T14:00:00Z",
  lastEditedBy: "user-2",
  lastEditedAt: "2024-01-20T16:30:00Z"
}
```

---

### **Mock AIReport:**

```typescript
const mockAIReport: AIReport = {
  summary: "Resident fall incident during early morning hours with minor injury. Immediate staff response, proper assessment completed, and preventive measures being implemented. Family communication scheduled.",
  
  insights: "1. What happened? Resident attempted independent transfer to restroom without assistance, resulting in fall from bed\n2. What happened to the resident? Minor bruising on left hip, no serious injuries, vital signs stable\n3. How could we have prevented this? Bed alarm activation, enhanced night monitoring, assistive device placement\n4. What should we do to prevent future incidents? Strengthen fall prevention protocols, improve bed alarm compliance, increase family education",
  
  recommendations: "1. Implement mandatory bed alarm checks on all shift changes\n2. Provide additional fall prevention education to resident and family\n3. Evaluate need for low bed or floor mats for high-risk residents\n4. Review staffing levels during high-risk periods (night shift, early morning)\n5. Consider motion sensor technology for residents who frequently attempt independent mobility",
  
  actions: "1. Charge Nurse: Add bed alarm verification to shift checklist (immediate)\n2. Social Worker: Schedule family meeting to discuss safety plan (within 24 hours)\n3. Physical Therapy: Complete mobility assessment and recommend devices (within 3 days)\n4. Nursing Director: Review night shift staffing patterns (within 1 week)\n5. Safety Committee: Evaluate technology solutions for fall prevention (within 2 weeks)",
  
  generatedAt: "2024-01-20T16:00:00Z",
  model: "gpt-4o-mini",
  confidence: 0.88,
  promptTokens: 456,
  completionTokens: 312
}
```

---

## 🔑 **Key Differences**

| Feature | Human Report | AI Report |
|---------|-------------|-----------|
| **Editable** | ✅ Yes (Textareas) | ❌ No (Read-only) |
| **Created by** | Staff/Admin | AI |
| **Tone** | Personal, narrative | Structured, analytical |
| **Format** | Prose or lists | Numbered lists preferred |
| **Metadata** | createdBy, lastEditedBy | model, confidence, tokens |
| **Visual** | Soft pastels | AI gradients, sparkles |
| **Icons** | 📝 📋 💡 🎯 ✅ | 🤖 ✨ 🧠 💡 🎯 |
| **Animation** | None/subtle | Pulse, gradient animations |
| **Who can create** | Anyone | Admin only |
| **Requirements** | None | 5+ answered questions |

---

## 💾 **Save/Load Patterns**

### **Load Human Report:**
```typescript
useEffect(() => {
  const loadHumanReport = async () => {
    const response = await fetch(`/api/incidents/${incidentId}/human-report`)
    if (response.ok) {
      const data = await response.json()
      setSummary(data.summary)
      setInsights(data.insights)
      setRecommendations(data.recommendations)
      setActions(data.actions)
    }
    // If 404, it's okay - report doesn't exist yet
  }
  loadHumanReport()
}, [incidentId])
```

### **Save Human Report:**
```typescript
const handleSave = async () => {
  const { userId } = useAuthStore()
  
  if (!summary || !insights || !recommendations || !actions) {
    toast.error("All 4 sections are required")
    return
  }
  
  const response = await fetch(`/api/incidents/${incidentId}/human-report`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      summary,
      insights,
      recommendations,
      actions,
      userId
    })
  })
  
  if (response.ok) {
    toast.success("Insights saved successfully")
  }
}
```

### **Generate & Load AI Report:**
```typescript
const handleGenerateAI = async () => {
  setGenerating(true)
  
  const response = await fetch(`/api/incidents/${incidentId}/ai-report`, {
    method: "POST"
  })
  
  if (response.ok) {
    const { aiReport } = await response.json()
    setAiReport(aiReport)
    toast.success("WAiK Insights generated!")
  }
  
  setGenerating(false)
}
```

---

## 🎨 **Color Palette for V0**

### **Human Report (Insights) - Soft & Professional:**
```css
Summary Card:
- Border: border-blue-200
- Background: bg-blue-50/50
- Icon: 📋 blue

Insights Card:
- Border: border-purple-200
- Background: bg-purple-50/50
- Icon: 💡 purple

Recommendations Card:
- Border: border-green-200
- Background: bg-green-50/50
- Icon: 🎯 green

Actions Card:
- Border: border-orange-200
- Background: bg-orange-50/50
- Icon: ✅ orange
```

---

### **AI Report (WAiK Agent) - Vibrant & Tech:**
```css
Container:
- Border: border-primary with gradient
- Header: bg-gradient-to-r from-primary/10 to-accent/10

Summary Card:
- Background: bg-gradient-to-br from-primary/5 to-primary/10
- Icon: 🧠 with animation

Insights Card:
- Background: bg-gradient-to-br from-accent/5 to-accent/10
- Icon: 💡 with pulse

Recommendations Card:
- Background: bg-gradient-to-br from-green-50 to-green-100
- Icon: 🎯

Actions Card:
- Background: bg-gradient-to-br from-blue-50 to-blue-100
- Icon: ✅

Generate Button:
- bg-gradient-to-r from-primary to-accent
- Sparkles icon with animate-pulse
- Loader2 with animate-spin when generating
```

---

## ✅ **Complete Structure for V0**

```typescript
// Full incident with both reports
interface Incident {
  id: string
  title: string
  description: string
  residentName: string
  residentRoom: string
  status: "open" | "in-progress" | "pending-review" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  staffId: string
  staffName: string
  createdAt: string
  updatedAt: string
  questions: Question[]
  
  // Optional reports
  humanReport?: HumanReport
  aiReport?: AIReport
}
```

---

## 🎉 **Summary for V0**

**What to build:**
1. ✅ Editable 4-card grid for Human Report (Insights)
2. ✅ Read-only 4-card grid for AI Report (WAiK Agent)
3. ✅ Generate button (admin-only, 5+ questions)
4. ✅ Mobile-responsive layout

**APIs to use:**
1. ✅ `PUT /api/incidents/:id/human-report` - Save human insights
2. ✅ `POST /api/incidents/:id/ai-report` - Generate AI insights
3. ✅ `PATCH /api/incidents/:id` - Update incident fields

**Design guidelines:**
- Human: Soft pastels, editable, save button
- AI: Vibrant gradients, sparkles, animations, generate button

**Everything is ready for V0!** 🚀

