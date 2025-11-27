import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SearchResult {
  content: string;
  title: string;
  type: string;
  score: number;
}

/**
 * Search training documents for relevant context
 * In production, this would use a vector database (Pinecone, pgvector)
 * For now, it does simple text matching
 */
async function searchKnowledgeBase(query: string): Promise<SearchResult[]> {
  // TODO: Implement vector similarity search
  // For now, return recent training documents
  const documents = await prisma.trainingDocument.findMany({
    where: {
      isActive: true,
      OR: [
        { content: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  return documents.map((doc) => ({
    content: doc.content,
    title: doc.title,
    type: doc.documentType,
    score: 0.8, // Placeholder score
  }));
}

/**
 * Generate chatbot response using Claude API with RAG
 */
export async function generateChatbotResponse(
  userId: string,
  conversationId: string,
  userMessage: string
): Promise<{ response: string; sources: SearchResult[] }> {
  // Get conversation history
  const conversation = await prisma.chatbotConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 10, // Last 10 messages for context
      },
    },
  });

  if (!conversation || conversation.userId !== userId) {
    throw new Error('Conversation not found');
  }

  // Search knowledge base for relevant context
  const searchResults = await searchKnowledgeBase(userMessage);

  // Build context from search results
  const context = searchResults
    .map(
      (result, idx) =>
        `[Source ${idx + 1}: ${result.title} (${result.type})]\n${result.content}`
    )
    .join('\n\n');

  // Build message history
  const messageHistory: ChatMessage[] = conversation.messages.map((msg) => ({
    role: msg.role === 'USER' ? 'user' : 'assistant',
    content: msg.content,
  }));

  // System prompt for RTW assistant
  const systemPrompt = `You are an expert assistant for the SIA (State Insurance Authority) Return to Work (RTW) program. Your role is to help SD (Safety Division) members with questions about temporary and permanent work restrictions, both industrial and non-industrial cases.

You have access to:
- ADA/FEHA compliance materials
- Historical Q&A with legal counsel
- Job descriptions and bridge assignments
- Approved forum discussions

When answering:
1. Base your responses on the provided context documents
2. If you cite information, reference the source
3. If the question requires legal interpretation beyond your knowledge, recommend escalating to legal counsel
4. If the question is complex or you're uncertain, recommend escalating to the RTW Liaison
5. Be clear, concise, and professional
6. Focus on practical, actionable guidance

Context documents:
${context}

If you don't have enough information to provide a confident answer, say so and suggest escalation options.`;

  // Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      ...messageHistory,
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const assistantMessage =
    response.content[0].type === 'text' ? response.content[0].text : '';

  return {
    response: assistantMessage,
    sources: searchResults,
  };
}

/**
 * Create a new chatbot conversation
 */
export async function createConversation(userId: string, title?: string) {
  return prisma.chatbotConversation.create({
    data: {
      userId,
      title: title || 'New Conversation',
    },
  });
}

/**
 * Save messages to conversation
 */
export async function saveMessages(
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
  sources?: SearchResult[]
) {
  await prisma.chatbotMessage.createMany({
    data: [
      {
        conversationId,
        role: 'USER',
        content: userMessage,
      },
      {
        conversationId,
        role: 'ASSISTANT',
        content: assistantMessage,
        sources: sources ? JSON.parse(JSON.stringify(sources)) : null,
      },
    ],
  });
}
