import { sendEmail } from "./resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const APP_NAME = "Optimii";

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

function getBaseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #5e6ad2;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #1a1a1a;
    }
    p {
      margin: 0 0 16px 0;
      color: #4a4a4a;
    }
    .button {
      display: inline-block;
      background: #5e6ad2;
      color: white !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
    }
    .button:hover {
      background: #4f5bc4;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
      font-size: 13px;
      color: #888;
    }
    .highlight {
      background: #f0f1ff;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
    .highlight-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      margin-bottom: 4px;
    }
    .highlight-value {
      font-weight: 600;
      color: #1a1a1a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">${APP_NAME}</div>
      ${content}
    </div>
  </div>
</body>
</html>
`;
}

// =============================================================================
// ORGANIZATION INVITE
// =============================================================================

export interface OrgInviteEmailOptions {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  inviteId: string;
}

export async function sendOrgInviteEmail(options: OrgInviteEmailOptions) {
  const inviteUrl = `${APP_URL}/invites`;
  const roleLabel = options.role === "admin" ? "Admin" : "Member";
  
  const content = `
    <h1>You're invited to join ${options.orgName}</h1>
    <p><strong>${options.inviterName}</strong> has invited you to join their organization on ${APP_NAME}.</p>
    
    <div class="highlight">
      <div class="highlight-label">Your Role</div>
      <div class="highlight-value">${roleLabel}</div>
    </div>
    
    <p>Click the button below to accept your invitation and get started.</p>
    
    <a href="${inviteUrl}" class="button">Accept Invitation</a>
    
    <div class="footer">
      <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
      <p>This invitation will expire in 7 days.</p>
    </div>
  `;

  return sendEmail({
    to: options.to,
    subject: `${options.inviterName} invited you to join ${options.orgName}`,
    html: getBaseTemplate(content),
    text: `${options.inviterName} invited you to join ${options.orgName} as a ${roleLabel}. Accept your invitation at: ${inviteUrl}`,
  });
}

// =============================================================================
// PROJECT SHARE INVITE
// =============================================================================

export interface ProjectShareEmailOptions {
  to: string;
  inviterName: string;
  projectName: string;
  permission: string;
}

export async function sendProjectShareEmail(options: ProjectShareEmailOptions) {
  const inviteUrl = `${APP_URL}/invites`;
  const permissionLabel = {
    admin: "Admin",
    editor: "Editor", 
    viewer: "Viewer",
  }[options.permission] || options.permission;
  
  const content = `
    <h1>You've been invited to a project</h1>
    <p><strong>${options.inviterName}</strong> has shared the project <strong>${options.projectName}</strong> with you on ${APP_NAME}.</p>
    
    <div class="highlight">
      <div class="highlight-label">Your Permission Level</div>
      <div class="highlight-value">${permissionLabel}</div>
    </div>
    
    <p>Click the button below to view the project.</p>
    
    <a href="${inviteUrl}" class="button">View Project</a>
    
    <div class="footer">
      <p>If you don't have an account yet, you'll be prompted to create one.</p>
    </div>
  `;

  return sendEmail({
    to: options.to,
    subject: `${options.inviterName} shared "${options.projectName}" with you`,
    html: getBaseTemplate(content),
    text: `${options.inviterName} shared the project "${options.projectName}" with you as ${permissionLabel}. View it at: ${inviteUrl}`,
  });
}

// =============================================================================
// PROJECT SHARE ACCEPTED NOTIFICATION
// =============================================================================

export interface ShareAcceptedEmailOptions {
  to: string;
  accepterName: string;
  projectName: string;
}

export async function sendShareAcceptedEmail(options: ShareAcceptedEmailOptions) {
  const projectUrl = `${APP_URL}/projects`;
  
  const content = `
    <h1>Project share accepted</h1>
    <p><strong>${options.accepterName}</strong> has accepted your invitation to collaborate on <strong>${options.projectName}</strong>.</p>
    
    <p>They can now access the project based on the permissions you granted.</p>
    
    <a href="${projectUrl}" class="button">View Project</a>
    
    <div class="footer">
      <p>You can manage project access in the project settings.</p>
    </div>
  `;

  return sendEmail({
    to: options.to,
    subject: `${options.accepterName} accepted your project share`,
    html: getBaseTemplate(content),
    text: `${options.accepterName} has accepted your invitation to collaborate on "${options.projectName}". View it at: ${projectUrl}`,
  });
}


