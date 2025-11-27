import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiResponse, apiError, rateLimit } from '@/lib/middleware';
import {
  createConversation,
  generateChatbotResponse,
  saveMessages,
} from '@/lib/chatbot';
import { z } from 'zod';

const messageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});

// POST /api/chatbot/message - Send message to chatbot
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    // Rate limiting - 30 messages per minute
    const canProceed = await rateLimit(`chatbot:${session.user.id}`, 30, 60000);
    if (!canProceed) {
      return apiError('Too many requests. Please wait a moment.', 429);
    }

    const body = await req.json();
    const validatedData = messageSchema.parse(body);

    let conversationId = validatedData.conversationId;

    // Create new conversation if not provided
    if (!conversationId) {
      const conversation = await createConversation(session.user.id);
      conversationId = conversation.id;
    }

    // Generate AI response
    const { response, sources } = await generateChatbotResponse(
      session.user.id,
      conversationId,
      validatedData.message
    );

    // Save messages to database
    await saveMessages(
      conversationId,
      validatedData.message,
      response,
      sources
    );

    return apiResponse({
      conversationId,
      message: response,
      sources,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.errors[0].message, 400);
    }
    console.error('Error processing chatbot message:', error);
    return apiError('Failed to process message', 500);
  }
}
