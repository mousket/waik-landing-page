# Environment Variables Configuration

This guide explains how to configure environment variables for different environments (local, Vercel preview, production).

---

## **Current Setup**

The site uses `NEXT_PUBLIC_SITE_URL` for metadata (OpenGraph, Twitter cards, etc.)

---

## **Recommended Configuration**

### **1. Local Development** 🏠

Create a `.env.local` file in the project root (this file is gitignored):

```bash
# .env.local
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Steps:**
```bash
# In project root
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" > .env.local
```

---

### **2. Vercel Preview (waik.vercel.app)** 🔍

**Option A: Use Vercel's Automatic URL (Recommended)**

Update `app/layout.tsx` to use Vercel's automatic environment variable:

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
  || (process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : "http://localhost:3000")

export const metadata: Metadata = {
  // ...
  metadataBase: new URL(siteUrl),
  // ...
}
```

**How it works:**
- `VERCEL_URL` is automatically set by Vercel for preview deployments
- Changes for every preview deployment (e.g., `waik-git-main-yourname.vercel.app`)
- No manual configuration needed!

**Option B: Manual Configuration in Vercel**

Go to Vercel Dashboard → waik-landing-page → Settings → Environment Variables:

- Variable: `NEXT_PUBLIC_SITE_URL`
- Value: `https://waik.vercel.app`
- Environment: **Preview** ✓ (check only Preview)

---

### **3. Production (waik.care)** 🚀

Go to Vercel Dashboard → waik-landing-page → Settings → Environment Variables:

- Variable: `NEXT_PUBLIC_SITE_URL`
- Value: `https://waik.care`
- Environment: **Production** ✓ (check only Production)

---

## **Complete Environment Variable Setup**

### **Project Files:**

**`.env.local`** (create this, it's gitignored)
```bash
# Local development only
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**`.env.example`** (committed to git - template for team)
```bash
# Copy this to .env.local and fill in the values
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### **Vercel Dashboard Settings:**

| Variable | Preview | Production |
|----------|---------|------------|
| `NEXT_PUBLIC_SITE_URL` | `https://waik.vercel.app` | `https://waik.care` |

---

## **How Next.js Loads Environment Variables**

Priority order (highest to lowest):
1. `.env.local` → Local development (gitignored)
2. `.env.production` → Production builds
3. `.env` → Default fallback
4. Vercel Environment Variables → Override all when deployed

---

## **Best Practice Summary**

✅ **DO:**
- Use `.env.local` for local development
- Use Vercel Dashboard for preview/production
- Commit `.env.example` as a template
- Use `VERCEL_URL` for automatic preview URLs

❌ **DON'T:**
- Commit `.env.local` (contains local config)
- Hardcode URLs in your code
- Use production URLs in development

---

## **Quick Setup Commands**

```bash
# 1. Create local environment file
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" > .env.local

# 2. Create example template (for team)
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" > .env.example

# 3. Verify it works
npm run dev
# Should use localhost:3000
```

---

## **Vercel Automatic Variables** (Available without configuration)

- `VERCEL_URL` - Deployment URL (e.g., waik-git-main.vercel.app)
- `VERCEL_ENV` - Environment: `development`, `preview`, or `production`
- `NEXT_PUBLIC_VERCEL_URL` - Public version of VERCEL_URL

---

## **Testing**

```bash
# Local
npm run dev
# Should use: http://localhost:3000

# Production (after deploy)
# Should use: https://waik.care

# Preview (after deploy to non-main branch)
# Should use: https://waik-git-branch-name.vercel.app
```

---

## **Current Files That Use This Variable**

- `app/layout.tsx` - OpenGraph and Twitter metadata

---

## **Need to Add More Environment Variables?**

Follow this same pattern:
- Add to `.env.local` for local dev
- Add to Vercel Dashboard for preview/production
- Prefix with `NEXT_PUBLIC_` if needed in browser code
- Document in this file!

