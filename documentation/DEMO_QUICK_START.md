# WAiK Demo - Quick Start 🚀

## **Access the Demo**

\`\`\`
http://localhost:3000/waik-demo-start/login
\`\`\`

---

## **Login Credentials**

| Role | Username | Password |
|------|----------|----------|
| 👩‍⚕️ **Staff** | `waik-demo-staff` | `waik1+demo-staff!@#` |
| 👨‍💼 **Admin** | `waik-demo-admin` | `waik1+demo-admin!@#` |

---

## **What You'll See**

### **As Staff:**
- 📊 Dashboard with 3 assigned incidents
- ✏️ Answer questions about incidents
- 🎤 Create new incidents with voice

### **As Admin:**
- 📈 Dashboard with ALL incidents
- 🔍 Search and filter capabilities
- 👁️ View all Q&A exchanges
- ⚡ Update status and priority

---

## **Sample Data** (Pre-loaded)

### **Sarah Johnson (Staff User) - 3 Incidents**

1. **Resident Fall in Room 204** 🚨
   - Priority: High
   - Has 2 answered questions

2. **Medication Delay** 💊
   - Priority: Medium
   - No questions yet

3. **Dietary Error** 🍽️
   - Priority: Low
   - Has 1 unanswered question

### **Other Staff Members (Admin-Only View) - 5 Incidents**

4. **Wandering Resident** (James Martinez) - High Priority
5. **Aggressive Behavior** (James Martinez) - Medium Priority  
6. **Skin Tear** (Emily Davis) - Low Priority, Closed ✅
7. **Missed Meal** (Emily Davis) - Medium Priority
8. **Equipment Malfunction** (James Martinez) - Urgent Priority 🚨

**Total: 8 Incidents**
- Staff sees: **3 incidents** (only theirs)
- Admin sees: **8 incidents** (all staff)

---

## **Test Voice Reporting**

1. Login as staff
2. Click "Create New Incident"
3. **Say**: "I am ready"
4. Answer 7 questions by speaking
5. System auto-saves and returns to dashboard

**Browser Requirements**: Chrome, Edge, or Safari + microphone access

---

## **APIs Working** ✅

All these endpoints are functional:
- `GET /api/incidents` - Get all incidents
- `GET /api/staff/incidents?staffId=user-1` - Get staff incidents  
- `GET /api/incidents/:id` - Get incident details
- `PATCH /api/incidents/:id` - Update incident
- `POST /api/auth/login` - Login

---

## **Check Console Logs**

Look for `[v0]` prefixed messages to see:
- Voice recognition status
- API call results
- State changes
- Errors

---

## **Troubleshooting**

**No incidents?** → Server restarted (in-memory DB cleared)  
**Voice not working?** → Check microphone permissions  
**Not authenticated?** → Go back to login page  

---

## **Next Steps After Testing**

See full documentation in:
- `DEMO_SYSTEM_GUIDE.md` - Complete system guide
- `IMPLEMENTATION_SUMMARY.md` - Technical details

---

**Ready to test?** Start your dev server:
\`\`\`bash
npm run dev
\`\`\`

Then go to: http://localhost:3000/waik-demo-start/login
