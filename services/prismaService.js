import { prisma } from '../config/prisma.js';

class PrismaService {
  // =====================
  // USER OPERATIONS
  // =====================
  
  async createUser(userData) {
    try {
      const user = await prisma.user.create({
        data: {
          clerkUserId: userData.clerk_user_id || userData.clerkUserId,
          email: userData.email,
          fullName: userData.full_name || userData.fullName,
          planType: userData.plan_type || userData.planType || 'free',
          chatbotLimit: userData.chatbot_limit || userData.chatbotLimit || 1,
          messageLimit: userData.message_limit || userData.messageLimit || 1000,
        },
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }
  
  async getUserById(id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          chatbots: {
            include: {
              dataSources: true,
              conversations: {
                include: {
                  messages: true,
                },
              },
            },
          },
          usageTracking: true,
        },
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }
  
  async getUserByClerkId(clerkUserId) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkUserId },
        include: {
          chatbots: true,
          usageTracking: true,
        },
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to get user by Clerk ID: ${error.message}`);
    }
  }
  
  async updateUser(id, updates) {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          email: updates.email,
          fullName: updates.full_name || updates.fullName,
          planType: updates.plan_type || updates.planType,
          chatbotLimit: updates.chatbot_limit || updates.chatbotLimit,
          messageLimit: updates.message_limit || updates.messageLimit,
        },
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }
  
  async deleteUser(id) {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
  
  async getUsers(limit = 50, offset = 0) {
    try {
      const [users, count] = await Promise.all([
        prisma.user.findMany({
          skip: offset,
          take: limit,
          include: {
            chatbots: true,
            usageTracking: true,
          },
        }),
        prisma.user.count(),
      ]);
      return { data: users, count };
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  // =====================
  // CHATBOT OPERATIONS
  // =====================
  
  async createChatbot(chatbotData) {
    try {
      const chatbot = await prisma.chatbot.create({
        data: {
          userId: chatbotData.user_id || chatbotData.userId,
          name: chatbotData.name,
          slug: chatbotData.slug,
          description: chatbotData.description,
          model: chatbotData.model || 'gpt-3.5-turbo',
          temperature: chatbotData.temperature || 0.7,
          maxTokens: chatbotData.max_tokens || chatbotData.maxTokens || 500,
          systemPrompt: chatbotData.system_prompt || chatbotData.systemPrompt,
          welcomeMessage: chatbotData.welcome_message || chatbotData.welcomeMessage,
          suggestedQuestions: chatbotData.suggested_questions || chatbotData.suggestedQuestions || [],
          themeColor: chatbotData.theme_color || chatbotData.themeColor || '#000000',
          botAvatarUrl: chatbotData.bot_avatar_url || chatbotData.botAvatarUrl,
          chatBubbleStyle: chatbotData.chat_bubble_style || chatbotData.chatBubbleStyle || {},
          publicId: chatbotData.public_id || chatbotData.publicId,
          apiKey: chatbotData.api_key || chatbotData.apiKey,
          isActive: chatbotData.is_active || chatbotData.isActive !== false,
          allowedDomains: chatbotData.allowed_domains || chatbotData.allowedDomains || [],
          vectorNamespace: chatbotData.vector_namespace || chatbotData.vectorNamespace,
        },
        include: {
          user: true,
          dataSources: true,
        },
      });
      return chatbot;
    } catch (error) {
      throw new Error(`Failed to create chatbot: ${error.message}`);
    }
  }
  
  async getChatbotById(id) {
    try {
      const chatbot = await prisma.chatbot.findUnique({
        where: { id },
        include: {
          user: true,
          dataSources: true,
          conversations: {
            include: {
              messages: true,
            },
          },
          analytics: true,
          capturedLeads: true,
        },
      });
      return chatbot;
    } catch (error) {
      throw new Error(`Failed to get chatbot: ${error.message}`);
    }
  }
  
  async getChatbotByPublicId(publicId) {
    try {
      const chatbot = await prisma.chatbot.findUnique({
        where: { publicId },
        include: {
          user: true,
          dataSources: true,
        },
      });
      return chatbot;
    } catch (error) {
      throw new Error(`Failed to get chatbot by public ID: ${error.message}`);
    }
  }
  
  async getUserChatbots(userId) {
    try {
      const chatbots = await prisma.chatbot.findMany({
        where: { userId },
        include: {
          dataSources: true,
          conversations: {
            include: {
              messages: true,
            },
          },
        },
      });
      return chatbots;
    } catch (error) {
      throw new Error(`Failed to get user chatbots: ${error.message}`);
    }
  }
  
  async updateChatbot(id, updates) {
    try {
      const chatbot = await prisma.chatbot.update({
        where: { id },
        data: {
          name: updates.name,
          slug: updates.slug,
          description: updates.description,
          model: updates.model,
          temperature: updates.temperature,
          maxTokens: updates.max_tokens || updates.maxTokens,
          systemPrompt: updates.system_prompt || updates.systemPrompt,
          welcomeMessage: updates.welcome_message || updates.welcomeMessage,
          suggestedQuestions: updates.suggested_questions || updates.suggestedQuestions,
          themeColor: updates.theme_color || updates.themeColor,
          botAvatarUrl: updates.bot_avatar_url || updates.botAvatarUrl,
          chatBubbleStyle: updates.chat_bubble_style || updates.chatBubbleStyle,
          isActive: updates.is_active ?? updates.isActive,
          allowedDomains: updates.allowed_domains || updates.allowedDomains,
        },
        include: {
          user: true,
          dataSources: true,
        },
      });
      return chatbot;
    } catch (error) {
      throw new Error(`Failed to update chatbot: ${error.message}`);
    }
  }
  
  async deleteChatbot(id) {
    try {
      await prisma.chatbot.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete chatbot: ${error.message}`);
    }
  }

  // =====================
  // DATA SOURCE OPERATIONS
  // =====================
  
  async createDataSource(dataSourceData) {
    try {
      const dataSource = await prisma.dataSource.create({
        data: {
          chatbotId: dataSourceData.chatbot_id || dataSourceData.chatbotId,
          type: dataSourceData.type,
          name: dataSourceData.name,
          sourceConfig: dataSourceData.source_config || dataSourceData.sourceConfig,
          status: dataSourceData.status || 'pending',
          errorMessage: dataSourceData.error_message || dataSourceData.errorMessage,
          fileSizeBytes: dataSourceData.file_size_bytes || dataSourceData.fileSizeBytes,
          charCount: dataSourceData.char_count || dataSourceData.charCount,
          chunkCount: dataSourceData.chunk_count || dataSourceData.chunkCount,
          r2Key: dataSourceData.r2_key || dataSourceData.r2Key,
          processedAt: dataSourceData.processed_at || dataSourceData.processedAt,
        },
        include: {
          chatbot: true,
        },
      });
      return dataSource;
    } catch (error) {
      throw new Error(`Failed to create data source: ${error.message}`);
    }
  }
  
  async getDataSourceById(id) {
    try {
      const dataSource = await prisma.dataSource.findUnique({
        where: { id },
        include: {
          chatbot: true,
        },
      });
      return dataSource;
    } catch (error) {
      throw new Error(`Failed to get data source: ${error.message}`);
    }
  }
  
  async getChatbotDataSources(chatbotId) {
    try {
      const dataSources = await prisma.dataSource.findMany({
        where: { chatbotId },
        include: {
          chatbot: true,
        },
      });
      return dataSources;
    } catch (error) {
      throw new Error(`Failed to get chatbot data sources: ${error.message}`);
    }
  }
  
  async updateDataSource(id, updates) {
    try {
      const dataSource = await prisma.dataSource.update({
        where: { id },
        data: {
          status: updates.status,
          errorMessage: updates.error_message || updates.errorMessage,
          fileSizeBytes: updates.file_size_bytes || updates.fileSizeBytes,
          charCount: updates.char_count || updates.charCount,
          chunkCount: updates.chunk_count || updates.chunkCount,
          r2Key: updates.r2_key || updates.r2Key,
          processedAt: updates.processed_at || updates.processedAt,
        },
        include: {
          chatbot: true,
        },
      });
      return dataSource;
    } catch (error) {
      throw new Error(`Failed to update data source: ${error.message}`);
    }
  }
  
  async deleteDataSource(id) {
    try {
      await prisma.dataSource.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete data source: ${error.message}`);
    }
  }

  // =====================
  // CONVERSATION OPERATIONS
  // =====================
  
  async createConversation(conversationData) {
    try {
      const conversation = await prisma.conversation.create({
        data: {
          chatbotId: conversationData.chatbot_id || conversationData.chatbotId,
          sessionId: conversationData.session_id || conversationData.sessionId,
          userEmail: conversationData.user_email || conversationData.userEmail,
          userName: conversationData.user_name || conversationData.userName,
          ipAddress: conversationData.ip_address || conversationData.ipAddress,
          userAgent: conversationData.user_agent || conversationData.userAgent,
          referrer: conversationData.referrer,
        },
        include: {
          chatbot: true,
          messages: true,
        },
      });
      return conversation;
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }
  
  async getConversationById(id) {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          chatbot: true,
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
          capturedLeads: true,
        },
      });
      return conversation;
    } catch (error) {
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }
  
  async getChatbotConversations(chatbotId, limit = 50, offset = 0) {
    try {
      const [conversations, count] = await Promise.all([
        prisma.conversation.findMany({
          where: { chatbotId },
          skip: offset,
          take: limit,
          include: {
            messages: true,
            capturedLeads: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.conversation.count({
          where: { chatbotId },
        }),
      ]);
      return { data: conversations, count };
    } catch (error) {
      throw new Error(`Failed to get chatbot conversations: ${error.message}`);
    }
  }

  // =====================
  // MESSAGE OPERATIONS
  // =====================
  
  async createMessage(messageData) {
    try {
      const message = await prisma.message.create({
        data: {
          conversationId: messageData.conversation_id || messageData.conversationId,
          role: messageData.role,
          content: messageData.content,
          tokensUsed: messageData.tokens_used || messageData.tokensUsed,
          contextUsed: messageData.context_used || messageData.contextUsed,
        },
        include: {
          conversation: {
            include: {
              chatbot: true,
            },
          },
        },
      });
      return message;
    } catch (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }
  }
  
  async getConversationMessages(conversationId) {
    try {
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          conversation: true,
        },
      });
      return messages;
    } catch (error) {
      throw new Error(`Failed to get conversation messages: ${error.message}`);
    }
  }

  // =====================
  // ANALYTICS OPERATIONS
  // =====================
  
  async getChatbotAnalytics(chatbotId, startDate, endDate) {
    try {
      const analytics = await prisma.chatbotAnalytics.findMany({
        where: {
          chatbotId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });
      return analytics;
    } catch (error) {
      throw new Error(`Failed to get chatbot analytics: ${error.message}`);
    }
  }
  
  async getUserUsageTracking(userId, month) {
    try {
      const usage = await prisma.usageTracking.findUnique({
        where: {
          userId_month: {
            userId,
            month,
          },
        },
      });
      return usage;
    } catch (error) {
      throw new Error(`Failed to get user usage tracking: ${error.message}`);
    }
  }

  // =====================
  // LEAD CAPTURE OPERATIONS
  // =====================
  
  async createCapturedLead(leadData) {
    try {
      const lead = await prisma.capturedLead.create({
        data: {
          chatbotId: leadData.chatbot_id || leadData.chatbotId,
          conversationId: leadData.conversation_id || leadData.conversationId,
          email: leadData.email,
          name: leadData.name,
          phone: leadData.phone,
          company: leadData.company,
          customFields: leadData.custom_fields || leadData.customFields || {},
        },
        include: {
          chatbot: true,
          conversation: true,
        },
      });
      return lead;
    } catch (error) {
      throw new Error(`Failed to create captured lead: ${error.message}`);
    }
  }
  
  async getChatbotLeads(chatbotId, limit = 50, offset = 0) {
    try {
      const [leads, count] = await Promise.all([
        prisma.capturedLead.findMany({
          where: { chatbotId },
          skip: offset,
          take: limit,
          include: {
            chatbot: true,
            conversation: true,
          },
          orderBy: {
            capturedAt: 'desc',
          },
        }),
        prisma.capturedLead.count({
          where: { chatbotId },
        }),
      ]);
      return { data: leads, count };
    } catch (error) {
      throw new Error(`Failed to get chatbot leads: ${error.message}`);
    }
  }

  // =====================
  // UTILITY OPERATIONS
  // =====================
  
  async healthCheck() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }
  
  async disconnect() {
    await prisma.$disconnect();
  }
}

export default new PrismaService();
