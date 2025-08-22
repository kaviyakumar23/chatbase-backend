import { PrismaClient } from '../generated/prisma/index.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

// GET /api/agents
export const getAgents = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);

    const agents = await prisma.agent.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        model: true,
        messageCount: true,
        lastMessageAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const response = {
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        status: agent.status,
        model: agent.model,
        message_count: agent.messageCount,
        last_message_at: agent.lastMessageAt,
        created_at: agent.createdAt
      }))
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
    const { name, model = 'gpt-4o-mini', temperature = 0.7, system_prompt } = req.body;

    // Check agent limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { agents: true } } }
    });

    if (user._count.agents >= user.agentLimit) {
      return res.status(400).json(createErrorResponse('Agent limit reached'));
    }

    // Generate unique identifiers
    const slug = generateSlug(name);
    const publicId = `pub_${nanoid(10)}`;
    const vectorNamespace = `ns_${nanoid(10)}`;

    const agent = await prisma.agent.create({
      data: {
        userId,
        name,
        slug,
        model,
        temperature,
        systemPrompt: system_prompt,
        publicId,
        vectorNamespace,
        deploySettings: {
          initial_message: "Hi! How can I help you today?",
          suggested_messages: [],
          message_placeholder: "Type your message...",
          theme: "light",
          bubble_color: "#000000",
          bubble_position: "bottom-right",
          display_name: name,
          profile_picture_url: null,
          collect_user_info: false,
          show_sources: true
        }
      }
    });

    const response = {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      public_id: agent.publicId,
      vector_namespace: agent.vectorNamespace,
      status: agent.status,
      created_at: agent.createdAt
    };

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

    const agent = await prisma.agent.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        model: true,
        temperature: true,
        systemPrompt: true,
        publicId: true,
        messageCount: true,
        sourcesCount: true,
        createdAt: true
      }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const response = {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      status: agent.status,
      model: agent.model,
      temperature: agent.temperature,
      system_prompt: agent.systemPrompt,
      public_id: agent.publicId,
      message_count: agent.messageCount,
      sources_count: agent.sourcesCount,
      created_at: agent.createdAt
    };

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
    const { name, model, temperature, system_prompt, status } = req.body;

    // Check if agent exists and belongs to user
    const existingAgent = await prisma.agent.findFirst({
      where: { id, userId }
    });

    if (!existingAgent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (model !== undefined) updateData.model = model;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (system_prompt !== undefined) updateData.systemPrompt = system_prompt;
    if (status !== undefined) updateData.status = status;

    const agent = await prisma.agent.update({
      where: { id },
      data: updateData
    });

    const response = {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      updated_at: agent.updatedAt
    };

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
    const existingAgent = await prisma.agent.findFirst({
      where: { id, userId }
    });

    if (!existingAgent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Delete agent (cascade will handle related data)
    await prisma.agent.delete({
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