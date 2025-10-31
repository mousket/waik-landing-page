/**
 * Google Sheets Integration Utility
 * 
 * This utility handles form submissions to Google Sheets via Google Apps Script Web App.
 * It includes honeypot spam protection and proper error handling.
 */

export interface FormSubmission {
  formType: 'vanguard' | 'demo' | 'newsletter'
  timestamp?: string
  honeypot?: string // For spam protection
  [key: string]: string | undefined
}

/**
 * Submits form data to Google Sheets via Google Apps Script Web App
 * @param data - The form data to submit
 * @returns Promise with success status and message
 */
export async function submitToGoogleSheets(
  data: FormSubmission
): Promise<{ success: boolean; message: string }> {
  // Spam check: if honeypot field is filled, reject silently
  if (data.honeypot) {
    console.warn('Spam submission detected and blocked')
    return { 
      success: true, // Return success to not reveal spam detection
      message: 'Thank you for your submission!' 
    }
  }

  // Add timestamp if not provided
  const submissionData = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  }

  // Get the appropriate Google Apps Script URL based on form type
  const scriptUrl = getScriptUrlForFormType(data.formType)

  if (!scriptUrl) {
    console.error('Google Sheets script URL not configured for:', data.formType)
    return {
      success: false,
      message: 'Configuration error. Please contact support.',
    }
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script requires no-cors
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData),
    })

    // Note: With no-cors mode, we can't read the response
    // We assume success if no error was thrown
    return {
      success: true,
      message: 'Thank you for your submission! We\'ll be in touch soon.',
    }
  } catch (error) {
    console.error('Error submitting to Google Sheets:', error)
    return {
      success: false,
      message: 'An error occurred. Please try again or contact us directly at gerard@waik.care',
    }
  }
}

/**
 * Gets the Google Apps Script URL for the specified form type
 */
function getScriptUrlForFormType(formType: string): string | null {
  const urls = {
    vanguard: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_VANGUARD_URL,
    demo: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_DEMO_URL,
    newsletter: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_NEWSLETTER_URL,
  }

  return urls[formType as keyof typeof urls] || null
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates phone number format (US format)
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  // Check if it's 10 or 11 digits (with or without country code)
  return cleaned.length === 10 || cleaned.length === 11
}
