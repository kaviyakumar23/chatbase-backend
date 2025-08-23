import { prisma } from '../config/prisma.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import vectorService from '../services/vectorService.js';
import logger from '../utils/logger.js';
import { nanoid } from 'nanoid';
import { convertPrismaToApiResponse, convertPrismaArrayToApiResponse } from '../utils/caseConverter.js';

// POST /api/agents/:agentId/chat (Widget API)
export const sendMessage = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, session_id, context = {} } = req.body;

    if (!message) {
      return res.status(400).json(createErrorResponse('Message is required'));
    }

    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        model: true,
        temperature: true,
        systemPrompt: true,
        vectorNamespace: true,
        status: true
      }
    });

    if (!agent || agent.status !== 'published') {
      return res.status(404).json(createErrorResponse('Agent not found or not published'));
    }

    const sessionId = session_id || `sess_${nanoid(10)}`;

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { agentId, sessionId }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          agentId,
          sessionId,
          userEmail: context.user_email,
          userName: context.user_name,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message
      }
    });

    // TODO: Implement actual AI response generation
    // This would involve:
    // 1. Query vector database for relevant context
    // 2. Build prompt with system prompt + context + user message
    // 3. Call OpenAI API
    // 4. Save assistant response

    // For now, return a mock response
    const mockResponse = "Thank you for your message. This is a placeholder response.";
    const mockSources = [];

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: mockResponse,
        tokensUsed: 50,
        contextUsed: []
      }
    });

    // Update conversation and agent stats
    await Promise.all([
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { messageCount: { increment: 2 } }
      }),
      prisma.agent.update({
        where: { id: agentId },
        data: {
          messageCount: { increment: 2 },
          lastMessageAt: new Date()
        }
      })
    ]);

    const response = {
      response: mockResponse,
      sources: mockSources,
      sessionId: sessionId,
      messageId: assistantMessage.id
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// GET /api/agents/:agentId/chat-logs
export const getChatLogs = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;
    const {
      page = 1,
      limit = 20,
      start_date,
      end_date
    } = req.query;

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build date filter
    const dateFilter = {};
    if (start_date) {
      dateFilter.gte = new Date(start_date);
    }
    if (end_date) {
      dateFilter.lte = new Date(end_date);
    }

    const whereClause = {
      agentId,
      ...(Object.keys(dateFilter).length > 0 && {
        startedAt: dateFilter
      })
    };

    const [conversations, totalCount] = await Promise.all([
      prisma.conversation.findMany({
        where: whereClause,
        select: {
          id: true,
          sessionId: true,
          startedAt: true,
          messageCount: true,
          messages: {
            select: {
              role: true,
              content: true,
              createdAt: true
            },
            take: 10, // Limit messages per conversation in list view
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { startedAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.conversation.count({ where: whereClause })
    ]);

    const sessions = convertPrismaArrayToApiResponse(conversations, 'conversation');

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    const response = {
      sessions,
      total: totalCount,
      page: parseInt(page),
      pages: totalPages
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get chat logs error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// GET /api/agents/:agentId/chat-logs/:sessionId
export const getChatSession = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId, sessionId } = req.params;

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const conversation = await prisma.conversation.findFirst({
      where: { agentId, sessionId },
      select: {
        id: true,
        sessionId: true,
        startedAt: true,
        endedAt: true,
        ipAddress: true,
        userAgent: true,
        messages: {
          select: {
            id: true,
            role: true,
            content: true,
            tokensUsed: true,
            contextUsed: true,
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json(createErrorResponse('Chat session not found'));
    }

    const response = {
      id: conversation.id,
      session_id: conversation.sessionId,
      started_at: conversation.startedAt,
      ended_at: conversation.endedAt,
      ip_address: conversation.ipAddress,
      user_agent: conversation.userAgent,
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        ...(msg.role === 'assistant' && {
          tokens_used: msg.tokensUsed,
          context_chunks: msg.contextUsed || []
        }),
        created_at: msg.createdAt
      }))
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get chat session error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// Helper function
async function getUserIdFromClerkId(clerkUserId) {
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user.id;
}