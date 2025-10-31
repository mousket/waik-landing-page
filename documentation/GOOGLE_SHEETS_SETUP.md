# Google Sheets Setup Guide for WAiK Landing Page

This guide will walk you through setting up Google Sheets to receive form submissions from your WAiK landing page.

## Overview

You'll create **3 separate Google Sheets** for:
1. **Vanguard Program Applications**
2. **Demo Requests**
3. **Newsletter Subscriptions**

Each sheet will have a Google Apps Script that acts as a webhook to receive data.

---

## Step-by-Step Instructions

### Part 1: Create Your Google Sheets

1. Go to [Google Sheets](https://sheets.google.com)
2. Create **3 new spreadsheets** with these names:
   - `WAiK - Vanguard Applications`
   - `WAiK - Demo Requests`
   - `WAiK - Newsletter Subscriptions`

---

### Part 2: Set Up Each Sheet

Do this for **EACH** of the 3 spreadsheets you created:

#### A. Set Up the Header Row

**For Vanguard Applications:**
In the first row (A1-G1), add these column headers:
\`\`\`
Timestamp | Full Name | Role | Facility Name | Email | Phone | Form Type
\`\`\`

**For Demo Requests:**
In the first row (A1-F1), add these column headers:
\`\`\`
Timestamp | Full Name | Email | Facility Name | Phone | Form Type
\`\`\`

**For Newsletter Subscriptions:**
In the first row (A1-C1), add these column headers:
\`\`\`
Timestamp | Email | Form Type
\`\`\`

#### B. Add the Google Apps Script

1. In the spreadsheet, click **Extensions** → **Apps Script**
2. Delete any existing code
3. Paste the appropriate script below based on the form type
4. Click **Save** (💾 icon)

**Script for Vanguard Applications:**
\`\`\`javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Check for honeypot (spam protection)
    if (data.honeypot && data.honeypot.length > 0) {
      console.log('Spam detected and blocked');
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Add data to sheet
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.fullName || '',
      data.role || '',
      data.facilityName || '',
      data.email || '',
      data.phone || '',
      data.formType || 'vanguard'
    ]);
    
    // Optional: Send email notification to you
    MailApp.sendEmail({
      to: 'gerard@waik.care',
      subject: '🎯 New Vanguard Program Application!',
      body: `
New Vanguard Application Received:

Name: ${data.fullName}
Role: ${data.role}
Facility: ${data.facilityName}
Email: ${data.email}
Phone: ${data.phone}

View all applications: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}
      `
    });
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function doGet() {
  return ContentService.createTextOutput('WAiK Vanguard Form Handler is working!');
}
\`\`\`

**Script for Demo Requests:**
\`\`\`javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Check for honeypot (spam protection)
    if (data.honeypot && data.honeypot.length > 0) {
      console.log('Spam detected and blocked');
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    data.timestamp || new Date().toISOString(),
      data.fullName || '',
      data.role || '',
      data.facilityName || '',
      data.email || '',
      data.phone || '',
      data.formType || 'demo'
    
    // Optional: Send email notification to you
    MailApp.sendEmail({
      to: 'gerard@waik.care',
      subject: '🚀 New Demo Request!',
      body: `
New Demo Request Received:

Name: ${data.fullName}
Email: ${data.email}
Facility: ${data.facilityName}
Phone: ${data.phone}

View all demo requests: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}
      `
    });
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function doGet() {
  return ContentService.createTextOutput('WAiK Demo Request Handler is working!');
}
\`\`\`

**Script for Newsletter Subscriptions:**
\`\`\`javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Check for honeypot (spam protection)
    if (data.honeypot && data.honeypot.length > 0) {
      console.log('Spam detected and blocked');
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check for duplicate email
    const emails = sheet.getRange('B2:B' + sheet.getLastRow()).getValues();
    const emailExists = emails.some(row => row[0] === data.email);
    
    if (emailExists) {
      console.log('Email already subscribed:', data.email);
      return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Already subscribed'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Add data to sheet
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.email || '',
      data.formType || 'newsletter'
    ]);
    
    // Optional: Send email notification to you
    MailApp.sendEmail({
      to: 'gerard@waik.care',
      subject: '📧 New Newsletter Subscription!',
      body: `
New Newsletter Subscription:

Email: ${data.email}

