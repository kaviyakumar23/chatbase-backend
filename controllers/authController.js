import { prisma } from '../config/prisma.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { convertPrismaToApiResponse } from '../utils/caseConverter.js';

// POST /api/auth/webhook (Clerk Webhook)
export const handleClerkWebhook = async (req, res) => {
  try {
    // Use the verified webhook payload from the middleware
    const { type, data } = req.webhookPayload;

    logger.info(`Processing Clerk webhook: ${type}`);

    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      default:
        logger.warn(`Unhandled webhook type: ${type}`);
    }

    res.json(createSuccessResponse({ 
      success: true, 
      message: `Webhook ${type} processed successfully` 
    }));
  } catch (error) {
    logger.error('Clerk webhook error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// GET /api/auth/me
export const getCurrentUser = async (req, res) => {
  try {
    const clerkUserId = req.auth.userId;

    if (!clerkUserId) {
      return res.status(401).json(createErrorResponse('Unauthorized'));
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        planType: true,
        agentLimit: true,
        messageLimit: true,
        _count: {
          select: {
            agents: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }

    // Get current month usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const usage = await prisma.usageTracking.findUnique({
      where: {
        userId_month: {
          userId: user.id,
          month: currentMonth
        }
      }
    });

    const response = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      planType: user.planType,
      agentLimit: user.agentLimit,
      messageLimit: user.messageLimit,
      currentUsage: {
        agentsCount: user._count.agents,
        messagesThisMonth: usage?.totalMessages || 0
      }
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// Helper functions for webhook handling
async function handleUserCreated(userData) {
  const { id: clerkUserId, email_addresses, first_name, last_name } = userData;
  const email = email_addresses?.[0]?.email_address;
  const fullName = [first_name, last_name].filter(Boolean).join(' ');

  await prisma.user.create({
    data: {
      clerkUserId,
      email,
      fullName: fullName || null
    }
  });

  logger.info(`User created: ${email}`);
}

async function handleUserUpdated(userData) {
  const { id: clerkUserId, email_addresses, first_name, last_name } = userData;
  const email = email_addresses?.[0]?.email_address;
  const fullName = [first_name, last_name].filter(Boolean).join(' ');

  await prisma.user.update({
    where: { clerkUserId },
    data: {
      email,
      fullName: fullName || null
    }
  });

  logger.info(`User updated: ${email}`);
}

async function handleUserDeleted(userData) {
  const { id: clerkUserId } = userData;

  await prisma.user.delete({
    where: { clerkUserId }
  });

  logger.info(`User deleted: ${clerkUserId}`);
}