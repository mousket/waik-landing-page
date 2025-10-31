# 🚀 Quick Start - Get Your Forms Working in 15 Minutes

## 0️⃣ First Time? Install Dependencies First!

If this is your first time running the project:

\`\`\`bash
# Navigate to project folder
cd /Users/gerardbeaubrun/Documents/projects/WAik/waik_landing_page/waik-landing-page

# Install dependencies (use --legacy-peer-deps for React 19 compatibility)
npm install --legacy-peer-deps

# Start the dev server
npm run dev
\`\`\`

Visit **http://localhost:3000** - you should see the landing page! ✅

**Note:** If you have `pnpm` installed, you can use `pnpm install` and `pnpm dev` instead.

---

## What You Need to Do Right Now

### 1️⃣ Create 3 Google Sheets (5 min)

Go to [sheets.google.com](https://sheets.google.com) and create:

1. **WAiK - Vanguard Applications**
   - Add headers: `Timestamp | Full Name | Role | Facility Name | Email | Phone | Form Type`

2. **WAiK - Demo Requests**
   - Add headers: `Timestamp | Full Name | Email | Facility Name | Phone | Form Type`

3. **WAiK - Newsletter Subscriptions**
   - Add headers: `Timestamp | Email | Form Type`

### 2️⃣ Add Google Apps Script to Each Sheet (5 min per sheet)

For each sheet:
1. Click **Extensions → Apps Script**
2. Copy the script from `GOOGLE_SHEETS_SETUP.md` (find the right one for each form)
3. Click **Save**
4. Click **Deploy → New deployment**
5. Choose **Web app**
6. Set **Who has access** to **Anyone**
7. Click **Deploy**
8. **Copy the URL** (looks like: `https://script.google.com/macros/s/...`)

### 3️⃣ Create .env.local File (2 min)

In your project folder, run:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Then edit `.env.local` and paste your 3 URLs:

\`\`\`env
NEXT_PUBLIC_SITE_URL=https://waik.care
NEXT_PUBLIC_GOOGLE_SHEETS_VANGUARD_URL=https://script.google.com/macros/s/YOUR_VANGUARD_ID/exec
NEXT_PUBLIC_GOOGLE_SHEETS_DEMO_URL=https://script.google.com/macros/s/YOUR_DEMO_ID/exec
NEXT_PUBLIC_GOOGLE_SHEETS_NEWSLETTER_URL=https://script.google.com/macros/s/YOUR_NEWSLETTER_ID/exec
\`\`\`

### 4️⃣ Test It! (3 min)

\`\`\`bash
npm run dev
# or if you have pnpm: pnpm dev
\`\`\`

Then test:
- Click "Request a Demo" button
- Scroll to Vanguard section and apply
- Subscribe to newsletter at the bottom

Check your Google Sheets - you should see the data! 🎉

---

## That's It!

You're ready to capture leads. 🚀

For detailed instructions, see `GOOGLE_SHEETS_SETUP.md`

For troubleshooting, see `IMPLEMENTATION_SUMMARY.md`

**Let's goooo! 💪**
