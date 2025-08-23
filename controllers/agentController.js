import { prisma } from '../config/prisma.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { nanoid } from 'nanoid';
import { convertPrismaToApiResponse, convertPrismaArrayToApiResponse } from '../utils/caseConverter.js';

// GET /api/agents
export const getAgents = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);

    const agents = await prisma.chatbots.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        name: true,
        slug: true,
        is_active: true,
        model: true,
        message_count: true,
        last_message_at: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    const response = {
      agents: convertPrismaArrayToApiResponse(agents, 'agent')
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get agents error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// POST /api/agents
export const createAgent = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { name, model = 'gpt-4o-mini', temperature = 0.7, systemPrompt } = req.body;

    // Check agent limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { chatbots: true } } }
    });

    if (user._count.chatbots >= user.chatbot_limit) {
      return res.status(400).json(createErrorResponse('Agent limit reached'));
    }

    // Generate unique identifiers
    const slug = generateSlug(name);
    const publicId = `pub_${nanoid(10)}`;
    const vectorNamespace = `ns_${nanoid(10)}`;

    const agent = await prisma.chatbots.create({
      data: {
        user_id: userId,
        name,
        slug,
        model,
        temperature,
        system_prompt: systemPrompt,
        public_id: publicId,
        vector_namespace: vectorNamespace,
        welcome_message: "Hi! How can I help you today?",
        suggested_questions: [],
        theme_color: "#000000",
        is_active: true
      }
    });

    const response = convertPrismaToApiResponse(agent, 'agent');

    res.status(201).json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Create agent error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// GET /api/agents/:id
export const getAgent = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { id } = req.params;

    const agent = await prisma.chatbots.findFirst({
      where: { id, user_id: userId },
      select: {
        id: true,
        name: true,
        slug: true,
        is_active: true,
        model: true,
        temperature: true,
        system_prompt: true,
        public_id: true,
        message_count: true,
        created_at: true
      }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const response = convertPrismaToApiResponse(agent, 'agent');

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get agent error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// PUT /api/agents/:id
export const updateAgent = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { id } = req.params;
    const { name, model, temperature, systemPrompt, status } = req.body;

    // Check if agent exists and belongs to user
    const existingAgent = await prisma.chatbots.findFirst({
      where: { id, user_id: userId }
    });

    if (!existingAgent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (model !== undefined) updateData.model = model;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (systemPrompt !== undefined) updateData.system_prompt = systemPrompt;
    if (status !== undefined) updateData.is_active = status;

    const agent = await prisma.chatbots.update({
      where: { id },
      data: updateData
    });

    const response = convertPrismaToApiResponse(agent, 'agent');

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Update agent error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// DELETE /api/agents/:id
export const deleteAgent = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { id } = req.params;

    // Check if agent exists and belongs to user
    const existingAgent = await prisma.chatbots.findFirst({
      where: { id, user_id: userId }
    });

    if (!existingAgent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Delete agent (cascade will handle related data)
    await prisma.chatbots.delete({
      where: { id }
    });

    res.json(createSuccessResponse({
      success: true,
      message: 'Agent deleted successfully'
    }));
  } catch (error) {
    logger.error('Delete agent error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// Helper functions
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

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}