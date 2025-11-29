import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { logger } from './logger';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400'), // 24 hours default
    updateAge: 60 * 15, // Update session every 15 minutes
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          logger.logSecurity('FAILED_LOGIN', {
            reason: 'Missing credentials',
            email: credentials?.email,
          });
          throw new Error('Invalid credentials');
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          logger.logSecurity('FAILED_LOGIN', {
            reason: 'User not found',
            email,
          });
          throw new Error('Invalid credentials');
        }

        if (!user.isActive) {
          logger.logSecurity('FAILED_LOGIN', {
            reason: 'Account inactive',
            email,
            userId: user.id,
          });
          throw new Error('Account is inactive. Please contact your administrator.');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          logger.logSecurity('FAILED_LOGIN', {
            reason: 'Invalid password',
            email,
            userId: user.id,
          });

          // Create audit log for failed login
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'FAILED_LOGIN_ATTEMPT',
              entityType: 'user',
              entityId: user.id,
            },
          });

          throw new Error('Invalid credentials');
        }

        // Update last login and create audit log
        await Promise.all([
          prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          }),
          prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'LOGIN_SUCCESS',
              entityType: 'user',
              entityId: user.id,
            },
          }),
        ]);

        logger.info('Successful login', {
          userId: user.id,
          email: user.email,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.iat = Math.floor(Date.now() / 1000); // Issued at time
      }

      // Add session rotation - create new token every 15 minutes
      const now = Math.floor(Date.now() / 1000);
      if (token.iat && now - (token.iat as number) > 15 * 60) {
        token.iat = now;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }

      // Verify user is still active
      if (token.id) {
        const user = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isActive: true },
        });

        if (!user || !user.isActive) {
          throw new Error('User account is no longer active');
        }
      }

      return session;
    },
    async signIn({ user }) {
      // Additional sign-in checks can be added here
      return true;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.id) {
        await prisma.auditLog.create({
          data: {
            userId: token.id as string,
            action: 'LOGOUT',
            entityType: 'user',
            entityId: token.id as string,
          },
        });

        logger.info('User logged out', {
          userId: token.id,
        });
      }
    },
  },
};

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper function to verify user has required role
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}
