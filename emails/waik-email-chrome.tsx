import * as React from "react"
import { emailBrand, emailFont, getEmailAppBaseUrl } from "./email-assets"

/**
 * Table + bgcolor: Outlook and many webmail clients ignore gradients on <a>, which made the
 * button look missing. Solid fill + block link is the reliable pattern.
 */
function CtaPillButton({ href, label }: { href: string; label: string }) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      align="center"
            style={{ margin: "20px auto 0", borderCollapse: "separate" as const }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              backgroundColor: emailBrand.primary,
              borderRadius: 12,
            }}
          >
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                padding: "14px 32px",
                lineHeight: "20px",
                fontFamily: emailFont,
                borderRadius: 12,
              }}
            >
              {label}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

type WaikEmailPageProps = {
  headTitle: string
  children: React.ReactNode
  cta?: { href: string; label: string }
  secondaryLink?: { href: string; label: string }
  extraFooter?: React.ReactNode
}

/**
 * Table-based shell: rounded card, gradient header (TabsList-style), wordmark, pill CTA.
 */
function TextWordmark() {
  return (
    <span
      style={{
        fontSize: 28,
        fontWeight: 700,
        color: emailBrand.primary,
        letterSpacing: "0.04em",
        lineHeight: 1.2,
        fontFamily: emailFont,
      }}
    >
      WAiK
    </span>
  )
}

export function WaikEmailPage({ headTitle, children, cta, secondaryLink, extraFooter }: WaikEmailPageProps) {
  const base = getEmailAppBaseUrl()
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{headTitle}</title>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#f1f5f9",
          fontFamily: emailFont,
          WebkitTextSizeAdjust: "100%",
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: "#f1f5f9" }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "32px 16px" }}>
                <table
                  role="presentation"
                  width="560"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    maxWidth: 560,
                    width: "100%",
                    backgroundColor: "#ffffff",
                    border: `1px solid ${emailBrand.border}`,
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.03)",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          background: emailBrand.shellGradient,
                          borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
                          padding: "22px 24px 20px",
                          textAlign: "center" as const,
                        }}
                      >
                        <a
                          href={base}
                          style={{ textDecoration: "none", display: "inline-block" }}
                        >
                          <TextWordmark />
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "32px 28px 24px" }}>
                        {children}
                        {cta ? <CtaPillButton href={cta.href} label={cta.label} /> : null}
                        {secondaryLink ? (
                          <p style={{ textAlign: "center" as const, margin: "20px 0 0" }}>
                            <a
                              href={secondaryLink.href}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: emailBrand.primary,
                                fontSize: 13,
                                textDecoration: "none",
                                fontWeight: 500,
                                fontFamily: emailFont,
                              }}
                            >
                              {secondaryLink.label}
                            </a>
                          </p>
                        ) : null}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          borderTop: "1px solid rgba(15, 23, 42, 0.06)",
                          background: "linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)",
                          padding: "20px 24px 24px",
                        }}
                      >
                        <p
                          style={{
                            color: emailBrand.muted,
                            fontSize: 12,
                            margin: "0 0 6px",
                            textAlign: "center" as const,
                            lineHeight: 1.5,
                            fontFamily: emailFont,
                          }}
                        >
                          WAiK — Conversations not Checkboxes
                        </p>
                        {extraFooter}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}

type PanelProps = { children: React.ReactNode }

export function EmailCredentialPanel({ children }: PanelProps) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        marginBottom: 16,
        border: `1px solid ${emailBrand.borderStrong}`,
        borderRadius: 14,
        background: emailBrand.panelGradient,
        overflow: "hidden",
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "16px 18px" }}>{children}</td>
        </tr>
      </tbody>
    </table>
  )
}

export function EmailNotePanel({ children }: PanelProps) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        marginBottom: 24,
        border: `1px solid ${emailBrand.noteBorder}`,
        borderRadius: 14,
        backgroundColor: emailBrand.noteBg,
        overflow: "hidden",
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "12px 16px" }}>{children}</td>
        </tr>
      </tbody>
    </table>
  )
}
