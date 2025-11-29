import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/middleware';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(['MEMBER', 'LIAISON', 'LEGAL', 'ADMIN']),
  department: z.string().optional(),
});

// GET /api/admin/users - List all users (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return apiError('Unauthorized', 401);
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    return apiResponse({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return apiError('Internal server error', 500);
  }
}

// POST /api/admin/users - Create a new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return apiError('Invalid input', 400);
    }

    const { email, fullName, role, department } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return apiError('User with this email already exists', 400);
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        role: role as UserRole,
        department,
        passwordHash,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    // TODO: Send email with temporary password
    // For now, return the password in the response (in production, send via email)

    return apiResponse({
      user,
      tempPassword, // Remove this in production
      message: 'User created successfully. Password has been sent via email.'
    }, 201);
  } catch (error) {
    console.error('Error creating user:', error);
    return apiError('Internal server error', 500);
  }
}
