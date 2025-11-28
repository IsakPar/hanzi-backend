/**
 * Email Service using Resend
 * 
 * Sends transactional emails for:
 * - Email verification
 * - Password reset
 * 
 * Uses PolymasterLabs brand styling
 */

// Color palette matching the website
const COLORS = {
  ink: '#0A0A0A',
  inkLight: '#1A1A1A',
  paper: '#F5F0E6',
  paperDark: '#E8E0D0',
  vermillion: '#E23D28',
  jade: '#00A878',
  gold: '#D4AF37',
  textMuted: '#6B6760',
};

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface ResendResponse {
  id?: string;
  error?: { message: string };
}

/**
 * Send email via Resend API
 */
export async function sendEmail(
  apiKey: string,
  params: SendEmailParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HanziMaster <auth@polymasterlabs.com>',
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    const data: ResendResponse = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Failed to send email' };
    }

    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Base email template with PolymasterLabs styling
 */
function baseTemplate(content: string, preheader: string = ''): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HanziMaster</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.ink}; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>
  
  <!-- Email Container -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.ink};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Content Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: ${COLORS.inkLight}; border-radius: 12px;">
          <tr>
            <td style="padding: 48px 40px;">
              ${content}
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px;">
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">
                © 2025 PolymasterLabs Inc.
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

/**
 * Email Verification Template
 */
export function verificationEmailTemplate(params: {
  name: string;
  verificationUrl: string;
}): string {
  const content = `
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: ${COLORS.vermillion}; border-radius: 12px; line-height: 64px; text-align: center;">
        <span style="color: ${COLORS.paper}; font-size: 32px; font-weight: bold;">汉</span>
      </div>
    </div>
    
    <!-- Title -->
    <h1 style="margin: 0 0 8px 0; color: ${COLORS.paper}; font-size: 24px; font-weight: 600; text-align: center; font-family: 'Playfair Display', Georgia, serif;">
      Verify Your Email
    </h1>
    
    <!-- Subtitle -->
    <p style="margin: 0 0 32px 0; color: ${COLORS.textMuted}; font-size: 14px; text-align: center;">
      Welcome to HanziMaster, ${params.name}
    </p>
    
    <!-- Divider -->
    <div style="height: 1px; background: linear-gradient(to right, transparent, ${COLORS.vermillion}40, transparent); margin: 0 0 32px 0;"></div>
    
    <!-- Message -->
    <p style="margin: 0 0 24px 0; color: ${COLORS.paper}; font-size: 15px; line-height: 1.6; text-align: center;">
      Click the button below to verify your email address and activate your account.
    </p>
    
    <!-- Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.verificationUrl}" 
         style="display: inline-block; padding: 16px 40px; background-color: ${COLORS.vermillion}; color: ${COLORS.paper}; text-decoration: none; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; border-radius: 4px;">
        Verify Email
      </a>
    </div>
    
    <!-- Alternative Link -->
    <p style="margin: 32px 0 0 0; color: ${COLORS.textMuted}; font-size: 12px; text-align: center;">
      Or copy this link:
    </p>
    <p style="margin: 8px 0 0 0; color: ${COLORS.gold}; font-size: 11px; text-align: center; word-break: break-all;">
      ${params.verificationUrl}
    </p>
    
    <!-- Expiry Notice -->
    <p style="margin: 24px 0 0 0; color: ${COLORS.textMuted}; font-size: 11px; text-align: center;">
      This link expires in 24 hours
    </p>
  `;

  return baseTemplate(content, `Verify your HanziMaster account, ${params.name}`);
}

/**
 * Password Reset Email Template
 */
