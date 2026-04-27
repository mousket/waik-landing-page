import * as React from "react"
import { emailBrand, emailFont, getEmailAppBaseUrl } from "./email-assets"
import { EmailCredentialPanel, EmailNotePanel, WaikEmailPage } from "./waik-email-chrome"

export interface WelcomeAdminEmailProps {
  firstName: string
  facilityName: string
  email: string
  tempPassword: string
}

export function WelcomeAdminEmail({ firstName, facilityName, email, tempPassword }: WelcomeAdminEmailProps) {
  const base = getEmailAppBaseUrl()
  const signIn = `${base}/sign-in`

  return (
    <WaikEmailPage
      headTitle="Welcome to WAiK"
      cta={{ href: signIn, label: "Sign in to WAiK" }}
      extraFooter={
        <p
          style={{
            color: "#94a3b8",
            fontSize: 12,
            margin: "8px 0 0",
            textAlign: "center" as const,
            lineHeight: 1.5,
            fontFamily: emailFont,
          }}
        >
          Questions?{" "}
          <a
            href="mailto:hello@waik.care"
            style={{ color: emailBrand.primary, textDecoration: "none", fontWeight: 500 }}
          >
            hello@waik.care
          </a>
        </p>
      }
    >
      <h1
        style={{
          color: emailBrand.foreground,
          fontSize: 20,
          fontWeight: 600,
          lineHeight: 1.3,
          margin: "0 0 8px",
          fontFamily: emailFont,
        }}
      >
        Your administrator account is ready
      </h1>
      <p
        style={{
          color: emailBrand.muted,
          fontSize: 13,
          lineHeight: 1.4,
          margin: "0 0 20px",
          fontFamily: emailFont,
        }}
      >
        Voice-first compliance for your community
      </p>
      <p
        style={{
          color: "#334155",
          fontSize: 16,
          lineHeight: 1.65,
          margin: "0 0 12px",
          fontFamily: emailFont,
        }}
      >
        Hi {firstName},
      </p>
      <p
        style={{
          color: "#334155",
          fontSize: 16,
          lineHeight: 1.65,
          margin: "0 0 22px",
          fontFamily: emailFont,
        }}
      >
        You are set up as the administrator for{" "}
        <strong style={{ color: emailBrand.foreground, fontWeight: 600 }}>{facilityName}</strong>. WAiK is a
        voice-first documentation platform: your team reports incidents in conversation; WAiK structures the
        work for a fast, thorough, audit-ready record.
      </p>

      <EmailCredentialPanel>
        <p
          style={{
            color: emailBrand.primary,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            margin: "0 0 10px",
            fontFamily: emailFont,
          }}
        >
          Your login credentials
        </p>
        <p
          style={{
            color: "#334155",
            fontSize: 15,
            margin: "0 0 6px",
            lineHeight: 1.5,
            fontFamily: emailFont,
          }}
        >
          <span style={{ color: emailBrand.muted, fontSize: 13, marginRight: 6 }}>Email</span>
          <br />
          <span style={{ fontWeight: 500, color: emailBrand.foreground }}>{email}</span>
        </p>
        <p
          style={{
            color: "#334155",
            fontSize: 15,
            margin: "10px 0 0",
            lineHeight: 1.5,
            fontFamily: emailFont,
          }}
        >
          <span style={{ color: emailBrand.muted, fontSize: 13, marginRight: 6 }}>Temporary password</span>
          <br />
          <code
            style={{
              display: "inline-block",
              marginTop: 4,
              backgroundColor: "rgba(13, 115, 119, 0.08)",
              color: emailBrand.primaryDeep,
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace",
              fontWeight: 600,
            }}
          >
            {tempPassword}
          </code>
        </p>
      </EmailCredentialPanel>

      <EmailNotePanel>
        <p
          style={{
            color: "#a16207",
            fontSize: 14,
            margin: 0,
            lineHeight: 1.55,
            fontFamily: emailFont,
          }}
        >
          <strong>Important:</strong> you will be asked to set a new password the first time you sign in.
        </p>
      </EmailNotePanel>
    </WaikEmailPage>
  )
}
