import { prisma } from '../config/prisma.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { nanoid } from 'nanoid';
import { convertPrismaToApiResponse } from '../utils/caseConverter.js';

// GET /api/agents/:agentId/deploy-settings
export const getDeploySettings = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
      select: {
        deploySettings: true
      }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const settings = agent.deploySettings || {};

    const response = {
      initialMessage: settings.initial_message || "Hi! What can I help you with?",
      suggestedMessages: settings.suggested_messages || [],
      messagePlaceholder: settings.message_placeholder || "Type your message...",
      theme: settings.theme || "light",
      bubbleColor: settings.bubble_color || "#000000",
      bubblePosition: settings.bubble_position || "bottom-right",
      displayName: settings.display_name || "",
      profilePictureUrl: settings.profile_picture_url || null,
      collectUserInfo: settings.collect_user_info || false,
      showSources: settings.show_sources !== false // Default to true
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get deploy settings error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// PUT /api/agents/:agentId/deploy-settings
export const updateDeploySettings = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;
    const {
      initial_message,
      suggested_messages,
      message_placeholder,
      theme,
      bubble_color,
      bubble_position,
      display_name,
      profile_picture_url,
      collect_user_info,
      show_sources
    } = req.body;

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const currentSettings = agent.deploySettings || {};

    const updatedSettings = {
      ...currentSettings,
      ...(initial_message !== undefined && { initial_message }),
      ...(suggested_messages !== undefined && { suggested_messages }),
      ...(message_placeholder !== undefined && { message_placeholder }),
      ...(theme !== undefined && { theme }),
      ...(bubble_color !== undefined && { bubble_color }),
      ...(bubble_position !== undefined && { bubble_position }),
      ...(display_name !== undefined && { display_name }),
      ...(profile_picture_url !== undefined && { profile_picture_url }),
      ...(collect_user_info !== undefined && { collect_user_info }),
      ...(show_sources !== undefined && { show_sources })
    };

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        deploySettings: updatedSettings
      }
    });

    res.json(createSuccessResponse({
      success: true,
      updatedAt: new Date()
    }));
  } catch (error) {
    logger.error('Update deploy settings error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// GET /api/agents/:agentId/integrations
export const getIntegrations = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
      select: {
        publicId: true,
        allowedDomains: true,
        apiKey: true,
        status: true
      }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Generate API key if it doesn't exist
    let apiKey = agent.apiKey;
    if (!apiKey) {
      apiKey = `ak_${nanoid(32)}`;
      await prisma.agent.update({
        where: { id: agentId },
        data: { apiKey }
      });
    }

    const baseUrl = process.env.BASE_URL || 'https://api.yourapp.com';
    const widgetUrl = process.env.WIDGET_URL || 'https://widget.yourapp.com';
    const shareUrl = process.env.SHARE_URL || 'https://chat.yourapp.com';

    const response = {
      embed: {
        script_tag: `<script src='${widgetUrl}/embed.js' data-agent-id='${agent.publicId}'></script>`,
        allowed_domains: agent.allowedDomains || []
      },
      share: {
        enabled: agent.status === 'published',
        url: `${shareUrl}/${agent.publicId}`
      },
      api: {
        endpoint: `${baseUrl}/v1/chat`,
        api_key: apiKey
      }
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get integrations error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// PUT /api/agents/:agentId/integrations
export const updateIntegrations = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;
    const { allowed_domains, share_enabled } = req.body;

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const updateData = {};
    
    if (allowed_domains !== undefined) {
      updateData.allowedDomains = allowed_domains;
    }

    if (share_enabled !== undefined) {
      updateData.status = share_enabled ? 'published' : 'draft';
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: updateData
    });

    const shareUrl = process.env.SHARE_URL || 'https://chat.yourapp.com';

    res.json(createSuccessResponse({
      success: true,
      ...(share_enabled !== undefined && {
        share_url: `${shareUrl}/${agent.publicId}`
      })
    }));
  } catch (error) {
    logger.error('Update integrations error:', error);
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