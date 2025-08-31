import storageService from './storageService.js';
import vectorService from './vectorService.js';
import jobService from './jobService.js';
import { prisma } from '../config/prisma.js';
import logger from '../utils/logger.js';
import textProcessorService from './textProcessorService.js';
import realtimeService from './realtimeService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cheerio from 'cheerio';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { parse as csvParse } from 'csv-parse';
import { NodeHtmlParser } from 'node-html-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class SourceProcessorService {
  
  // Main processing entry point
  async processSource(jobId, dataSourceId, type) {
    try {
      await jobService.updateJob(jobId, {
        status: 'processing',
        startedAt: new Date(),
        progress: { step: 'starting', percent: 0 }
      });

      const dataSource = await prisma.dataSource.findUnique({
        where: { id: dataSourceId },
        include: { chatbots: true }
      });

      if (!dataSource) {
        throw new Error('Data source not found');
      }

      let result;
      switch (type) {
        case 'process_file':
          result = await this.processFileSource(jobId, dataSource);
          break;
        case 'process_text':
          result = await this.processTextSource(jobId, dataSource);
          break;
        case 'crawl_website':
          result = await this.processWebsiteSource(jobId, dataSource);
          break;
        default:
          throw new Error(`Unknown job type: ${type}`);
      }

      // Update job as completed
      await jobService.updateJob(jobId, {
        status: 'completed',
        completedAt: new Date(),
        result,
        progress: { step: 'completed', percent: 100 }
      });

      // Update data source status
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          status: 'completed',
          processedAt: new Date(),
          charCount: result.totalCharacters || null,
          chunkCount: result.totalChunks || null
        }
      });

      logger.info(`Successfully processed source ${dataSourceId} with job ${jobId}`);
      return result;

    } catch (error) {
      logger.error(`Error processing source ${dataSourceId}:`, error);
      
      // Update job as failed
      await jobService.handleJobFailure(jobId, error);
      
      // Update data source status
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          status: 'failed',
          errorMessage: error.message
        }
      });

      throw error;
    }
  }

  // Process text source (immediate processing)
  async processTextSource(jobId, dataSource) {
    await this.notifyProgress(jobId, 'processing_text', 20, {
      chunksToProcess: 0
    });

    const content = dataSource.sourceConfig.content;
    const chunks = textProcessorService.chunkTextSemantically(content);

    await this.notifyProgress(jobId, 'generating_embeddings', 50, {
      chunksToProcess: chunks.length
    });

    // Generate embeddings and store in Pinecone
    const vectorResults = await this.generateAndStoreEmbeddings(
      chunks,
      dataSource.id,
      dataSource.chatbot_id,
      dataSource.chatbots.vector_namespace,
      jobId
    );

    await this.notifyProgress(jobId, 'finalizing', 90, {
      vectorsStored: vectorResults.length
    });

    return {
      totalCharacters: content.length,
      totalChunks: chunks.length,
      vectorsStored: vectorResults.length
    };
  }

  // Process file source (download from R2 and extract content)
  async processFileSource(jobId, dataSource) {
    await this.notifyProgress(jobId, 'downloading_file', 10);

    // Extract file key from URL or use r2Key if available
    const fileUrl = dataSource.sourceConfig.url;
    let fileKey = dataSource.r2Key;

    if (!fileKey && fileUrl) {
      // Extract key from URL pattern: https://bucket.endpoint/key
      const urlParts = new URL(fileUrl);
      fileKey = urlParts.pathname.substring(1); // Remove leading slash
    }

    if (!fileKey) {
      throw new Error('No file key found to download file');
    }

    // Download file from R2
    const fileResponse = await storageService.getFile(fileKey);
    const fileBuffer = Buffer.from(await fileResponse.Body.transformToByteArray());

    await this.notifyProgress(jobId, 'extracting_content', 30, {
      fileSize: fileBuffer.length,
      mimeType
    });

    // Extract text content based on file type
    const mimeType = dataSource.sourceConfig.mimeType || 'application/octet-stream';
    let textContent;

    switch (mimeType) {
      case 'application/pdf':
        textContent = await this.extractPdfText(fileBuffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        textContent = await this.extractDocxText(fileBuffer);
        break;
      case 'text/csv':
        textContent = await this.extractCsvText(fileBuffer);
        break;
      case 'application/json':
        textContent = await this.extractJsonText(fileBuffer);
        break;
      case 'text/plain':
      case 'text/markdown':
      default:
        textContent = fileBuffer.toString('utf-8');
        break;
    }

    await this.notifyProgress(jobId, 'chunking_content', 50, {
      extractedLength: textContent.length
    });

    // Chunk the extracted text
    const chunks = textProcessorService.chunkTextSemantically(textContent);

    await this.notifyProgress(jobId, 'generating_embeddings', 70, {
      chunksToProcess: chunks.length
    });

    // Generate embeddings and store in Pinecone
    const vectorResults = await this.generateAndStoreEmbeddings(
      chunks,
      dataSource.id,
      dataSource.chatbot_id,
      dataSource.chatbots.vector_namespace
    );

    await jobService.updateJob(jobId, {
      progress: { step: 'finalizing', percent: 90 }
    });

    return {
      totalCharacters: textContent.length,
      totalChunks: chunks.length,
      vectorsStored: vectorResults.length,
      extractedContent: textContent.substring(0, 1000) + '...' // First 1000 chars for preview
    };
  }

  // Process website source (crawl and extract content)
  async processWebsiteSource(jobId, dataSource) {
    const config = dataSource.sourceConfig;
    const baseUrl = config.url;
    const crawlSubpages = config.crawl_subpages || false;
    const maxPages = config.max_pages || 10;

    await this.notifyProgress(jobId, 'crawling_website', 20, {
      maxPages,
      crawlSubpages
    });

    let allContent = '';
    const crawledUrls = new Set();
    const urlQueue = [baseUrl];
    let pagesCrawled = 0;

    while (urlQueue.length > 0 && pagesCrawled < maxPages) {
      const currentUrl = urlQueue.shift();
      
      if (crawledUrls.has(currentUrl)) continue;
      crawledUrls.add(currentUrl);

      try {
        const pageContent = await this.crawlSinglePage(currentUrl);
        allContent += `\n\n--- Content from ${currentUrl} ---\n\n${pageContent.text}`;
        
        // If crawling subpages, add new URLs to queue
        if (crawlSubpages && pageContent.links) {
          for (const link of pageContent.links) {
            const fullUrl = this.resolveUrl(link, baseUrl);
            if (this.isSameDomain(fullUrl, baseUrl) && !crawledUrls.has(fullUrl)) {
              urlQueue.push(fullUrl);
            }
          }
        }

        pagesCrawled++;
        
        await this.notifyProgress(jobId, 'crawling_website', 20 + (pagesCrawled / maxPages) * 30, {
          pagesCrawled,
          totalPages: Math.min(urlQueue.length + pagesCrawled, maxPages),
          currentUrl
        });

      } catch (error) {
        logger.warn(`Failed to crawl ${currentUrl}:`, error);
        continue;
      }
    }

    await this.notifyProgress(jobId, 'chunking_content', 60, {
      totalContentLength: allContent.length
    });

    // Chunk the extracted content
    const chunks = textProcessorService.chunkTextSemantically(allContent);

    await this.notifyProgress(jobId, 'generating_embeddings', 80, {
      chunksToProcess: chunks.length
    });

    // Generate embeddings and store in Pinecone
    const vectorResults = await this.generateAndStoreEmbeddings(
      chunks,
      dataSource.id,
      dataSource.chatbot_id,
      dataSource.chatbots.vector_namespace,
      jobId
    );

    return {
      totalCharacters: allContent.length,
      totalChunks: chunks.length,
      vectorsStored: vectorResults.length,
      pagesCrawled,
      crawledUrls: Array.from(crawledUrls)
    };
  }

  // Crawl a single webpage and extract content
  async crawlSinglePage(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Chatbase-Bot/1.0)'
        },
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script and style elements
      $('script, style, nav, header, footer, .navigation').remove();

      // Extract main content
      let mainContent = '';
      const contentSelectors = ['main', 'article', '.content', '#content', '.main'];
      
      for (const selector of contentSelectors) {
        const content = $(selector).text().trim();
        if (content.length > mainContent.length) {
          mainContent = content;
        }
      }

      // Fallback to body if no main content found
      if (!mainContent) {
        mainContent = $('body').text().trim();
      }

      // Extract links for subpage crawling
      const links = [];
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
          links.push(href);
        }
      });

      // Clean up content
      const cleanedContent = mainContent
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      return {
        text: cleanedContent,
        links: links.slice(0, 50) // Limit links to prevent memory issues
      };

    } catch (error) {
      throw new Error(`Failed to crawl ${url}: ${error.message}`);
    }
  }

  // Utility methods for text extraction
  async extractPdfText(buffer) {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  async extractDocxText(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  async extractCsvText(buffer) {
    try {
      const content = buffer.toString('utf-8');
      return new Promise((resolve, reject) => {
        const rows = [];
        csvParse(content, { columns: true }, (err, records) => {
          if (err) {
            reject(new Error(`CSV parsing failed: ${err.message}`));
          } else {
            const text = records.map(record => 
              Object.values(record).join(' ')
            ).join('\n');
            resolve(text);
          }
        });
      });
    } catch (error) {
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }

  async extractJsonText(buffer) {
    try {
      const jsonData = JSON.parse(buffer.toString('utf-8'));
      return JSON.stringify(jsonData, null, 2);
    } catch (error) {
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
  }

  // Notify progress with real-time updates
  async notifyProgress(jobId, step, percent, additionalData = {}) {
    try {
      const progressData = { step, percent, ...additionalData };
      
      await jobService.updateJob(jobId, {
        progress: progressData
      });

      await realtimeService.publishJobUpdate(jobId, {
        status: 'processing',
        progress: progressData
      });
    } catch (error) {
      logger.warn('Failed to notify progress:', error);
    }
  }

  // Generate embeddings and store in Pinecone
  async generateAndStoreEmbeddings(chunks, sourceId, chatbotId, vectorNamespace, jobId = null) {
    try {
      const vectors = [];
      const totalChunks = chunks.length;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Update progress for embedding generation
        if (jobId && i % 5 === 0) { // Update every 5 chunks to avoid too frequent updates
          const embeddingProgress = 70 + (i / totalChunks) * 15; // 70-85% for embedding
          await this.notifyProgress(jobId, 'generating_embeddings', embeddingProgress, {
            processedChunks: i,
            totalChunks
          });
        }
        
        // Generate embedding using OpenAI or your preferred service
        const embedding = await this.generateEmbedding(chunk);
        
        const vectorId = `${sourceId}_chunk_${i}`;
        const metadata = {
          source_id: sourceId,
          agent_id: chatbotId,
          chunk_index: i,
          text: chunk,
          char_count: chunk.length,
          namespace: vectorNamespace,
          word_count: chunk.split(/\s+/).length,
          created_at: new Date().toISOString()
        };

        vectors.push(vectorService.formatVectorForUpsert(vectorId, embedding, metadata));
      }

      // Update progress for vector storage
      if (jobId) {
        await this.notifyProgress(jobId, 'storing_vectors', 85, {
          vectorsToStore: vectors.length
        });
      }

      // Batch upsert to Pinecone
      await vectorService.batchUpsert(vectors);
      
      logger.info(`Stored ${vectors.length} vectors in Pinecone for source ${sourceId}`);
      return vectors;

    } catch (error) {
      throw new Error(`Failed to generate and store embeddings: ${error.message}`);
    }
  }

  // Generate embedding for a text chunk
  async generateEmbedding(text) {
    try {
      // Use environment variable to decide between OpenAI and mock embeddings
      if (process.env.OPENAI_API_KEY) {
        const OpenAI = await import('openai');
        const openai = new OpenAI.default({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: text,
        });
        
        return response.data[0].embedding;
      } else {
        // Use mock embeddings for development
        logger.warn('Using mock embeddings - set OPENAI_API_KEY for real embeddings');
        return new Array(1536).fill(0).map(() => Math.random() - 0.5);
      }
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  // URL utilities for website crawling
  resolveUrl(link, baseUrl) {
    try {
      return new URL(link, baseUrl).href;
    } catch {
      return null;
    }
  }

  isSameDomain(url1, url2) {
    try {
      const domain1 = new URL(url1).hostname;
      const domain2 = new URL(url2).hostname;
      return domain1 === domain2;
    } catch {
      return false;
    }
  }
}

export default new SourceProcessorService();