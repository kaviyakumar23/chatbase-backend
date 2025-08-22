import { PrismaClient } from '../generated/prisma/index.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import storageService from '../services/storageService.js';
import vectorService from '../services/vectorService.js';
import logger from '../utils/logger.js';
import multer from 'multer';

const prisma = new PrismaClient();

// Configure multer for file uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// GET /api/agents/:agentId/sources
export const getSources = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const sources = await prisma.dataSource.findMany({
      where: { agentId },
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
      sources: sources.map(source => ({
        id: source.id,
        type: source.type,
        name: source.name,
        status: source.status,
        char_count: source.charCount,
        chunk_count: source.chunkCount,
        created_at: source.createdAt
      }))
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
    const { name } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json(createErrorResponse('No file provided'));
    }

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Upload file to R2
    const fileKey = storageService.generateFileKey(userId, file.originalname, 'sources');
    const uploadResult = await storageService.uploadFile(
      fileKey,
      file.buffer,
      file.mimetype,
      { agentId, originalName: file.originalname }
    );

    // Create data source record
    const dataSource = await prisma.dataSource.create({
      data: {
        agentId,
        type: 'file',
        name: name || file.originalname,
        sourceConfig: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          url: uploadResult.url
        },
        fileSizeBytes: file.size,
        r2Key: fileKey,
        status: 'processing'
      }
    });

    // TODO: Queue file processing job (extract text, chunk, embed)
    // This would typically be done with a background job system

    const response = {
      id: dataSource.id,
      type: dataSource.type,
      name: dataSource.name,
      status: dataSource.status,
      file_size_bytes: dataSource.fileSizeBytes,
      r2_key: dataSource.r2Key,
      created_at: dataSource.createdAt
    };

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
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
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
        agentId,
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

    const response = {
      id: dataSource.id,
      type: dataSource.type,
      name: dataSource.name,
      status: dataSource.status,
      source_config: {
        url: url,
        crawl_subpages: crawl_subpages,
        max_pages: max_pages
      }
    };

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
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const dataSource = await prisma.dataSource.create({
      data: {
        agentId,
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

    const response = {
      id: dataSource.id,
      type: dataSource.type,
      name: dataSource.name,
      status: dataSource.status,
      char_count: dataSource.charCount
    };

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
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Get source details
    const source = await prisma.dataSource.findFirst({
      where: { id: sourceId, agentId }
    });

    if (!source) {
      return res.status(404).json(createErrorResponse('Source not found'));
    }

    // Delete from R2 if it's a file
    if (source.type === 'file' && source.r2Key) {
      try {
        await storageService.deleteFile(source.r2Key);
      } catch (error) {
        logger.warn('Failed to delete file from R2:', error);
      }
    }

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

    // Update agent sources count
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        sourcesCount: {
          decrement: 1
        }
      }
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
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Get source
    const source = await prisma.dataSource.findFirst({
      where: { id: sourceId, agentId }
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