# Environment Setup - Quick Guide

## **What I Just Did** ✅

1. ✅ Updated `app/layout.tsx` to automatically detect environment
2. ✅ Created comprehensive documentation in `ENVIRONMENT_VARIABLES.md`
3. ✅ Code now works for ALL environments automatically!

---

## **How It Works Now**

The site will automatically use the correct URL:

| Environment | URL Used | How it's detected |
|-------------|----------|-------------------|
| **Local Development** | `http://localhost:3000` | Automatic fallback |
| **Vercel Preview** | `https://waik-xxx.vercel.app` | Vercel's `VERCEL_URL` |
| **Production** | `https://waik.care` | You set in Vercel Dashboard |

---

## **What You Need to Do**

### **Option 1: Do Nothing (Will work!)** ⚡

The code will work automatically:
- ✅ Local: Uses `localhost:3000`
- ✅ Vercel: Uses Vercel's automatic URL
- ✅ You're good to go!

### **Option 2: Set Production URL in Vercel (Recommended)** ⭐

For the production domain `waik.care`, go to Vercel:

1. Go to **Vercel Dashboard** → **waik-landing-page** → **Settings** → **Environment Variables**
2. Add new variable:
   - **Name:** `NEXT_PUBLIC_SITE_URL`
   - **Value:** `https://waik.care`
   - **Environments:** Check **Production** only ✓
3. Click **Save**

### **Option 3: Create .env.local for Local Development (Optional)** 

If you want to override the localhost URL:

\`\`\`bash
# In project root
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" > .env.local
\`\`\`

---

## **Testing**

Run locally to test:

\`\`\`bash
npm run dev
\`\`\`

The site will automatically use:
- `http://localhost:3000` for metadata
- All OpenGraph tags will have correct URLs
- No errors!

---

## **Summary**

### **Before:**
- ❌ Hardcoded `https://waik.care` everywhere
- ❌ Wrong URLs in development
- ❌ Manual configuration needed

### **After:**
- ✅ Automatic environment detection
- ✅ Correct URLs everywhere
- ✅ Works out of the box!

---

## **Priority for URLs:**

1. **`NEXT_PUBLIC_SITE_URL`** (if you set it in Vercel or `.env.local`)
2. **`VERCEL_URL`** (automatic on Vercel deployments)
3. **`http://localhost:3000`** (fallback for local)

---

## **Need Help?**

See the full documentation in `ENVIRONMENT_VARIABLES.md`
