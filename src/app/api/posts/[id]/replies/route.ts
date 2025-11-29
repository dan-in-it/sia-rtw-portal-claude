import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/middleware';
import { z } from 'zod';

const createReplySchema = z.object({
  content: z.string().min(1).max(5000),
  parentReplyId: z.string().uuid().optional(),
});

// POST /api/posts/[id]/replies - Create a reply to a post
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const validation = createReplySchema.safeParse(body);

    if (!validation.success) {
      return apiError('Invalid input', 400);
    }

    const { content, parentReplyId } = validation.data;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return apiError('Post not found', 404);
    }

    // Create reply
    const reply = await prisma.reply.create({
      data: {
        postId: params.id,
        authorId: session.user.id,
        content,
        parentReplyId,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    return apiResponse(reply, 201);
  } catch (error) {
    console.error('Error creating reply:', error);
    return apiError('Internal server error', 500);
  }
}
