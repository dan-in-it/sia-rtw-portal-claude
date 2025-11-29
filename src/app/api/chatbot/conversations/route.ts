import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// GET /api/chatbot/conversations - List user's conversations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const conversations = await prisma.chatbotConversation.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get last message for preview
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50, // Limit to 50 most recent conversations
    });

    // Format conversations for frontend
    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title || 'Untitled Conversation',
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv._count.messages,
      lastMessage: conv.messages[0]
        ? {
            content: conv.messages[0].content.substring(0, 100) + '...',
            createdAt: conv.messages[0].createdAt,
          }
        : null,
    }));

    return apiResponse({ conversations: formattedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return apiError('Failed to fetch conversations', 500);
  }
}
