import * as React from "react"

export interface WelcomeStaffEmailProps {
  firstName: string
  facilityName: string
  inviterName: string
  inviterRole: string
  email: string
  tempPassword: string
}

const teal = "#0D7377"
const darkTeal = "#0A3D40"
const amberBg = "#FEF3C7"

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  )
}

export function WelcomeStaffEmail({
  firstName,
  facilityName,
  inviterName,
  inviterRole,
  email,
  tempPassword,
}: WelcomeStaffEmailProps) {
  const base = appUrl().replace(/\/$/, "")
  const signIn = `${base}/sign-in`
  const acceptInvite = `${base}/accept-invite?facility=${encodeURIComponent(facilityName)}`

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f4f4f5", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f4f4f5" }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 12px" }}>
                <table role="presentation" width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: 600, width: "100%" }}>
                  <tbody>
                    <tr>
                      <td
                        style={{
                          backgroundColor: teal,
                          padding: "20px 24px",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            color: "#ffffff",
                            fontSize: 28,
                            fontWeight: 700,
                            letterSpacing: "0.02em",
                          }}
                        >
                          WAiK
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ backgroundColor: "#ffffff", padding: "32px 28px" }}>
                        <h1
                          style={{
                            color: darkTeal,
                            fontSize: 22,
                            fontWeight: 700,
                            margin: "0 0 16px",
                          }}
                        >
                          You have been invited to WAiK
                        </h1>
                        <p style={{ color: "#374151", fontSize: 16, lineHeight: 1.6, margin: "0 0 12px" }}>Hi {firstName},</p>
                        <p style={{ color: "#374151", fontSize: 16, lineHeight: 1.6, margin: "0 0 20px" }}>
                          <strong>{inviterName}</strong> ({inviterRole}) at <strong>{facilityName}</strong> has set up your WAiK
                          account. WAiK helps you document incidents by voice — speak naturally about what happened and WAiK
                          guides you through the rest.
                        </p>
                        <table
                          role="presentation"
                          width="100%"
                          style={{
                            backgroundColor: "#f0fdfa",
                            border: `1px solid ${teal}`,
                            borderRadius: 8,
                            marginBottom: 16,
                          }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ padding: 16 }}>
                                <p style={{ color: darkTeal, fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>
                                  Your login credentials
                                </p>
                                <p style={{ color: "#374151", fontSize: 14, margin: "4px 0" }}>
                                  <strong>Email:</strong> {email}
                                </p>
                                <p style={{ color: "#374151", fontSize: 14, margin: "4px 0" }}>
                                  <strong>Temporary Password:</strong> {tempPassword}
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table role="presentation" width="100%" style={{ backgroundColor: amberBg, borderRadius: 8, marginBottom: 24 }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: 14 }}>
                                <p style={{ color: "#92400e", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                                  <strong>Note:</strong> You will be asked to change your password when you first sign in.
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table role="presentation" width="100%">
                          <tbody>
                            <tr>
                              <td align="center">
                                <a
                                  href={signIn}
                                  style={{
                                    display: "inline-block",
                                    backgroundColor: teal,
                                    color: "#ffffff",
                                    fontSize: 16,
                                    fontWeight: 700,
                                    textDecoration: "none",
                                    padding: "14px 28px",
                                    borderRadius: 6,
                                    width: "100%",
                                    textAlign: "center",
                                    boxSizing: "border-box",
                                  }}
                                >
                                  Sign in to WAiK
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p style={{ color: "#6b7280", fontSize: 13, margin: "20px 0 8px", textAlign: "center" }}>
                          <a href={acceptInvite} style={{ color: teal }}>
                            What is WAiK? Open your welcome page
                          </a>
                        </p>
                        <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "28px 0" }} />
                        <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 6px", textAlign: "center" }}>
                          WAiK — Conversations not Checkboxes
                        </p>
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
