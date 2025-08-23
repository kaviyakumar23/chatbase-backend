import { prisma } from '../config/prisma.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import storageService from '../services/storageService.js';
import vectorService from '../services/vectorService.js';
import logger from '../utils/logger.js';
import { convertPrismaArrayToApiResponse, convertPrismaToApiResponse } from '../utils/caseConverter.js';

// GET /api/agents/:agentId/sources
export const getSources = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;

    // Verify agent ownership
    const agent = await prisma.chatbots.findFirst({
      where: { id: agentId, user_id: userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const sources = await prisma.dataSource.findMany({
      where: { chatbot_id: agentId },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        charCount: true,
        chunkCount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const response = {
      sources: convertPrismaArrayToApiResponse(sources, 'source')
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get sources error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// POST /api/agents/:agentId/sources/file
export const createFileSource = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;
    const { name, url, originalName, mimeType, fileSize } = req.body;

    if (!url) {
      return res.status(400).json(createErrorResponse('File URL is required'));
    }

    // Verify agent ownership
    const agent = await prisma.chatbots.findFirst({
      where: { id: agentId, user_id: userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json(createErrorResponse('Invalid file URL provided'));
    }

    // Create data source record
    const dataSource = await prisma.dataSource.create({
      data: {
        chatbot_id: agentId,
        type: 'file',
        name: name || originalName || 'Uploaded File',
        sourceConfig: {
          originalName: originalName || 'file',
          mimeType: mimeType || 'application/octet-stream',
          url: url
        },
        fileSizeBytes: fileSize || 0,
        r2Key: null, // No longer storing R2 key since file is uploaded directly
        status: 'processing'
      }
    });

    // TODO: Queue file processing job (extract text, chunk, embed)
    // This would typically be done with a background job system

    const response = convertPrismaToApiResponse(dataSource, 'source');

    res.status(201).json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Create file source error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// POST /api/agents/:agentId/sources/website
export const createWebsiteSource = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;
    const { url, crawl_subpages = false, max_pages = 10 } = req.body;

    // Verify agent ownership
    const agent = await prisma.chatbots.findFirst({
      where: { id: agentId, user_id: userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json(createErrorResponse('Invalid URL provided'));
    }

    const dataSource = await prisma.dataSource.create({
      data: {
        chatbot_id: agentId,
        type: 'website',
        name: url,
        sourceConfig: {
          url,
          crawl_subpages,
          max_pages
        },
        status: 'processing'
      }
    });

    // TODO: Queue website crawling job
    // This would typically be done with a background job system

    const response = convertPrismaToApiResponse(dataSource, 'source');

    res.status(201).json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Create website source error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// POST /api/agents/:agentId/sources/text
export const createTextSource = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;
    const { name, content } = req.body;

    if (!name || !content) {
      return res.status(400).json(createErrorResponse('Name and content are required'));
    }

    // Verify agent ownership
    const agent = await prisma.chatbots.findFirst({
      where: { id: agentId, user_id: userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const dataSource = await prisma.dataSource.create({
      data: {
        chatbot_id: agentId,
        type: 'text',
        name,
        sourceConfig: {
          content
        },
        charCount: content.length,
        status: 'processing'
      }
    });

    // TODO: Queue text processing job (chunk, embed)
    // This would typically be done with a background job system

    const response = convertPrismaToApiResponse(dataSource, 'source');

    res.status(201).json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Create text source error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// DELETE /api/agents/:agentId/sources/:sourceId
export const deleteSource = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId, sourceId } = req.params;

    // Verify agent ownership
    const agent = await prisma.chatbots.findFirst({
      where: { id: agentId, user_id: userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Get source details
    const source = await prisma.dataSource.findFirst({
      where: { id: sourceId, chatbot_id: agentId }
    });

    if (!source) {
      return res.status(404).json(createErrorResponse('Source not found'));
    }

    // Note: Files are now uploaded directly from frontend to R2
    // Backend doesn't manage file deletion from R2 anymore
    // Frontend should handle file deletion from R2 when deleting sources

    // Delete vectors from Pinecone
    try {
      await vectorService.deleteByFilter({
        agent_id: agentId,
        source_id: sourceId
      });
    } catch (error) {
      logger.warn('Failed to delete vectors from Pinecone:', error);
    }

    // Delete source record
    await prisma.dataSource.delete({
      where: { id: sourceId }
    });

    res.json(createSuccessResponse({
      success: true,
      message: 'Source deleted and vectors removed'
    }));
  } catch (error) {
    logger.error('Delete source error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// POST /api/agents/:agentId/sources/:sourceId/reprocess
export const reprocessSource = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId, sourceId } = req.params;

    // Verify agent ownership
    const agent = await prisma.chatbots.findFirst({
      where: { id: agentId, user_id: userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Get source
    const source = await prisma.dataSource.findFirst({
      where: { id: sourceId, chatbot_id: agentId }
    });

    if (!source) {
      return res.status(404).json(createErrorResponse('Source not found'));
    }

    // Update status to processing
    const updatedSource = await prisma.dataSource.update({
      where: { id: sourceId },
      data: {
        status: 'processing',
        errorMessage: null
      }
    });

    // TODO: Queue reprocessing job
    // This would typically be done with a background job system

    res.json(createSuccessResponse({
      id: updatedSource.id,
      status: updatedSource.status,
      message: 'Source queued for reprocessing'
    }));
  } catch (error) {
    logger.error('Reprocess source error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// POST /api/agents/:agentId/sources/upload-url
export const getUploadUrl = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;
    const { fileName, contentType } = req.body;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    if (!fileName) {
      return res.status(400).json(createErrorResponse('File name is required'));
    }

    // Verify agent ownership
    const agent = await prisma.chatbots.findFirst({
      where: { id: agentId, user_id: userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Generate a unique file key
    const fileKey = storageService.generateFileKey(userId, fileName, 'sources');
    
    // Generate presigned upload URL
    const uploadUrl = await storageService.generatePresignedUploadUrl(
      fileKey,
      contentType || 'application/octet-stream',
      3600 // 1 hour expiry
    );

    res.json(createSuccessResponse({
      uploadUrl,
      fileKey,
      accountId,
      bucket,
      expiresIn: 3600
    }));
  } catch (error) {
    logger.error('Get upload URL error:', error);
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