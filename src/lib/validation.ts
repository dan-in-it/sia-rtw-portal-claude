import { z } from 'zod';

// User validation schemas
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const userCreateSchema = z.object({
  email: emailSchema,
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  password: passwordSchema,
  role: z.enum(['MEMBER', 'LIAISON', 'LEGAL', 'ADMIN'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
  department: z.string().optional(),
});

export const userUpdateSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  department: z.string().optional(),
  role: z.enum(['MEMBER', 'LIAISON', 'LEGAL', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Post validation schemas
export const postCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  content: z
    .string()
    .min(1, 'Content is required')
    .min(10, 'Content must be at least 10 characters')
    .max(10000, 'Content must be less than 10,000 characters'),
  categoryId: z.string().uuid('Invalid category'),
  isPrivate: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

export const postUpdateSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .max(10000, 'Content must be less than 10,000 characters')
    .optional(),
  isResolved: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  approvedForTraining: z.boolean().optional(),
});

// Reply validation schemas
export const replyCreateSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
  content: z
    .string()
    .min(1, 'Content is required')
    .min(2, 'Reply must be at least 2 characters')
    .max(5000, 'Reply must be less than 5,000 characters'),
  parentReplyId: z.string().uuid().optional(),
});

export const replyUpdateSchema = z.object({
  content: z
    .string()
    .min(2, 'Reply must be at least 2 characters')
    .max(5000, 'Reply must be less than 5,000 characters'),
  isHelpful: z.boolean().optional(),
});

// Escalation validation schemas
export const escalationCreateSchema = z.object({
  postId: z.string().uuid().optional(),
  escalationType: z.enum(['LIAISON', 'LEGAL'], {
    errorMap: () => ({ message: 'Invalid escalation type' }),
  }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
    errorMap: () => ({ message: 'Invalid priority level' }),
  }),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5,000 characters'),
});

export const escalationUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  assignedToId: z.string().uuid().optional(),
  resolution: z.string().max(5000, 'Resolution must be less than 5,000 characters').optional(),
});

// Chatbot validation schemas
export const chatbotMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(2000, 'Message must be less than 2,000 characters'),
});

// Training document validation schemas
export const trainingDocumentCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  content: z
    .string()
    .min(1, 'Content is required')
    .min(10, 'Content must be at least 10 characters'),
  documentType: z.enum(['COMPLIANCE', 'QA', 'JOB_DESC', 'BRIDGE', 'FORUM_POST'], {
    errorMap: () => ({ message: 'Invalid document type' }),
  }),
  sourcePostId: z.string().uuid().optional(),
});

// Category validation schemas
export const categoryCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  icon: z.string().max(10, 'Icon must be less than 10 characters').optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Tag validation schemas
export const tagCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Tag can only contain letters, numbers, hyphens, and underscores'),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color')
    .optional(),
});

// Query parameter validation
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 20))
    .pipe(z.number().int().min(1).max(100)),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  categoryId: z.string().uuid().optional(),
  isResolved: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.any().refine(
    (file) => {
      if (!(file instanceof File)) return false;
      return file.size <= 10 * 1024 * 1024; // 10MB
    },
    { message: 'File size must be less than 10MB' }
  ),
  type: z.enum(['document', 'image']),
});

// Utility validation functions
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

export function validateUUID(id: string): boolean {
  return z.string().uuid().safeParse(id).success;
}

// Password strength checker
export function getPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score++;

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Include uppercase letters');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Include lowercase letters');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Include special characters');

  return { score, feedback };
}

// Sanitization functions
export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}
