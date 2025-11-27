import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/middleware';
import { sendEmail, escalationNotificationEmail } from '@/lib/email';
import { z } from 'zod';
import { EscalationType, EscalationPriority, UserRole } from '@prisma/client';

const createEscalationSchema = z.object({
  postId: z.string().uuid().optional(),
  escalationType: z.enum(['LIAISON', 'LEGAL']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  description: z.string().min(10),
});

// GET /api/escalations - List escalations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {};

    // Regular members only see their own escalations
    if (session.user.role === UserRole.MEMBER) {
      where.requesterId = session.user.id;
    }
    // Liaisons see escalations assigned to them or LIAISON type
    else if (session.user.role === UserRole.LIAISON) {
      where.OR = [
        { assignedToId: session.user.id },
        { escalationType: EscalationType.LIAISON },
      ];
    }
    // Legal counsel sees legal escalations
    else if (session.user.role === UserRole.LEGAL) {
      where.OR = [
        { assignedToId: session.user.id },
        { escalationType: EscalationType.LEGAL },
      ];
    }
    // Admins see all

    if (status) {
      where.status = status;
    }

    const [escalations, total] = await Promise.all([
      prisma.escalation.findMany({
        where,
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
          post: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.escalation.count({ where }),
    ]);

    return apiResponse({
      escalations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching escalations:', error);
    return apiError('Failed to fetch escalations', 500);
  }
}

// POST /api/escalations - Create new escalation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const validatedData = createEscalationSchema.parse(body);

    // Find appropriate assignee based on type
    let assignedTo = null;
    if (validatedData.escalationType === 'LIAISON') {
      assignedTo = await prisma.user.findFirst({
        where: { role: UserRole.LIAISON, isActive: true },
      });
    } else if (validatedData.escalationType === 'LEGAL') {
      assignedTo = await prisma.user.findFirst({
        where: { role: UserRole.LEGAL, isActive: true },
      });
    }

    const escalation = await prisma.escalation.create({
      data: {
        requesterId: session.user.id,
        postId: validatedData.postId,
        escalationType: validatedData.escalationType as EscalationType,
        priority: validatedData.priority as EscalationPriority,
        description: validatedData.description,
        assignedToId: assignedTo?.id,
      },
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

    // Send email notification to assigned person
    if (assignedTo) {
      const emailContent = escalationNotificationEmail({
        recipientName: assignedTo.fullName,
        requesterName: escalation.requester.fullName,
        escalationType: validatedData.escalationType,
        priority: validatedData.priority,
        description: validatedData.description,
        escalationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/escalations/${escalation.id}`,
      });

      await sendEmail({
        to: assignedTo.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_ESCALATION',
        entityType: 'ESCALATION',
        entityId: escalation.id,
        metadata: {
          type: validatedData.escalationType,
          priority: validatedData.priority,
        },
      },
    });

    return apiResponse(escalation, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.errors[0].message, 400);
    }
    console.error('Error creating escalation:', error);
    return apiError('Failed to create escalation', 500);
  }
}
