import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './prisma';

// Validate API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  WARNING: ANTHROPIC_API_KEY is not set. Chatbot will not function.');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
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
 * Extract keywords from query for better search
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it', 'from', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can']);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Search training documents for relevant context
 * In production, this would use a vector database (Pinecone, pgvector)
 * For now, it does keyword-based text matching
 */
async function searchKnowledgeBase(query: string): Promise<SearchResult[]> {
  // Extract keywords for better matching
  const keywords = extractKeywords(query);

  if (keywords.length === 0) {
    // If no meaningful keywords, return general documents
    const documents = await prisma.trainingDocument.findMany({
      where: { isActive: true },
      take: 3,
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => ({
      content: doc.content.substring(0, 1000), // Limit content length
      title: doc.title,
      type: doc.documentType,
      score: 0.5,
    }));
  }

  // Build search conditions for each keyword
  const searchConditions = keywords.flatMap(keyword => [
    { content: { contains: keyword, mode: 'insensitive' as const } },
    { title: { contains: keyword, mode: 'insensitive' as const } },
  ]);

  // Search with OR conditions
  const documents = await prisma.trainingDocument.findMany({
    where: {
      isActive: true,
      OR: searchConditions,
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  // Calculate simple relevance scores based on keyword matches
  return documents.map((doc) => {
    const contentLower = doc.content.toLowerCase();
    const titleLower = doc.title.toLowerCase();
    let matchCount = 0;

    keywords.forEach(keyword => {
      if (titleLower.includes(keyword)) matchCount += 2; // Title matches worth more
      if (contentLower.includes(keyword)) matchCount += 1;
    });

    const score = Math.min(matchCount / (keywords.length * 2), 1);

    return {
      content: doc.content.substring(0, 1500), // Limit to reduce token usage
      title: doc.title,
      type: doc.documentType,
      score,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Generate chatbot response using Claude API with RAG
 */
export async function generateChatbotResponse(
  userId: string,
  conversationId: string,
  userMessage: string
): Promise<{ response: string; sources: SearchResult[] }> {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Chatbot is not configured. Please contact your administrator to set up the ANTHROPIC_API_KEY.');
  }

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
  const context = searchResults.length > 0
    ? searchResults
        .map(
          (result, idx) =>
            `[Source ${idx + 1}: ${result.title} (${result.type})]\n${result.content}`
        )
        .join('\n\n')
    : 'No specific documents found for this query. Please provide general guidance based on your knowledge of RTW, ADA/FEHA compliance, and best practices.';

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

  try {
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
  } catch (error: any) {
    console.error('Claude API Error:', error);

    // Handle specific API errors
    if (error.status === 401) {
      throw new Error('Invalid API key. Please contact your administrator.');
    } else if (error.status === 429) {
      throw new Error('API rate limit reached. Please try again in a moment.');
    } else if (error.status >= 500) {
      throw new Error('Claude API is temporarily unavailable. Please try again later.');
    }

    throw new Error('Failed to generate response. Please try again.');
  }
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
