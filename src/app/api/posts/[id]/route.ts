import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/middleware';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const updatePostSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  content: z.string().min(10).optional(),
  isResolved: z.boolean().optional(),
  approvedForTraining: z.boolean().optional(),
});

// GET /api/posts/[id] - Get single post
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        category: true,
        replies: {
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!post) {
      return apiError('Post not found', 404);
    }

    // Check if user can view private posts
    if (post.isPrivate && post.authorId !== session.user.id) {
      return apiError('Forbidden', 403);
    }

    // Increment view count
    await prisma.post.update({
      where: { id: params.id },
      data: { viewCount: { increment: 1 } },
    });

    return apiResponse(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    return apiError('Failed to fetch post', 500);
  }
}

// PUT /api/posts/[id] - Update post
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return apiError('Post not found', 404);
    }

    // Check permissions
    const isAuthor = post.authorId === session.user.id;
    const isAdmin = [UserRole.ADMIN, UserRole.LIAISON, UserRole.LEGAL].includes(
      session.user.role
    );

    if (!isAuthor && !isAdmin) {
      return apiError('Forbidden', 403);
    }

    const body = await req.json();
    const validatedData = updatePostSchema.parse(body);

    // Only admins can approve for training
    if (validatedData.approvedForTraining !== undefined && !isAdmin) {
      delete validatedData.approvedForTraining;
    }

    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        category: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_POST',
        entityType: 'POST',
        entityId: params.id,
        metadata: validatedData,
      },
    });

    return apiResponse(updatedPost);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.errors[0].message, 400);
    }
    console.error('Error updating post:', error);
    return apiError('Failed to update post', 500);
  }
}

// DELETE /api/posts/[id] - Delete post
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return apiError('Post not found', 404);
    }

    // Check permissions
    const isAuthor = post.authorId === session.user.id;
    const isAdmin = session.user.role === UserRole.ADMIN;

    if (!isAuthor && !isAdmin) {
      return apiError('Forbidden', 403);
    }

    await prisma.post.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_POST',
        entityType: 'POST',
        entityId: params.id,
      },
    });

    return apiResponse({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return apiError('Failed to delete post', 500);
  }
}
