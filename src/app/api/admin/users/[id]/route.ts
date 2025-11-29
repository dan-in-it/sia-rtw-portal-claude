import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/middleware';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(['MEMBER', 'LIAISON', 'LEGAL', 'ADMIN']).optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/admin/users/[id] - Update a user (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return apiError('Invalid input', 400);
    }

    const updateData = validation.data;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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

    return apiResponse({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return apiError('Internal server error', 500);
  }
}

// DELETE /api/admin/users/[id] - Delete a user (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return apiError('Unauthorized', 401);
    }

    // Prevent deleting yourself
    if (session.user.id === params.id) {
      return apiError('Cannot delete your own account', 400);
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return apiResponse({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return apiError('Internal server error', 500);
  }
}
