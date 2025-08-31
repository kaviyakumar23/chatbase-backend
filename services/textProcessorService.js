import logger from '../utils/logger.js';

class TextProcessorService {
  
  // Enhanced text chunking with semantic awareness
  chunkTextSemantically(text, maxChunkSize = 1000, overlap = 100) {
    // Clean the text first
    const cleanedText = this.cleanText(text);
    
    // Split into paragraphs first
    const paragraphs = cleanedText.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;

      const potentialChunk = currentChunk + 
        (currentChunk ? '\n\n' : '') + trimmedParagraph;

      if (potentialChunk.length <= maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        // If current chunk has content, save it
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // If paragraph is too long, split by sentences
        if (trimmedParagraph.length > maxChunkSize) {
          const sentenceChunks = this.chunkBySentences(trimmedParagraph, maxChunkSize);
          chunks.push(...sentenceChunks);
          currentChunk = '';
        } else {
          currentChunk = trimmedParagraph;
        }
      }
    }

    // Add the last chunk if it has content
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    // Add overlap between chunks for better context
    return this.addOverlapToChunks(chunks, overlap);
  }

  // Split text by sentences when paragraphs are too long
  chunkBySentences(text, maxSize) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const potentialChunk = currentChunk + 
        (currentChunk ? '. ' : '') + trimmedSentence;

      if (potentialChunk.length <= maxSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        
        // Handle very long sentences by splitting by words
        if (trimmedSentence.length > maxSize) {
          const wordChunks = this.chunkByWords(trimmedSentence, maxSize);
          chunks.push(...wordChunks);
          currentChunk = '';
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks;
  }

  // Split by words as last resort
  chunkByWords(text, maxSize) {
    const words = text.split(/\s+/);
    const chunks = [];
    let currentChunk = '';

    for (const word of words) {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + word;
      
      if (potentialChunk.length <= maxSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        // Handle extremely long words
        currentChunk = word.length <= maxSize ? word : word.substring(0, maxSize);
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  // Add overlap between chunks for better context preservation
  addOverlapToChunks(chunks, overlapSize) {
    if (chunks.length <= 1 || overlapSize <= 0) {
      return chunks;
    }

    const overlappedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i];
      
      // Add overlap from previous chunk (end of previous chunk)
      if (i > 0 && overlapSize > 0) {
        const prevChunk = chunks[i - 1];
        const overlapWords = this.getLastWords(prevChunk, overlapSize);
        if (overlapWords) {
          chunk = `...${overlapWords} ${chunk}`;
        }
      }
      
      overlappedChunks.push(chunk);
    }

    return overlappedChunks;
  }

  // Get last N characters worth of words from text
  getLastWords(text, maxLength) {
    const words = text.split(/\s+/);
    let result = '';
    
    for (let i = words.length - 1; i >= 0; i--) {
      const potentialResult = words[i] + (result ? ' ' + result : '');
      if (potentialResult.length <= maxLength) {
        result = potentialResult;
      } else {
        break;
      }
    }
    
    return result;
  }

  // Clean text content
  cleanText(text) {
    if (!text) return '';
    
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive empty lines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Trim whitespace
      .trim();
  }

  // Extract metadata from content
  extractMetadata(content, sourceType, sourceName) {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = content.length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // Average reading speed

    const metadata = {
      sourceType,
      sourceName,
      wordCount,
      charCount,
      estimatedReadTime,
      language: this.detectLanguage(content),
      extractedAt: new Date().toISOString()
    };

    // Add type-specific metadata
    if (sourceType === 'website') {
      metadata.hasLinks = /https?:\/\//.test(content);
      metadata.hasCode = /```|<code>|function\s*\(/.test(content);
    }

    return metadata;
  }

  // Basic language detection (could be enhanced with a proper library)
  detectLanguage(text) {
    // Very basic detection - in production, use a proper library
    const sample = text.substring(0, 500).toLowerCase();
    
    const patterns = {
      'en': /\b(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|two|way|who|boy|did|man|who|oil|sit|set)\b/g,
      'es': /\b(que|de|no|el|la|en|es|se|le|da|su|por|son|con|para|una|las|los|del|más|muy|fue|ser|han|era)\b/g,
      'fr': /\b(le|de|et|à|un|il|être|et|en|avoir|que|pour|dans|ce|son|une|sur|avec|ne|se|pas|tout|plus|par)\b/g
    };

    let maxMatches = 0;
    let detectedLanguage = 'en';

    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = (sample.match(pattern) || []).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLanguage = lang;
      }
    }

    return detectedLanguage;
  }
}

export default new TextProcessorService();