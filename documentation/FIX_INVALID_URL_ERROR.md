# Fix: Invalid URL Error

## ⚠️ The Error You're Seeing

```
⨯ TypeError: Invalid URL
   at ignore-listed frames {
 code: 'ERR_INVALID_URL',
 input: '3000/waik-logo.png',
 base: 'localhost:3000',
}
```

---

## 🔍 Root Cause

Your `.env.local` or `.env` file has **incorrect URL format** for `NEXT_PUBLIC_SITE_URL`.

**Wrong:**
```env
NEXT_PUBLIC_SITE_URL=localhost:3000           ❌
NEXT_PUBLIC_SITE_URL=3000                     ❌
NEXT_PUBLIC_SITE_URL=localhost                ❌
```

**Correct:**
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000    ✅
```

The URL **MUST include the protocol** (`http://` or `https://`).

---

## ✅ How to Fix

### **Option 1: Fix Your .env.local File (Recommended)**

1. Open your `.env.local` file in the project root
2. Find the line with `NEXT_PUBLIC_SITE_URL`
3. Change it to:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Save the file
5. Restart your dev server

### **Option 2: Delete .env.local (Use Defaults)**

If you don't need custom environment variables:

```bash
# Delete the file
rm .env.local

# Restart server
npm run dev
```

The code will automatically use `http://localhost:3000` as the default.

---

## 🔧 Complete Fix Steps

1. **Kill all Next.js processes:**
   ```bash
   pkill -9 node
   ```

2. **Fix your .env.local file:**
   ```env
   # Correct format with http:// protocol
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. **Clean the Next.js cache:**
   ```bash
   rm -rf .next
   ```

4. **Start fresh:**
   ```bash
   npm run dev
   ```

---

## 📝 Example .env.local File

Create or update your `.env.local` file to look like this:

```env
# Site URL - MUST include http:// or https://
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Google Sheets URLs (optional - only if using forms)
NEXT_PUBLIC_GOOGLE_SHEETS_VANGUARD_URL=https://script.google.com/macros/s/YOUR_ID/exec
NEXT_PUBLIC_GOOGLE_SHEETS_DEMO_URL=https://script.google.com/macros/s/YOUR_ID/exec
NEXT_PUBLIC_GOOGLE_SHEETS_NEWSLETTER_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

---

## 🎯 Why This Happens

Next.js uses `new URL()` to construct the metadata base URL:

```typescript
// In app/layout.tsx
metadataBase: new URL(siteUrl)
```

The `URL()` constructor requires a **valid protocol** (http:// or https://).

**Invalid:**
```typescript
new URL("localhost:3000")  // ❌ Error: Invalid URL
```

**Valid:**
```typescript
new URL("http://localhost:3000")  // ✅ Works!
```

---

## ✅ Verification

After fixing, you should see:

```bash
✓ Ready in ~700ms
GET / 200 in ~1500ms
```

**No more "Invalid URL" errors!** ✅

---

## 🚨 Port 3000 Already in Use?

If you see:
```
Port 3000 is in use by process XXXXX
```

**Kill it:**
```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or kill all node processes
pkill -9 node
```

Then restart:
```bash
npm run dev
```

---

## 📚 Related Documentation

- `ENVIRONMENT_VARIABLES.md` - Full environment variable guide
- `PROJECT_SETUP.md` - Project setup instructions

---

**Last Updated**: October 31, 2025  
**Fix Time**: < 2 minutes ⚡

