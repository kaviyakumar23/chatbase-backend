import { PrismaClient } from '../generated/prisma/index.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import storageService from '../services/storageService.js';
import logger from '../utils/logger.js';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

// GET /api/agents/:agentId/leads
export const getLeads = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;
    const {
      page = 1,
      limit = 20,
      exported = undefined
    } = req.query;

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {
      agentId,
      ...(exported !== undefined && {
        exported: exported === 'true'
      })
    };

    const [leads, totalCount] = await Promise.all([
      prisma.capturedLead.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          capturedAt: true,
          sessionId: true,
          metadata: true,
          exported: true
        },
        orderBy: { capturedAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.capturedLead.count({ where: whereClause })
    ]);

    const response = {
      leads: leads.map(lead => ({
        id: lead.id,
        email: lead.email,
        name: lead.name,
        phone: lead.phone,
        captured_at: lead.capturedAt,
        session_id: lead.sessionId,
        metadata: lead.metadata,
        exported: lead.exported
      })),
      total: totalCount,
      page: parseInt(page)
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Get leads error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// PUT /api/agents/:agentId/leads/:leadId
export const updateLead = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId, leadId } = req.params;
    const { exported } = req.body;

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Check if lead exists and belongs to agent
    const existingLead = await prisma.capturedLead.findFirst({
      where: { id: leadId, agentId }
    });

    if (!existingLead) {
      return res.status(404).json(createErrorResponse('Lead not found'));
    }

    const updateData = {};
    if (exported !== undefined) updateData.exported = exported;

    const lead = await prisma.capturedLead.update({
      where: { id: leadId },
      data: updateData
    });

    const response = {
      id: lead.id,
      exported: lead.exported,
      updated_at: new Date()
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Update lead error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// POST /api/agents/:agentId/leads/export
export const exportLeads = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;
    const { format = 'csv', date_range } = req.body;

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Build date filter
    const dateFilter = {};
    if (date_range?.start) {
      dateFilter.gte = new Date(date_range.start);
    }
    if (date_range?.end) {
      dateFilter.lte = new Date(date_range.end);
    }

    const whereClause = {
      agentId,
      ...(Object.keys(dateFilter).length > 0 && {
        capturedAt: dateFilter
      })
    };

    // Get leads data
    const leads = await prisma.capturedLead.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        metadata: true,
        sessionId: true,
        capturedAt: true,
        exported: true
      },
      orderBy: { capturedAt: 'desc' }
    });

    if (leads.length === 0) {
      return res.status(400).json(createErrorResponse('No leads found for the specified date range'));
    }

    // Generate export file
    let fileContent = '';
    let fileExtension = '';
    let mimeType = '';

    if (format === 'csv') {
      const csvHeaders = 'ID,Email,Name,Phone,Company,Session ID,Captured At,Exported,Metadata\n';
      const csvRows = leads.map(lead => {
        const metadata = JSON.stringify(lead.metadata).replace(/"/g, '""');
        return [
          lead.id,
          lead.email || '',
          lead.name || '',
          lead.phone || '',
          lead.company || '',
          lead.sessionId,
          lead.capturedAt.toISOString(),
          lead.exported,
          `"${metadata}"`
        ].join(',');
      }).join('\n');

      fileContent = csvHeaders + csvRows;
      fileExtension = 'csv';
      mimeType = 'text/csv';
    } else {
      return res.status(400).json(createErrorResponse('Unsupported export format'));
    }

    // Upload to R2
    const exportId = nanoid(10);
    const fileName = `leads_export_${exportId}.${fileExtension}`;
    const fileKey = `exports/${userId}/${fileName}`;

    const uploadResult = await storageService.uploadFile(
      fileKey,
      Buffer.from(fileContent),
      mimeType,
      { agentId, exportType: 'leads', userId }
    );

    // Generate signed download URL (valid for 24 hours)
    const downloadUrl = await storageService.generatePresignedDownloadUrl(fileKey, 86400);

    const response = {
      download_url: downloadUrl,
      expires_at: new Date(Date.now() + 86400 * 1000).toISOString()
    };

    res.json(createSuccessResponse(response));
  } catch (error) {
    logger.error('Export leads error:', error);
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