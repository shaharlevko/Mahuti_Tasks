const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter = null;

// Initialize transporter
function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('⚠️  Gmail credentials not configured. Email sending will be disabled.');
    console.warn('   Please add GMAIL_USER and GMAIL_APP_PASSWORD to your .env file');
    return null;
  }

  // Remove spaces from app password (common issue)
  const appPassword = process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '');

  transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: appPassword
    }
  });

  return transporter;
}

// Send invitation email
async function sendInvitationEmail(email, token, role, invitedByName) {
  const transport = getTransporter();

  if (!transport) {
    console.error('❌ Cannot send email: Email service not configured');
    throw new Error('Email service not configured');
  }

  const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Comic Sans MS', cursive, sans-serif;
          background-color: #FFF9F0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #FF6B9D;
          margin: 10px 0;
        }
        .content {
          color: #333;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #FFB5A7;
          color: #333;
          text-decoration: none;
          border-radius: 8px;
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background-color: #F4B8D4;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 12px;
        }
        .role-badge {
          display: inline-block;
          padding: 4px 12px;
          background-color: #C7ECDE;
          border-radius: 12px;
          font-weight: bold;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌻 Mahuti Tasks 🌻</h1>
          <p>Weekly Schedule Platform</p>
        </div>
        <div class="content">
          <h2>You're Invited!</h2>
          <p>Hi there,</p>
          <p>${invitedByName} has invited you to join <strong>Mahuti Tasks</strong>, the weekly schedule management platform for daycare staff.</p>
          <p>You've been invited as: <span class="role-badge">${role.toUpperCase()}</span></p>
          <p>Click the button below to create your account:</p>
          <div style="text-align: center;">
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </div>
          <p style="font-size: 12px; color: #666;">
            Or copy this link: <a href="${inviteUrl}">${inviteUrl}</a>
          </p>
          <p style="margin-top: 20px; padding: 12px; background-color: #FFF4E6; border-left: 3px solid #FFA500; border-radius: 4px;">
            <strong>Note:</strong> This invitation will expire in 30 days.
          </p>
        </div>
        <div class="footer">
          <p>This email was sent from Mahuti Tasks</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Mahuti Tasks - Invitation

Hi there,

${invitedByName} has invited you to join Mahuti Tasks, the weekly schedule management platform for daycare staff.

You've been invited as: ${role.toUpperCase()}

Click the link below to create your account:
${inviteUrl}

This invitation will expire in 30 days.

If you didn't expect this invitation, you can safely ignore this email.
  `;

  try {
    const info = await transport.sendMail({
      from: `"Mahuti Tasks" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '🌻 You\'re invited to Mahuti Tasks!',
      text: textContent,
      html: htmlContent
    });

    console.log('✓ Invitation email sent to:', email);
    return info;
  } catch (error) {
    console.error('❌ Failed to send invitation email:', error.message);
    throw error;
  }
}

// Test email configuration
async function testEmailConfiguration() {
  const transport = getTransporter();

  if (!transport) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    await transport.verify();
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendInvitationEmail,
  testEmailConfiguration
};
