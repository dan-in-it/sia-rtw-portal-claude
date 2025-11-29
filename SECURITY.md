# Security Documentation

## Overview

The SIA RTW Portal implements comprehensive security measures to protect user data and prevent common web vulnerabilities.

## Security Features

### 1. Authentication & Authorization

**Session Management:**
- JWT-based sessions with 24-hour expiration
- Automatic session rotation every 15 minutes
- Secure cookies (httpOnly, sameSite=strict)
- Session validation on every request

**Password Security:**
- Bcrypt hashing with 12 rounds
- Minimum 8 characters
- Requires uppercase, lowercase, and numbers
- Common password blacklist
- Password strength indicator

**Role-Based Access Control:**
```
ADMIN (3)  ─→  Full access
  ↓
LEGAL (2)  ─→  Legal counsel access
  ↓
LIAISON (1) ─→  RTW liaison access
  ↓
MEMBER (0) ─→  Basic member access
```

### 2. CSRF Protection

**Implementation:**
- Secure random token generation (32 bytes)
- Token stored in httpOnly cookie
- Token must be sent in `x-csrf-token` header
- Automatic verification on POST/PUT/DELETE requests
- Timing-safe comparison to prevent timing attacks

**Usage:**
```typescript
import { useCsrfToken, addCsrfToken } from '@/hooks';

const { token } = useCsrfToken();

fetch('/api/posts', {
  method: 'POST',
  headers: addCsrfToken({
    'Content-Type': 'application/json'
  }, token),
  body: JSON.stringify(data)
});
```

### 3. Security Headers

**Headers Applied:**

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer |
| `Content-Security-Policy` | (see below) | Prevent XSS/injection |
| `Permissions-Policy` | `camera=(), microphone=()...` | Disable unused features |

**Content Security Policy (CSP):**
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://api.anthropic.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

### 4. Rate Limiting

**Limits by Endpoint Type:**

| Type | Limit | Window |
|------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| Chatbot | 20 requests | 1 minute |
| File Upload | 10 requests | 1 hour |
| Strict | 10 requests | 1 minute |

**Implementation:**
```typescript
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const ip = getClientIdentifier(req);
  rateLimiters.auth(ip); // Throws RateLimitError if exceeded

  // ... proceed with request
}
```

### 5. Input Validation

**All inputs validated using Zod schemas:**

```typescript
import { postCreateSchema } from '@/lib/validation';

const data = postCreateSchema.parse(body);
// Throws ValidationError if invalid
```

**Validation Features:**
- Type checking
- Length limits
- Format validation (email, UUID, etc.)
- Pattern matching (regex)
- Custom validation rules
- Sanitization utilities

**Sanitization:**
```typescript
import { sanitizeInput, sanitizeHtml, sanitizeFilename } from '@/lib/security';

const clean = sanitizeInput(userInput); // Escapes HTML
const safeHtml = sanitizeHtml(content);  // Removes scripts
const safeName = sanitizeFilename(file.name); // Safe filename
```

### 6. Audit Logging

**All security events logged:**

| Event | Trigger |
|-------|---------|
| `LOGIN_SUCCESS` | Successful login |
| `FAILED_LOGIN_ATTEMPT` | Failed login |
| `LOGOUT` | User logout |
| `PASSWORD_RESET_REQUESTED` | Password reset request |
| `PASSWORD_RESET_COMPLETED` | Password changed |
| `UNAUTHORIZED_ACCESS` | Access without permission |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

**Audit Log Structure:**
```typescript
{
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: JSON;
  ipAddress?: string;
  createdAt: DateTime;
}
```

**Query Audit Logs:**
```sql
-- Recent failed login attempts
SELECT * FROM audit_logs
WHERE action = 'FAILED_LOGIN_ATTEMPT'
ORDER BY created_at DESC
LIMIT 10;

-- User activity
SELECT * FROM audit_logs
WHERE user_id = 'user-id'
ORDER BY created_at DESC;
```

### 7. Error Handling

**Error Classes:**
- `ValidationError` (400) - Invalid input
- `AuthenticationError` (401) - Not authenticated
- `AuthorizationError` (403) - Insufficient permissions
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Duplicate resource
- `RateLimitError` (429) - Too many requests
- `InternalServerError` (500) - Server error

**Safe Error Messages:**
```typescript
// ❌ BAD - Exposes internal details
throw new Error('User john@example.com not found');

// ✅ GOOD - Generic message
throw new AuthenticationError('Invalid credentials');
```

### 8. File Upload Security

**Validation:**
```typescript
import { validateFileUpload } from '@/lib/security';

const result = validateFileUpload(file, {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  allowedExtensions: ['.jpg', '.png', '.pdf']
});

if (!result.valid) {
  throw new ValidationError(result.error);
}
```

