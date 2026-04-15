# Task 17 — Bulk Import: Staff + Residents
## Phase: 7 — Navigation, Intelligence & Imports
## Estimated Time: 6–7 hours
## Depends On: task-10, task-08

---

## Why This Task Exists

Manual data entry for 80–120 residents and 20–30 staff members is a 4-hour
task that generates resentment before the product has been used once. Bulk
import with preview, validation, and error handling turns a painful onboarding
into a 15-minute process. This is the difference between a community signing
up for the pilot and a community completing onboarding.

---

## Success Criteria

- [ ] Staff CSV/Excel upload shows preview table with validation
- [ ] Usernames auto-generated as first_name.last_name, duplicates handled
- [ ] Red rows block import until fixed; yellow rows are warnings only
- [ ] Welcome email sent to each created staff member
- [ ] mustChangePassword = true for all bulk-imported staff
- [ ] Resident CSV/Excel upload shows preview with validation
- [ ] Required resident fields validated; missing fields block import
- [ ] Duplicate room+name combination flagged as yellow warning
- [ ] `lib/import-parser.ts` handles both CSV and .xlsx files
- [ ] CSV template downloads work for both staff and resident imports

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building bulk import functionality for WAiK (Next.js 14) — staff and resident CSV/Excel import.

SETUP:
npm install papaparse xlsx @types/papaparse
npm install @types/xlsx (if not included)

1. Create lib/import-parser.ts:
   parseFile(file: File): Promise<Record<string, string>[]>
   - Detect file type: if name ends .csv use papaparse; if .xlsx use xlsx
   - For CSV: use Papa.parse(file, { header: true, skipEmptyLines: true })
   - For XLSX: use xlsx.read(), convert first sheet to JSON with header: 1
   - Normalize all keys to lowercase, trim all string values
   - Handle BOM characters in CSV (strip \uFEFF from first key)
   - Return array of objects

PART A — STAFF IMPORT:

2. Create app/admin/settings/staff/import/page.tsx with 3 steps:

STEP 1 — Upload:
Drag-and-drop zone accepting .csv and .xlsx
"Download CSV Template" button → creates and downloads:
  first_name,last_name,email,role,phone
  (include one example row as a comment or second row)
Show accepted roles below the upload zone

STEP 2 — Preview table after file parsed:
Columns: First Name | Last Name | Auto-Username | Email | Role | Status
Auto-generate username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s/g,'_')
Handle duplicates: GET /api/admin/staff/check-usernames with list of usernames → returns which exist → append 2, 3, etc.
Row status:
  ✅ Valid (green)
  ⚠️ Already exists (yellow) — email already in this facility
  ❌ Error (red) — missing required field, invalid email, invalid role
Show summary: "X staff will be created, Y errors, Z already exist"
"Fix errors" guidance for red rows (specific error message per row)
"Confirm & Import" button — disabled if any red rows

STEP 3 — Import:
POST /api/admin/staff/bulk-import with array of valid staff records
Show progress bar updating as each account is created (use streaming response or periodic polling)
Final summary: "X created successfully, Y failed"

3. Create POST /api/admin/staff/bulk-import:
For each record:
  - Generate unique username (check MongoDB for conflicts)
  - Generate temp password: "WAiK" + crypto.randomInt(100000, 999999).toString()
  - Hash password with bcrypt
  - Create UserModel with mustChangePassword: true
  - Create Clerk user via Clerk Backend API (createUser)
  - Set Clerk publicMetadata: { facilityId, orgId, role }
  - Send welcome email via Clerk (or Resend/SendGrid if configured):
    Subject: "Welcome to WAiK — [Community Name]"
    Body: username, temp password, login URL, "change password on first login" instruction

PART B — RESIDENT IMPORT:

4. Create app/admin/residents/import/page.tsx with same 3-step flow:

Template CSV headers:
first_name,last_name,preferred_name,room_number,wing,date_of_birth,gender,admission_date,care_level,primary_diagnosis,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship

Validation rules:
Required: first_name, last_name, room_number, care_level
date_of_birth, admission_date: must parse as valid dates (accept MM/DD/YYYY and YYYY-MM-DD)
care_level: must be exactly one of: independent, assisted, memory_care, skilled_nursing
room_number: flag yellow warning if another resident in this facility has same room AND same name

5. Create POST /api/admin/residents/bulk-import:
Server-side re-validation of all records
Skip (don't create) records where resident with same firstName + lastName + roomNumber already exists
Create ResidentModel for each valid record with facilityId from auth
Return { created, skipped, failed, errors: string[] }

6. Add import buttons:
Add "Import Staff (CSV/Excel)" button to app/admin/settings/staff/page.tsx → /admin/settings/staff/import
Add "Import Residents (CSV/Excel)" button to app/admin/residents/page.tsx → /admin/residents/import
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_7/task-17-DONE.md`
- Update `documentation/waik/01-SYSTEM-OVERVIEW.md` to reflect full feature set
- Create final `plan/pilot_1/PILOT_READY.md` — the completion declaration