View all subscriptions: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}
      `
    });
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function doGet() {
  return ContentService.createTextOutput('WAiK Newsletter Handler is working!');
}
\`\`\`

#### C. Deploy the Script as a Web App

1. In the Apps Script editor, click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**
3. Configure the deployment:
   - **Description**: "WAiK Form Handler" (or similar)
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone**
4. Click **Deploy**
5. **IMPORTANT**: You may need to authorize the app:
   - Click **Authorize access**
   - Choose your Google account
   - Click **Advanced** → **Go to [Your Project Name] (unsafe)**
   - Click **Allow**
6. **Copy the Web App URL** - it will look like:
   \`\`\`
   https://script.google.com/macros/s/AKfycby.../exec
   \`\`\`
7. **SAVE THIS URL!** You'll need it in the next step

#### D. Test Your Web App

1. Paste the Web App URL in your browser
2. You should see the test message (e.g., "WAiK Vanguard Form Handler is working!")
3. If you see this, your script is working correctly! ✅

---

### Part 3: Configure Your Landing Page

1. In your project, create a `.env.local` file (copy from `.env.example`)
2. Add your three Web App URLs:

\`\`\`env
NEXT_PUBLIC_SITE_URL=https://waik.care

# Paste your Web App URLs here
NEXT_PUBLIC_GOOGLE_SHEETS_VANGUARD_URL=https://script.google.com/macros/s/YOUR_VANGUARD_ID/exec
NEXT_PUBLIC_GOOGLE_SHEETS_DEMO_URL=https://script.google.com/macros/s/YOUR_DEMO_ID/exec
NEXT_PUBLIC_GOOGLE_SHEETS_NEWSLETTER_URL=https://script.google.com/macros/s/YOUR_NEWSLETTER_ID/exec
\`\`\`

3. **IMPORTANT**: Never commit `.env.local` to git (it's already in `.gitignore`)

---

### Part 4: Test Your Forms

1. Restart your development server:
   \`\`\`bash
   pnpm dev
   \`\`\`

2. Test each form on your landing page:
   - **Vanguard Program**: Scroll to the Vanguard section and submit the form
   - **Demo Request**: Click "Request a Demo" button in the header or hero
   - **Newsletter**: Scroll to the bottom CTA section and subscribe

3. Check your Google Sheets to see if the data appears! 📊

---

## 🛡️ Security Features Included

Your forms have built-in spam protection:
- **Honeypot fields**: Hidden fields that catch bots
- **Email notifications**: Get instant alerts for new submissions
- **Duplicate checking**: Newsletter form prevents duplicate emails

---

## 📊 Organizing Your Data

**Pro Tips:**
1. **Share the sheets** with team members (Share button → Add people)
2. **Create filtered views** for sorting and filtering data
3. **Use Google Forms** formatting to make columns pretty
4. **Export to CSV** anytime for backups or CRM imports

---

## 🎯 Next Steps

### For Vanguard Applications:
- Follow up within 24 hours
- Offer personalized onboarding call
- Track conversion rate (applications → customers)

### For Demo Requests:
- Schedule demos within 24-48 hours
- Send calendar invite with Zoom/Meet link
- Prepare personalized demo based on facility type

### For Newsletter:
- Set up automated welcome email
- Plan monthly updates about WAiK progress
- Consider using Mailchimp or SendGrid for newsletters

---

## ⚡ Deploy to Production

When deploying to Vercel/production:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add all three Google Sheets URLs:
   - `NEXT_PUBLIC_GOOGLE_SHEETS_VANGUARD_URL`
   - `NEXT_PUBLIC_GOOGLE_SHEETS_DEMO_URL`
   - `NEXT_PUBLIC_GOOGLE_SHEETS_NEWSLETTER_URL`
4. Redeploy your site

---

## 🆘 Troubleshooting

**Forms not submitting?**
- Check browser console for errors
- Verify the URLs in `.env.local` are correct
- Make sure Web App is deployed with "Anyone" access

**Not receiving emails?**
- Check your Gmail spam folder
- Verify `gerard@waik.care` email address in scripts
- Gmail has limits (100 emails/day for free accounts)

**Duplicate data in sheets?**
- User might have clicked submit multiple times
- Consider adding unique ID tracking

---

## 🚀 You're All Set!

Your landing page is now capturing leads like a pro. Every submission goes directly to your Google Sheets and your inbox.

**Ayiti rising! 🇭🇹 Let's make WAiK a success!**

For questions or issues, check the code comments in:
- `/lib/google-sheets.ts`
- Component files with forms

---

**Created with ❤️ for WAiK by Gerard**




now I have the form for newsletter expecting the following 
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.email || '',
      data.fullName || '',
      data.formType || 'newsletter'
    ]);

I also have the form for the Demo Request expect the following now
      data.fullName || '',
      data.role || '',
      data.facilityName || '',
      data.email || '',
      data.phone || '',
      data.formType || 'demo'

Could you check to see if this project is equipped to incorporate those changes, make not make the necessary changes on the front end(ui) and back endso that i can start testing the forms