**Best Practices:**
- Size limits enforced
- MIME type validation
- Extension whitelist
- Filename sanitization
- Stored outside web root
- Virus scanning (recommended)

## API Security

### Secure API Route Example

```typescript
import { createApiHandler, parseBody } from '@/lib/api-helpers';
import { postCreateSchema } from '@/lib/validation';

export const POST = createApiHandler(
  async (req, { user }) => {
    // Parse and validate body
    const data = await parseBody(req, postCreateSchema);

    // Create post
    const post = await prisma.post.create({
      data: {
        ...data,
        authorId: user!.id,
      },
    });

    return successResponse(post, 201);
  },
  {
    requireAuth: true,        // Must be logged in
    requireRole: 'MEMBER',    // Minimum role required
    enableCsrf: true,          // CSRF protection
    rateLimit: 'api',          // Rate limiting
    enableAudit: true,         // Audit logging
    auditAction: 'POST_CREATED'
  }
);
```

### Protected Route Checklist

- [ ] Authentication required?
- [ ] Role-based authorization?
- [ ] CSRF protection enabled?
- [ ] Rate limiting applied?
- [ ] Input validation with Zod?
- [ ] Output sanitization?
- [ ] Audit logging enabled?
- [ ] Error handling implemented?
- [ ] Sensitive data filtered from responses?

## Database Security

### SQL Injection Prevention

**Using Prisma ORM:**
- Parameterized queries
- Automatic escaping
- Type-safe queries

```typescript
// ✅ SAFE - Prisma handles escaping
const user = await prisma.user.findUnique({
  where: { email: userInput }
});

// ❌ NEVER DO THIS
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = '${userInput}'
`;
```

### Sensitive Data Handling

**Password Hashing:**
```typescript
import { hashPassword } from '@/lib/auth';

const passwordHash = await hashPassword(plainPassword);
// Uses bcrypt with 12 rounds
```

**Data Filtering:**
```typescript
// ❌ BAD - Exposes password hash
return user;

// ✅ GOOD - Filter sensitive fields
const { passwordHash, ...safeUser } = user;
return safeUser;
```

## Common Vulnerabilities & Mitigations

### XSS (Cross-Site Scripting)

**Mitigations:**
- CSP headers
- Input sanitization
- Output encoding
- React auto-escaping

```typescript
// React automatically escapes
<div>{userInput}</div> // Safe

// Manual sanitization for HTML
import { sanitizeHtml } from '@/lib/security';
<div dangerouslySetInnerHTML={{
  __html: sanitizeHtml(content)
}} />
```

### CSRF (Cross-Site Request Forgery)

**Mitigations:**
- CSRF tokens on all mutations
- SameSite cookies
- Referer validation

### SQL Injection

**Mitigations:**
- Prisma ORM (parameterized queries)
- Input validation
- Never use raw queries with user input

### Clickjacking

**Mitigations:**
- `X-Frame-Options: DENY`
- CSP `frame-ancestors 'none'`

### Session Hijacking

**Mitigations:**
- Secure cookies
- HTTPS only
- Session rotation
- IP binding (optional)
- User agent validation (optional)

## Security Checklist

### Development
- [ ] Use HTTPS in development
- [ ] Never commit secrets
- [ ] Use environment variables
- [ ] Keep dependencies updated
- [ ] Run security audits: `npm audit`

### Deployment
- [ ] Enable HTTPS
- [ ] Set NEXTAUTH_SECRET
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review audit logs regularly

### Code Review
- [ ] Validate all inputs
- [ ] Sanitize all outputs
- [ ] Check authentication
- [ ] Verify authorization
- [ ] Handle errors properly
- [ ] Log security events
- [ ] No hardcoded secrets
- [ ] No SQL injection risks

## Incident Response

### Failed Login Attempts

```sql
-- Check failed logins
SELECT * FROM audit_logs
WHERE action = 'FAILED_LOGIN_ATTEMPT'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Suspicious Activity

```sql
-- Check unauthorized access attempts
SELECT * FROM audit_logs
WHERE action LIKE '%UNAUTHORIZED%'
ORDER BY created_at DESC
LIMIT 50;
```

### Reset User Session

```typescript
// Deactivate user account
await prisma.user.update({
  where: { id: userId },
  data: { isActive: false }
});

// Clear all sessions (user must re-login)
```

## Security Contacts

**Report Security Issues:**
1. Do NOT open public GitHub issues
2. Email: security@sia.gov
3. Include detailed description
4. Provide steps to reproduce

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Prisma Security](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)

---

**Last Updated**: November 2025
**Version**: 2.0