export function passwordResetEmailTemplate(params: {
  name: string;
  resetUrl: string;
}): string {
  const content = `
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: ${COLORS.gold}; border-radius: 12px; line-height: 64px; text-align: center;">
        <span style="color: ${COLORS.ink}; font-size: 32px; font-weight: bold;">密</span>
      </div>
    </div>
    
    <!-- Title -->
    <h1 style="margin: 0 0 8px 0; color: ${COLORS.paper}; font-size: 24px; font-weight: 600; text-align: center; font-family: 'Playfair Display', Georgia, serif;">
      Reset Your Password
    </h1>
    
    <!-- Subtitle -->
    <p style="margin: 0 0 32px 0; color: ${COLORS.textMuted}; font-size: 14px; text-align: center;">
      Password recovery for ${params.name}
    </p>
    
    <!-- Divider -->
    <div style="height: 1px; background: linear-gradient(to right, transparent, ${COLORS.gold}40, transparent); margin: 0 0 32px 0;"></div>
    
    <!-- Message -->
    <p style="margin: 0 0 24px 0; color: ${COLORS.paper}; font-size: 15px; line-height: 1.6; text-align: center;">
      We received a request to reset your password. Click the button below to create a new one.
    </p>
    
    <!-- Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.resetUrl}" 
         style="display: inline-block; padding: 16px 40px; background-color: ${COLORS.gold}; color: ${COLORS.ink}; text-decoration: none; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; border-radius: 4px;">
        Reset Password
      </a>
    </div>
    
    <!-- Alternative Link -->
    <p style="margin: 32px 0 0 0; color: ${COLORS.textMuted}; font-size: 12px; text-align: center;">
      Or copy this link:
    </p>
    <p style="margin: 8px 0 0 0; color: ${COLORS.gold}; font-size: 11px; text-align: center; word-break: break-all;">
      ${params.resetUrl}
    </p>
    
    <!-- Expiry Notice -->
    <p style="margin: 24px 0 0 0; color: ${COLORS.textMuted}; font-size: 11px; text-align: center;">
      This link expires in 1 hour
    </p>
    
    <!-- Security Notice -->
    <div style="margin: 32px 0 0 0; padding: 16px; background-color: ${COLORS.ink}; border-radius: 8px; border-left: 3px solid ${COLORS.vermillion};">
      <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 12px; line-height: 1.5;">
        <strong style="color: ${COLORS.paper};">Didn't request this?</strong><br>
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    </div>
  `;

  return baseTemplate(content, `Reset your HanziMaster password`);
}

/**
 * Welcome Email Template (after verification)
 */
export function welcomeEmailTemplate(params: {
  name: string;
  loginUrl: string;
}): string {
  const content = `
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: ${COLORS.jade}; border-radius: 12px; line-height: 64px; text-align: center;">
        <span style="color: ${COLORS.paper}; font-size: 32px; font-weight: bold;">✓</span>
      </div>
    </div>
    
    <!-- Title -->
    <h1 style="margin: 0 0 8px 0; color: ${COLORS.paper}; font-size: 24px; font-weight: 600; text-align: center; font-family: 'Playfair Display', Georgia, serif;">
      Welcome, ${params.name}!
    </h1>
    
    <!-- Subtitle -->
    <p style="margin: 0 0 32px 0; color: ${COLORS.jade}; font-size: 14px; text-align: center;">
      Your account is now verified
    </p>
    
    <!-- Divider -->
    <div style="height: 1px; background: linear-gradient(to right, transparent, ${COLORS.jade}40, transparent); margin: 0 0 32px 0;"></div>
    
    <!-- Message -->
    <p style="margin: 0 0 24px 0; color: ${COLORS.paper}; font-size: 15px; line-height: 1.6; text-align: center;">
      You now have full access to the HanziMaster admin portal. Start creating amazing Mandarin learning content.
    </p>
    
    <!-- Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.loginUrl}" 
         style="display: inline-block; padding: 16px 40px; background-color: ${COLORS.jade}; color: ${COLORS.paper}; text-decoration: none; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; border-radius: 4px;">
        Go to Portal
      </a>
    </div>
    
    <!-- Chinese Seal -->
    <div style="text-align: center; margin-top: 40px;">
      <div style="display: inline-block; width: 80px; height: 80px; border: 3px solid ${COLORS.jade}; border-radius: 50%; line-height: 74px; text-align: center;">
        <span style="color: ${COLORS.jade}; font-size: 36px; font-family: 'Playfair Display', Georgia, serif;">准</span>
      </div>
      <p style="margin: 12px 0 0 0; color: ${COLORS.jade}; font-size: 10px; text-transform: uppercase; letter-spacing: 3px;">
        Approved
      </p>
    </div>
  `;

  return baseTemplate(content, `Welcome to HanziMaster, ${params.name}!`);
}

