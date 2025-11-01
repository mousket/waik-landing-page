# Project Setup Guide

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js) or **pnpm**

---

## First Time Setup

### 1. Install Dependencies

\`\`\`bash
# Navigate to the project
cd /Users/gerardbeaubrun/Documents/projects/WAik/waik_landing_page/waik-landing-page

# Install dependencies
npm install --legacy-peer-deps
\`\`\`

**Why `--legacy-peer-deps`?**  
Some dependencies (like `vaul`) haven't been updated for React 19 yet. This flag allows npm to install them anyway.

**Using pnpm instead:**
\`\`\`bash
pnpm install
\`\`\`

---

### 2. Start the Development Server

\`\`\`bash
npm run dev
\`\`\`

**Or with pnpm:**
\`\`\`bash
pnpm dev
\`\`\`

The server will start at **http://localhost:3000** 🎉

---

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Project Structure

\`\`\`
waik-landing-page/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout (metadata, fonts)
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── header.tsx         # Site header
│   ├── hero.tsx           # Hero section
│   ├── demo-modal.tsx     # Demo request modal
│   └── ui/                # Reusable UI components
├── lib/                   # Utilities and helpers
│   ├── google-sheets.ts   # Google Sheets integration
│   └── utils.ts           # General utilities
├── documentation/         # Project documentation
│   ├── QUICK_START.md     # Quick start guide
│   ├── GOOGLE_SHEETS_SETUP.md  # Forms setup
│   └── ENVIRONMENT_VARIABLES.md # Env var guide
└── public/                # Static assets (images, logos)
\`\`\`

---

## Environment Variables

The project uses automatic environment detection:

- **Local:** `http://localhost:3000` (automatic)
- **Vercel Preview:** Automatic via `VERCEL_URL`
- **Production:** Set `NEXT_PUBLIC_SITE_URL=https://waik.care` in Vercel

**For details:** See `ENVIRONMENT_VARIABLES.md`

---

## Setting Up Forms (Optional)

To enable the contact forms (Demo requests, Vanguard applications, Newsletter):

1. Follow instructions in `GOOGLE_SHEETS_SETUP.md`
2. Create `.env.local` with your Google Sheets URLs
3. Test the forms

**Quick guide:** See `QUICK_START.md`

---

## Troubleshooting

### "next: command not found"

**Solution:** Install dependencies first:
\`\`\`bash
npm install --legacy-peer-deps
\`\`\`

### Dependency conflicts / peer dependency errors

**Solution:** Use the `--legacy-peer-deps` flag:
\`\`\`bash
npm install --legacy-peer-deps
\`\`\`

### Port 3000 already in use

**Solution:** Stop other processes using port 3000, or change the port:
\`\`\`bash
PORT=3001 npm run dev
\`\`\`

### Changes not showing up

**Solution:**
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Clear Next.js cache: `rm -rf .next`
3. Restart dev server

---

## Development Workflow

1. **Start dev server:** `npm run dev`
2. **Make changes** to files in `app/` or `components/`
3. **See changes instantly** - Next.js hot-reloads automatically
4. **Commit your changes:** `git add .` and `git commit`
5. **Push to deploy:** `git push` (if using Vercel)

---

## Deploying to Vercel

1. Push your code to GitHub
2. Import project in Vercel Dashboard
3. Set environment variables (if using forms)
4. Deploy! 🚀

Vercel will automatically:
- Build your project
- Deploy to `your-project.vercel.app`
- Set up custom domain (waik.care)

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Custom components + shadcn/ui
- **Fonts:** Plus Jakarta Sans (headings), Inter (body)
- **Icons:** Lucide React
- **Forms:** Google Sheets integration

---

## Next Steps

✅ Project is running  
→ **Configure forms:** See `QUICK_START.md`  
→ **Set up environment:** See `ENVIRONMENT_VARIABLES.md`  
→ **Deploy to production:** Push to GitHub → Vercel  

---

## Need Help?

- Check `documentation/` folder for guides
- Review `IMPLEMENTATION_SUMMARY.md` for technical details
- Ask in project chat/Slack

**Happy coding! 🎉**
