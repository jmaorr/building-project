/**
 * Resend Email Service
 * 
 * This module handles sending emails via Resend API.
 * 
 * Setup:
 * 1. Create a Resend account at https://resend.com
 * 2. Add your API key to environment variables as RESEND_API_KEY
 * 3. Verify your sending domain (or use onboarding@resend.dev for testing)
 */

const RESEND_API_URL = "https://api.resend.com/emails";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Get the from address based on environment
 */
function getFromAddress(): string {
  // Use verified domain in production, or Resend's test domain for development
  const defaultFrom = process.env.RESEND_FROM_EMAIL || "Optimii <onboarding@resend.dev>";
  return defaultFrom;
}

/**
 * Send an email via Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured - email not sent");
    // In development, log the email instead of failing
    if (process.env.NODE_ENV === "development") {
      console.log("=== EMAIL WOULD BE SENT ===");
      console.log("To:", options.to);
      console.log("Subject:", options.subject);
      console.log("HTML:", options.html.substring(0, 200) + "...");
      console.log("===========================");
      return { success: true, id: "dev-mock-id" };
    }
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from || getFromAddress(),
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Resend API error:", response.status, errorData);
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}` 
      };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Error sending email:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Send a batch of emails
 */
export async function sendBatchEmails(
  emails: SendEmailOptions[]
): Promise<SendEmailResult[]> {
  return Promise.all(emails.map(sendEmail));
}




