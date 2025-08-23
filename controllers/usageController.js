import { prisma } from '../config/prisma.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { convertPrismaToApiResponse, convertPrismaArrayToApiResponse } from '../utils/caseConverter.js';

// GET /api/usage
export const getUsage = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);

    // Get user info with limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
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

    const currentUsage = await prisma.usageTracking.findUnique({
      where: {
        userId_month: {
          userId,
          month: currentMonth
        }
      }
    });

    // Get historical usage (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const historicalUsage = await prisma.usageTracking.findMany({
      where: {
        userId,
        month: {
          gte: sixMonthsAgo,
          lt: currentMonth
        }
      },
      orderBy: { month: 'desc' },
      take: 6
    });

    const response = {
      currentMonth: {
        messages: currentUsage?.totalMessages || 0,
        messagesLimit: user.messageLimit,
        tokens: currentUsage?.totalTokens || 0,
        storageBytes: Number(currentUsage?.storageBytesUsed || 0),
        agentsCount: user._count.agents,
        agentsLimit: user.agentLimit
      },
      history: historicalUsage.map(usage => ({
        month: usage.month.toISOString().slice(0, 7), // YYYY-MM format
        messages: usage.totalMessages,
        tokens: usage.totalTokens
      }))
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get usage error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// Helper function to update usage (called by other services)
export const updateUsage = async (userId, data) => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    await prisma.usageTracking.upsert({
      where: {
        userId_month: {
          userId,
          month: currentMonth
        }
      },
      update: {
        totalMessages: {
          increment: data.messages || 0
        },
        totalTokens: {
          increment: data.tokens || 0
        },
        totalDataSources: {
          increment: data.dataSources || 0
        },
        storageBytesUsed: {
          increment: BigInt(data.storageBytes || 0)
        }
      },
      create: {
        userId,
        month: currentMonth,
        totalMessages: data.messages || 0,
        totalTokens: data.tokens || 0,
        totalDataSources: data.dataSources || 0,
        storageBytesUsed: BigInt(data.storageBytes || 0)
      }
    });
  } catch (error) {
    logger.error('Update usage error:', error);
    throw error;
  }
};

// Helper function to check usage limits
export const checkUsageLimits = async (userId, type) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
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
      throw new Error('User not found');
    }

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const currentUsage = await prisma.usageTracking.findUnique({
      where: {
        userId_month: {
          userId,
          month: currentMonth
        }
      }
    });

    const limits = {
      agents: {
        current: user._count.agents,
        limit: user.agentLimit,
        exceeded: user._count.agents >= user.agentLimit
      },
      messages: {
        current: currentUsage?.totalMessages || 0,
        limit: user.messageLimit,
        exceeded: (currentUsage?.totalMessages || 0) >= user.messageLimit
      }
    };

    if (type && limits[type]) {
      return limits[type];
    }

    return limits;
  } catch (error) {
    logger.error('Check usage limits error:', error);
    throw error;
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