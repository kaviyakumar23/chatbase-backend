import { supabase, supabaseAdmin, prisma } from '../config/database.js';
import prismaService from './prismaService.js';

class SupabaseService {
  // Most CRUD operations now use Prisma for better type safety and relations
  // Keep Supabase methods for backward compatibility and real-time features
  
  async createUser(userData) {
    // Use Prisma service for better error handling and type safety
    return await prismaService.createUser(userData);
  }
  
  async getUserById(id) {
    // Use Prisma service for better relations
    return await prismaService.getUserById(id);
  }
  
  async getUserByClerkId(clerkUserId) {
    return await prismaService.getUserByClerkId(clerkUserId);
  }
  
  async updateUser(id, updates) {
    return await prismaService.updateUser(id, updates);
  }
  
  async deleteUser(id) {
    return await prismaService.deleteUser(id);
  }
  
  async getUsers(limit = 50, offset = 0) {
    return await prismaService.getUsers(limit, offset);
  }

  // Chatbot operations
  async createChatbot(chatbotData) {
    return await prismaService.createChatbot(chatbotData);
  }
  
  async getChatbotById(id) {
    return await prismaService.getChatbotById(id);
  }
  
  async getChatbotByPublicId(publicId) {
    return await prismaService.getChatbotByPublicId(publicId);
  }
  
  async getUserChatbots(userId) {
    return await prismaService.getUserChatbots(userId);
  }
  
  async updateChatbot(id, updates) {
    return await prismaService.updateChatbot(id, updates);
  }
  
  async deleteChatbot(id) {
    return await prismaService.deleteChatbot(id);
  }

  // Data source operations
  async createDataSource(dataSourceData) {
    return await prismaService.createDataSource(dataSourceData);
  }
  
  async getDataSourceById(id) {
    return await prismaService.getDataSourceById(id);
  }
  
  async getChatbotDataSources(chatbotId) {
    return await prismaService.getChatbotDataSources(chatbotId);
  }
  
  async updateDataSource(id, updates) {
    return await prismaService.updateDataSource(id, updates);
  }
  
  async deleteDataSource(id) {
    return await prismaService.deleteDataSource(id);
  }

  // Conversation and message operations
  async createConversation(conversationData) {
    return await prismaService.createConversation(conversationData);
  }
  
  async getConversationById(id) {
    return await prismaService.getConversationById(id);
  }
  
  async getChatbotConversations(chatbotId, limit = 50, offset = 0) {
    return await prismaService.getChatbotConversations(chatbotId, limit, offset);
  }
  
  async createMessage(messageData) {
    return await prismaService.createMessage(messageData);
  }
  
  async getConversationMessages(conversationId) {
    return await prismaService.getConversationMessages(conversationId);
  }

  // Analytics
  async getChatbotAnalytics(chatbotId, startDate, endDate) {
    return await prismaService.getChatbotAnalytics(chatbotId, startDate, endDate);
  }
  
  async getUserUsageTracking(userId, month) {
    return await prismaService.getUserUsageTracking(userId, month);
  }

  // Lead capture
  async createCapturedLead(leadData) {
    return await prismaService.createCapturedLead(leadData);
  }
  
  async getChatbotLeads(chatbotId, limit = 50, offset = 0) {
    return await prismaService.getChatbotLeads(chatbotId, limit, offset);
  }
  
  async subscribeToChanges(table, callback) {
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe();
  }
}

export default new SupabaseService();