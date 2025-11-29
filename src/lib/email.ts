import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@sia-rtw.com',
      ...options,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

// Email templates

export function escalationNotificationEmail(params: {
  recipientName: string;
  requesterName: string;
  escalationType: string;
  priority: string;
  description: string;
  escalationUrl: string;
}) {
  return {
    subject: `New ${params.escalationType} Escalation - ${params.priority} Priority`,
    html: `
      <h2>New Escalation Request</h2>
      <p>Hello ${params.recipientName},</p>
      <p>A new escalation has been assigned to you.</p>

      <h3>Details:</h3>
      <ul>
        <li><strong>From:</strong> ${params.requesterName}</li>
        <li><strong>Type:</strong> ${params.escalationType}</li>
        <li><strong>Priority:</strong> ${params.priority}</li>
      </ul>

      <h3>Description:</h3>
      <p>${params.description}</p>

      <p>
        <a href="${params.escalationUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Escalation
        </a>
      </p>

      <p>Please respond as soon as possible.</p>

      <p>Best regards,<br>SIA RTW Portal</p>
    `,
    text: `
New Escalation Request

Hello ${params.recipientName},

A new escalation has been assigned to you.

Details:
- From: ${params.requesterName}
- Type: ${params.escalationType}
- Priority: ${params.priority}

Description:
${params.description}

View escalation: ${params.escalationUrl}

Please respond as soon as possible.

Best regards,
SIA RTW Portal
    `,
  };
}

export function escalationResolvedEmail(params: {
  recipientName: string;
  resolverName: string;
  resolution: string;
  escalationUrl: string;
}) {
  return {
    subject: 'Your Escalation Has Been Resolved',
    html: `
      <h2>Escalation Resolved</h2>
      <p>Hello ${params.recipientName},</p>
      <p>Your escalation has been resolved by ${params.resolverName}.</p>

      <h3>Resolution:</h3>
      <p>${params.resolution}</p>

      <p>
        <a href="${params.escalationUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Details
        </a>
      </p>

      <p>If you have any further questions, please don't hesitate to reach out.</p>

      <p>Best regards,<br>SIA RTW Portal</p>
    `,
    text: `
Escalation Resolved

Hello ${params.recipientName},

Your escalation has been resolved by ${params.resolverName}.

Resolution:
${params.resolution}

View details: ${params.escalationUrl}

If you have any further questions, please don't hesitate to reach out.

Best regards,
SIA RTW Portal
    `,
  };
}

export function newPostNotificationEmail(params: {
  recipientName: string;
  postTitle: string;
  authorName: string;
  category: string;
  postUrl: string;
}) {
  return {
    subject: `New Forum Post: ${params.postTitle}`,
    html: `
      <h2>New Forum Post</h2>
      <p>Hello ${params.recipientName},</p>
      <p>A new post has been created in the ${params.category} category.</p>

      <h3>${params.postTitle}</h3>
      <p><strong>Author:</strong> ${params.authorName}</p>

      <p>
        <a href="${params.postUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Post
        </a>
      </p>

      <p>Best regards,<br>SIA RTW Portal</p>
    `,
    text: `
New Forum Post

Hello ${params.recipientName},

A new post has been created in the ${params.category} category.

Title: ${params.postTitle}
Author: ${params.authorName}

View post: ${params.postUrl}

Best regards,
SIA RTW Portal
    `,
  };
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
) {
  const emailContent = {
    subject: 'Password Reset Request - SIA RTW Portal',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">Password Reset Request</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px;">
            <p>Hello ${name},</p>

            <p>We received a request to reset your password for your SIA RTW Portal account.</p>

            <p>Click the button below to reset your password:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
            </p>

            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
              </p>
            </div>

            <p style="color: #666; font-size: 14px;">
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

            <p style="color: #666; font-size: 12px; text-align: center;">
              This is an automated message from SIA RTW Portal.<br>
              Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Password Reset Request - SIA RTW Portal

Hello ${name},

We received a request to reset your password for your SIA RTW Portal account.

To reset your password, visit the following link:
${resetUrl}

Important: This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

Best regards,
SIA RTW Portal

---
This is an automated message. Please do not reply to this email.
    `,
  };

  return await sendEmail({
    to: email,
    ...emailContent,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  temporaryPassword: string
) {
  const emailContent = {
    subject: 'Welcome to SIA RTW Portal',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">Welcome to SIA RTW Portal</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px;">
            <p>Hello ${name},</p>

            <p>Your account has been created for the SIA Return to Work Member Forum Portal.</p>

            <h3 style="color: #2563eb;">Your Login Credentials:</h3>
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #f1f1f1; padding: 2px 6px; border-radius: 3px;">${temporaryPassword}</code></p>
            </div>

            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Important:</strong> You will be required to change your password on first login.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/login"
                 style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Login Now
              </a>
            </div>

            <h3 style="color: #2563eb;">Portal Features:</h3>
            <ul style="color: #666;">
              <li>Access discussion forum for RTW questions</li>
              <li>Get instant help from AI chatbot</li>
              <li>Escalate complex cases to experts</li>
              <li>Collaborate with other SD members</li>
            </ul>

            <p style="color: #666; font-size: 14px;">
              If you have any questions or need assistance, please contact your administrator.
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

            <p style="color: #666; font-size: 12px; text-align: center;">
              This is an automated message from SIA RTW Portal.<br>
              Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to SIA RTW Portal

Hello ${name},

Your account has been created for the SIA Return to Work Member Forum Portal.

Your Login Credentials:
Email: ${email}
Temporary Password: ${temporaryPassword}

Important: You will be required to change your password on first login.

Login at: ${process.env.NEXTAUTH_URL}/login

Portal Features:
- Access discussion forum for RTW questions
- Get instant help from AI chatbot
- Escalate complex cases to experts
- Collaborate with other SD members

If you have any questions or need assistance, please contact your administrator.

Best regards,
SIA RTW Portal

---
This is an automated message. Please do not reply to this email.
    `,
  };

  return await sendEmail({
    to: email,
    ...emailContent,
  });
}
