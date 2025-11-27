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
