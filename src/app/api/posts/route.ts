import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiResponse, apiError, rateLimit } from '@/lib/middleware';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(10),
  categoryId: z.string().uuid(),
  isPrivate: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

// GET /api/posts - List posts with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const isResolved = searchParams.get('isResolved');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { isPrivate: false },
        { authorId: session.user.id },
      ],
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isResolved !== null) {
      where.isResolved = isResolved === 'true';
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
          category: true,
          _count: {
            select: {
              replies: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return apiResponse({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return apiError('Failed to fetch posts', 500);
  }
}

// POST /api/posts - Create new post
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    // Rate limiting
    const canProceed = await rateLimit(session.user.id, 10, 60000); // 10 posts per minute
    if (!canProceed) {
      return apiError('Too many requests', 429);
    }

    const body = await req.json();
    const validatedData = createPostSchema.parse(body);

    const post = await prisma.post.create({
      data: {
        title: validatedData.title,
        content: validatedData.content,
        categoryId: validatedData.categoryId,
        isPrivate: validatedData.isPrivate,
        authorId: session.user.id,
      },
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
        action: 'CREATE_POST',
        entityType: 'POST',
        entityId: post.id,
        metadata: { title: post.title },
      },
    });

    return apiResponse(post, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.errors[0].message, 400);
    }
    console.error('Error creating post:', error);
    return apiError('Failed to create post', 500);
  }
}
