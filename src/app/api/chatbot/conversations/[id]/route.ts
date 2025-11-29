import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// GET /api/chatbot/conversations/[id] - Get conversation with all messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const conversation = await prisma.chatbotConversation.findUnique({
      where: {
        id: params.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return apiError('Conversation not found', 404);
    }

    // Verify user owns this conversation
    if (conversation.userId !== session.user.id) {
      return apiError('Forbidden', 403);
    }

    return apiResponse(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return apiError('Failed to fetch conversation', 500);
  }
}

// DELETE /api/chatbot/conversations/[id] - Delete a conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const conversation = await prisma.chatbotConversation.findUnique({
      where: { id: params.id },
    });

    if (!conversation) {
      return apiError('Conversation not found', 404);
    }

    // Verify user owns this conversation
    if (conversation.userId !== session.user.id) {
      return apiError('Forbidden', 403);
    }

    await prisma.chatbotConversation.delete({
      where: { id: params.id },
    });

    return apiResponse({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return apiError('Failed to delete conversation', 500);
  }
}
