/**
 * Email Service - Resend integration with secure token generation
 */

import { Resend } from 'resend';

// ============================================================================
// SECURE TOKEN GENERATION
// ============================================================================

/**
 * Generate a secure unsubscribe token using HMAC-SHA256
 * Token format: base64url(email:timestamp:signature)
 */
export async function generateUnsubscribeToken(
  email: string,
  secret: string
): Promise<string> {
  const timestamp = Date.now().toString();
  const data = `${email}:${timestamp}`;
  
  // Create HMAC signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Combine and encode as base64url
  const token = btoa(`${data}:${signatureHex}`)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return token;
}

/**
 * Verify an unsubscribe token
 * Returns email if valid, null if invalid/expired
 */
export async function verifyUnsubscribeToken(
  token: string,
  secret: string,
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days default
): Promise<{ email: string } | null> {
  try {
    // Decode base64url
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const parts = decoded.split(':');
    
    if (parts.length !== 3) return null;
    
    const [email, timestampStr, providedSignature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    // Check expiration
    if (Date.now() - timestamp > maxAgeMs) {
      return null;
    }
    
    // Verify signature
    const data = `${email}:${timestampStr}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );
    
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison to prevent timing attacks
    if (providedSignature.length !== expectedHex.length) return null;
    
    let match = true;
    for (let i = 0; i < providedSignature.length; i++) {
      if (providedSignature[i] !== expectedHex[i]) match = false;
    }
    
    return match ? { email } : null;
  } catch {
    return null;
  }
}

// ============================================================================
// EMAIL SENDING
// ============================================================================

/**
 * Send waitlist confirmation email with unsubscribe link
 */
export async function sendWaitlistConfirmation(
  email: string,
  resendApiKey: string,
  unsubscribeSecret: string,
  websiteUrl: string = 'https://www.polymasterlabs.com'
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(resendApiKey);
    const unsubscribeToken = await generateUnsubscribeToken(email, unsubscribeSecret);
    const unsubscribeUrl = `${websiteUrl}/unsubscribe?token=${unsubscribeToken}`;
    
    const { error } = await resend.emails.send({
      from: 'PolymasterLabs <hello@waitlist.polymasterlabs.com>',
      to: email,
      subject: "You're on the list — PolymasterLabs",
      html: generateEmailHtml(unsubscribeUrl),
      text: generateEmailText(unsubscribeUrl),
    });
    
    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function generateEmailHtml(unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PolymasterLabs</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0A0A;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="width: 48px; height: 48px; background-color: #E23D28; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: #FAF9F6; font-size: 24px; font-weight: bold;">P</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color: #1A1A1A; border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.05);">
              
              <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 400; color: #F5F0E6; font-family: Georgia, serif;">
                You're on the list.
              </h1>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #6B6760; text-transform: uppercase; letter-spacing: 0.1em;">
                Welcome to PolymasterLabs
              </p>
              
              <div style="width: 60px; height: 2px; background: linear-gradient(90deg, #E23D28, #D4AF37, #00A878); margin-bottom: 24px;"></div>
              
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #A8A299;">
                Thank you for joining the waitlist. We're building the cognitive engine that powers language acquisition.
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #A8A299;">
                You'll be among the first to know when <span style="color: #F5F0E6; font-weight: 600;">HanziMaster</span> launches.
              </p>
              
              <p style="margin: 0; font-size: 14px; color: #6B6760; font-style: italic;">
                One system. Every language. True mastery.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #6B6760;">
                © 2025 PolymasterLabs Inc. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6B6760;">
                Received this by mistake? 
                <a href="${unsubscribeUrl}" style="color: #A8A299; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generateEmailText(unsubscribeUrl: string): string {
  return `
You're on the list.
Welcome to PolymasterLabs

Thank you for joining the waitlist. We're building the cognitive engine that powers language acquisition.

You'll be among the first to know when HanziMaster launches.

One system. Every language. True mastery.

---

© 2025 PolymasterLabs Inc. All rights reserved.

Received this by mistake? Unsubscribe: ${unsubscribeUrl}
  `.trim();
}

