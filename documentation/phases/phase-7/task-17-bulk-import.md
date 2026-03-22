# Task: Bulk Import: Staff + Residents
## Phase: 7
## Depends On: task-16-notification-center
## Estimated Time: 8 hours

## Context Files
- app/admin/settings/staff/import/page.tsx (create)
- app/api/admin/staff/bulk-import (create)
- app/admin/residents/import/page.tsx (create)
- app/api/admin/residents/bulk-import (create)
- app/change-password/page.tsx (create)
- lib/import-parser.ts (create)
- backend UserModel (mustChangePassword)
- middleware.ts (redirect to change-password when mustChangePassword)

## Success Criteria
- [ ] Staff import: upload CSV/Excel, preview with validation, Create accounts; template download
- [ ] POST bulk-import staff: Clerk invite + MongoDB user, welcome email, mustChangePassword
- [ ] First-login redirect to /change-password; update password in MongoDB + Clerk
- [ ] Resident import: 3-step flow, template, validation, POST bulk-import
- [ ] Import buttons on staff and residents list pages
- [ ] lib/import-parser.ts: parseFile(CSV/xlsx), normalized objects, BOM handling

## Test Cases
- Staff CSV with duplicate username → maria.rodriguez2; welcome email sent
- First login with mustChangePassword → redirect to change-password; after submit, access granted
- Resident CSV duplicate name+room → marked "already exists — will skip"
- Export template has correct headers

## Implementation Prompt

```
I'm building WAiK on Next.js 14. I need to add bulk import functionality for staff and residents — CSV/Excel upload that creates accounts and profiles without manual entry.

This is critical for pilot onboarding. A community should be able to go from zero to fully set up in under 30 minutes.

PART A — BULK STAFF IMPORT

1. Create app/admin/settings/staff/import/page.tsx:

   STEP 1 — Upload:
   Drag-and-drop zone that accepts CSV or Excel (.xlsx) files
   "Download template" button → downloads a pre-formatted CSV with headers:
   first_name, last_name, email, role, phone (optional)
   
   Show accepted role values in a helper text below the upload zone.

   STEP 2 — Preview:
   After upload, parse the file client-side and show a preview table:
   Columns: First Name | Last Name | Auto-Generated Username | Email | Role | Status
   
   Auto-generate username as: first_name.last_name (lowercase, spaces → underscores)
   Handle duplicates: if maria.rodriguez exists, show maria.rodriguez2
   
   Row validation — flag rows with:
   - Missing required fields (first_name, last_name, email, role) → red row
   - Invalid email format → red row
   - Invalid role value → red row  
   - Email already exists in this facility → yellow row ("already has an account")
   
   Show summary: "X staff will be created, Y have errors, Z already exist"
   "Fix errors" guidance below any red rows
   
   STEP 3 — Confirm & Import:
   "Create [X] staff accounts" button (disabled if any red rows)
   
   On confirm: POST /api/admin/staff/bulk-import
   Show a progress bar as accounts are created (stream the response)
   On completion: show results — how many succeeded, any that failed

2. Create POST /api/admin/staff/bulk-import:
   Accepts array of validated staff records
   For each record:
   - Generate username: first_name.last_name (handle duplicates with incrementing suffix)
   - Generate temporary password: WAiK + random 6-digit number (e.g. WAiK847291)
   - Create user in MongoDB UserModel with hashed password
   - Store { facilityId, orgId, role } in user record
   - Create Clerk user account with the email (invite flow, not password-based in Clerk)
   - Send welcome email with username and temporary password
   - Flag account as "must change password on first login"
   
   Welcome email content:
   Subject: "Welcome to WAiK — Your login details"
   Body:
   "You've been added to WAiK by [Community Name].
   Username: [username]
   Temporary password: [password]
   Login at: [app URL]
   You will be asked to create a new password on your first login.
   Questions? Contact [admin name]."
   
   Return: { created: number, failed: number, errors: string[] }

3. Force password change on first login:
   Add mustChangePassword: boolean to UserModel (default false, set true for bulk-imported users)
   In middleware.ts: if user is authenticated AND mustChangePassword is true, redirect to /change-password
   Create app/change-password/page.tsx: simple form with new password + confirm
   On submit: update password in MongoDB + Clerk, set mustChangePassword = false

PART B — BULK RESIDENT IMPORT

4. Create app/admin/residents/import/page.tsx:

   Same 3-step flow as staff import.
   
   Template CSV headers:
   first_name, last_name, preferred_name (optional), room_number, wing (optional),
   date_of_birth (MM/DD/YYYY), gender (M/F/Other), admission_date (MM/DD/YYYY),
   care_level (independent/assisted/memory_care/skilled_nursing),
   primary_diagnosis (optional), emergency_contact_name (optional),
   emergency_contact_phone (optional), emergency_contact_relationship (optional)
   
   Row validation:
   - Required: first_name, last_name, room_number, care_level
   - date_of_birth and admission_date must be valid dates in MM/DD/YYYY format
   - care_level must be one of the four valid values
   - room_number must be unique within facility (flag duplicates as yellow warning)
   
   Preview table shows:
   Full Name | Room | Care Level | DOB | Admission Date | Status
   
   Duplicate detection: if a resident with same name AND room already exists, mark as "already exists — will skip"

5. Create POST /api/admin/residents/bulk-import:
   Validates all records server-side (second validation pass)
   Creates ResidentModel documents for each valid row
   All linked to facilityId from authenticated user
   Returns: { created: number, skipped: number, failed: number, errors: string[] }

6. Add "Import Residents" button to app/admin/residents/page.tsx next to "Add Resident"
   Add "Import Staff" button to app/admin/settings/staff/page.tsx

7. Create a reusable CSV/Excel parser utility lib/import-parser.ts:
   parseFile(file: File): Promise<Record<string, string>[]>
   Handles both CSV and .xlsx using the papaparse and xlsx libraries
   npm install papaparse xlsx @types/papaparse
   Returns normalized array of objects with lowercase keys
   Trims whitespace from all values
   Handles BOM characters in CSV (common in Excel exports)
```
