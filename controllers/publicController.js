import { PrismaClient } from '../generated/prisma/index.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import vectorService from '../services/vectorService.js';
import logger from '../utils/logger.js';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

// GET /api/public/agents/:publicId/config
export const getAgentConfig = async (req, res) => {
  try {
    const { publicId } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { publicId },
      select: {
        id: true,
        name: true,
        status: true,
        deploySettings: true
      }
    });

    if (!agent || agent.status !== 'published') {
      return res.status(404).json(createErrorResponse('Agent not found or not published'));
    }

    const settings = agent.deploySettings || {};

    const response = {
      name: agent.name,
      initial_message: settings.initial_message || "Hi! How can I help?",
      suggested_messages: settings.suggested_messages || [],
      theme: settings.theme || "light",
      bubble_color: settings.bubble_color || "#000000",
      display_name: settings.display_name || agent.name,
      profile_picture_url: settings.profile_picture_url || null
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get agent config error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// POST /api/public/agents/:publicId/chat
export const sendPublicMessage = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { message, session_id } = req.body;

    if (!message) {
      return res.status(400).json(createErrorResponse('Message is required'));
    }

    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { publicId },
      select: {
        id: true,
        name: true,
        model: true,
        temperature: true,
        systemPrompt: true,
        vectorNamespace: true,
        status: true,
        allowedDomains: true
      }
    });

    if (!agent || agent.status !== 'published') {
      return res.status(404).json(createErrorResponse('Agent not found or not published'));
    }

    // Check domain restrictions (if any)
    const origin = req.get('Origin');
    if (agent.allowedDomains && agent.allowedDomains.length > 0) {
      const isAllowed = agent.allowedDomains.some(domain => {
        if (domain.startsWith('*.')) {
          const baseDomain = domain.slice(2);
          return origin?.endsWith(baseDomain);
        }
        return origin === `https://${domain}` || origin === `http://${domain}`;
      });

      if (!isAllowed) {
        return res.status(403).json(createErrorResponse('Domain not allowed'));
      }
    }

    const sessionId = session_id || `sess_visitor_${nanoid(10)}`;

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { agentId: agent.id, sessionId }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          agentId: agent.id,
          sessionId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          referrer: req.get('Referer')
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
    // 1. Query vector database for relevant context using agent.vectorNamespace
    // 2. Build prompt with system prompt + context + user message
    // 3. Call OpenAI API with agent.model and agent.temperature
    // 4. Save assistant response

    // For now, return a mock response
    const mockResponse = `Thank you for your message! This is ${agent.name} responding. I'm here to help you.`;
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
        where: { id: agent.id },
        data: {
          messageCount: { increment: 2 },
          lastMessageAt: new Date()
        }
      })
    ]);

    const response = {
      response: mockResponse,
      sources: mockSources,
      session_id: sessionId
    };

    // For streaming implementation, you would use Server-Sent Events (SSE)
    // res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    // res.setHeader('Cache-Control', 'no-cache');
    // res.setHeader('Connection', 'keep-alive');
    // Then stream the response chunks

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Send public message error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// POST /api/public/agents/:publicId/lead
export const capturePublicLead = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { email, name, session_id, phone, company, metadata = {} } = req.body;

    if (!email && !name) {
      return res.status(400).json(createErrorResponse('Email or name is required'));
    }

    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { publicId },
      select: {
        id: true,
        status: true
      }
    });

    if (!agent || agent.status !== 'published') {
      return res.status(404).json(createErrorResponse('Agent not found or not published'));
    }

    const sessionId = session_id || `sess_visitor_${nanoid(10)}`;

    // Find the conversation for this session
    const conversation = await prisma.conversation.findFirst({
      where: { agentId: agent.id, sessionId }
    });

    // Create lead record
    await prisma.capturedLead.create({
      data: {
        agentId: agent.id,
        conversationId: conversation?.id,
        email,
        name,
        phone,
        company,
        metadata,
        sessionId
      }
    });

    res.json(createSuccessResponse({
      success: true,
      message: "Thank you! We'll be in touch soon."
    }));
  } catch (error) {
    logger.error('Capture public lead error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};