/**
 * Public marketing form submissions (Google Apps Script web apps).
 * URLs come from NEXT_PUBLIC_* env vars (client-side).
 */

export interface FormSubmission {
  formType: "vanguard" | "demo" | "newsletter"
  timestamp?: string
  honeypot?: string
  [key: string]: string | undefined
}

export async function submitToGoogleSheets(
  data: FormSubmission
): Promise<{ success: boolean; message: string }> {
  if (data.honeypot) {
    console.warn("Spam submission detected and blocked")
    return {
      success: true,
      message: "Thank you for your submission!",
    }
  }

  const submissionData = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  }

  const scriptUrl = getScriptUrlForFormType(data.formType)

  if (!scriptUrl) {
    console.error("Google Sheets script URL not configured for:", data.formType)
    return {
      success: false,
      message: "Configuration error. Please contact support.",
    }
  }

  try {
    await fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionData),
    })

    return {
      success: true,
      message: "Thank you for your submission! We'll be in touch soon.",
    }
  } catch (error) {
    console.error("Error submitting to Google Sheets:", error)
    return {
      success: false,
      message: "An error occurred. Please try again or contact us directly at gerard@waik.care",
    }
  }
}

function getScriptUrlForFormType(formType: string): string | null {
  const urls = {
    vanguard: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_VANGUARD_URL,
    demo: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_DEMO_URL,
    newsletter: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_NEWSLETTER_URL,
  }

  return urls[formType as keyof typeof urls] || null
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "")
  return cleaned.length === 10 || cleaned.length === 11
}
