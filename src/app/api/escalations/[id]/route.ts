import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/middleware';
import { z } from 'zod';
import { EscalationStatus } from '@prisma/client';

const updateEscalationSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  resolution: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
});

// GET /api/escalations/[id] - Get single escalation
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const escalation = await prisma.escalation.findUnique({
      where: { id: params.id },
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            content: true,
          },
        },
      },
    });

    if (!escalation) {
      return apiError('Escalation not found', 404);
    }

    return apiResponse(escalation);
  } catch (error) {
    console.error('Error fetching escalation:', error);
    return apiError('Internal server error', 500);
  }
}

// PUT /api/escalations/[id] - Update escalation
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const validation = updateEscalationSchema.safeParse(body);

    if (!validation.success) {
      return apiError('Invalid input', 400);
    }

    const updateData: any = validation.data;

    // If marking as resolved, set resolvedAt
    if (updateData.status === EscalationStatus.RESOLVED && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const escalation = await prisma.escalation.update({
      where: { id: params.id },
      data: updateData,
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return apiResponse(escalation);
  } catch (error) {
    console.error('Error updating escalation:', error);
    return apiError('Internal server error', 500);
  }
}
