import * as React from "react"
import { emailBrand, emailFont } from "./email-assets"
import { EmailNotePanel, WaikEmailPage } from "./waik-email-chrome"

export interface Phase1ReportEmailProps {
  recipientName?: string
  facilityName: string
  residentName: string
  incidentType: string
  signedAt: string
  reportUrl: string
  senderName?: string
}

export function Phase1ReportEmail({
  recipientName,
  facilityName,
  residentName,
  incidentType,
  signedAt,
  reportUrl,
  senderName,
}: Phase1ReportEmailProps) {
  const greeting = recipientName?.trim() ? `Hi ${recipientName.trim()},` : "Hello,"

  return (
    <WaikEmailPage
      headTitle="Your signed Phase 1 clinical report"
      cta={{ href: reportUrl, label: "View signed report" }}
      extraFooter={
        <p
          style={{
            color: emailBrand.muted,
            fontSize: 11,
            margin: 0,
            textAlign: "center" as const,
            lineHeight: 1.5,
            fontFamily: emailFont,
          }}
        >
          Confidential incident record — handle per your facility&apos;s privacy and HIPAA policies.
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
        Signed Phase 1 clinical report
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
        {facilityName}
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
        {greeting}
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
        {senderName ? (
          <>
            <strong style={{ color: emailBrand.foreground, fontWeight: 600 }}>{senderName}</strong> shared a
            signed Phase 1 incident report with you.
          </>
        ) : (
          <>A signed Phase 1 incident report is ready for your review.</>
        )}
      </p>

      <EmailNotePanel>
        <p
          style={{
            color: "#334155",
            fontSize: 14,
            margin: "0 0 8px",
            lineHeight: 1.55,
            fontFamily: emailFont,
          }}
        >
          <strong style={{ color: emailBrand.foreground }}>Resident:</strong> {residentName}
        </p>
        <p
          style={{
            color: "#334155",
            fontSize: 14,
            margin: "0 0 8px",
            lineHeight: 1.55,
            fontFamily: emailFont,
          }}
        >
          <strong style={{ color: emailBrand.foreground }}>Incident type:</strong> {incidentType}
        </p>
        <p
          style={{
            color: "#334155",
            fontSize: 14,
            margin: 0,
            lineHeight: 1.55,
            fontFamily: emailFont,
          }}
        >
          <strong style={{ color: emailBrand.foreground }}>Signed:</strong> {signedAt}
        </p>
      </EmailNotePanel>

      <p
        style={{
          color: "#334155",
          fontSize: 15,
          lineHeight: 1.65,
          margin: 0,
          fontFamily: emailFont,
        }}
      >
        Open the report online to review the clinical summary, recommendations, narrative, and signature.
      </p>
    </WaikEmailPage>
  )
}
