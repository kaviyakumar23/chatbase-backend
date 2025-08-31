/**
 * Job Processing Example
 * 
 * This example demonstrates how to use the job processing system
 * for different types of sources with real-time updates.
 */

import { createClient } from '@supabase/supabase-js';

// Configuration (replace with your actual values)
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';
const API_BASE_URL = 'http://localhost:3000/api/v1';
const AGENT_ID = 'your-agent-id';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Example 1: Upload and process a text source with real-time tracking
async function processTextSource() {
  console.log('📝 Processing text source...');

  try {
    // Create text source
    const response = await fetch(`${API_BASE_URL}/agents/${AGENT_ID}/sources/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-jwt-token' // Replace with actual auth
      },
      body: JSON.stringify({
        name: 'Sample Text',
        content: 'This is a sample text that will be processed and indexed for vector search.'
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }

    const { jobId } = result.data;
    console.log(`✅ Text source created with job ID: ${jobId}`);

    // Subscribe to job updates
    await subscribeToJobUpdates(jobId);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Example 2: Upload and process a file source
async function processFileSource() {
  console.log('📄 Processing file source...');

  try {
    // First, get upload URL
    const uploadResponse = await fetch(`${API_BASE_URL}/agents/${AGENT_ID}/sources/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-jwt-token'
      },
      body: JSON.stringify({
        fileName: 'sample.pdf',
        contentType: 'application/pdf'
      })
    });

    const uploadData = await uploadResponse.json();
    
    if (!uploadData.success) {
      throw new Error(uploadData.message);
    }

    console.log('📤 Upload URL received, upload your file to:', uploadData.data.uploadUrl);
    
    // After file upload, create source record
    const sourceResponse = await fetch(`${API_BASE_URL}/agents/${AGENT_ID}/sources/file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-jwt-token'
      },
      body: JSON.stringify({
        name: 'My PDF Document',
        url: `https://${uploadData.data.bucket}.${uploadData.data.accountId}.r2.cloudflarestorage.com/${uploadData.data.fileKey}`,
        originalName: 'sample.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024000 // 1MB example
      })
    });

    const sourceResult = await sourceResponse.json();
    
    if (!sourceResult.success) {
      throw new Error(sourceResult.message);
    }

    const { jobId } = sourceResult.data;
    console.log(`✅ File source created with job ID: ${jobId}`);

    // Subscribe to job updates
    await subscribeToJobUpdates(jobId);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Example 3: Crawl and process a website
async function processWebsiteSource() {
  console.log('🌐 Processing website source...');

  try {
    const response = await fetch(`${API_BASE_URL}/agents/${AGENT_ID}/sources/website`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-jwt-token'
      },
      body: JSON.stringify({
        url: 'https://example.com',
        crawl_subpages: true,
        max_pages: 5
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }

    const { jobId } = result.data;
    console.log(`✅ Website source created with job ID: ${jobId}`);

    // Subscribe to job updates
    await subscribeToJobUpdates(jobId);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Subscribe to real-time job updates
async function subscribeToJobUpdates(jobId) {
  console.log(`📡 Subscribing to updates for job ${jobId}...`);

  const channel = supabase.channel(`job_${jobId}`);
  
  channel.on('broadcast', { event: 'job_status_update' }, (payload) => {
    const { status, progress, errorMessage } = payload.payload;
    
    console.log(`📊 Job Update:`, {
      status,
      progress: progress?.step,
      percent: progress?.percent,
      error: errorMessage
    });

    // Handle completion
    if (status === 'completed') {
      console.log('🎉 Job completed successfully!');
      channel.unsubscribe();
    } else if (status === 'failed') {
      console.log('💥 Job failed:', errorMessage);
      channel.unsubscribe();
    }
  });

  await channel.subscribe();
  console.log('✅ Subscribed to real-time updates');
}

// Example 4: Poll job status (alternative to real-time)
async function pollJobStatus(jobId) {
  console.log(`🔄 Polling status for job ${jobId}...`);

  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  const poll = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        headers: {
          'Authorization': 'Bearer your-jwt-token'
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message);
      }

      const { status, progress } = result.data;
      console.log(`📊 Job Status: ${status} (${progress?.percent || 0}%)`);

      if (status === 'completed') {
        console.log('🎉 Job completed!');
        return;
      }

      if (status === 'failed') {
        console.log('💥 Job failed:', result.data.errorMessage);
        return;
      }

      // Continue polling if still processing
      if (attempts < maxAttempts && ['pending', 'processing'].includes(status)) {
        attempts++;
        setTimeout(poll, 5000); // Poll every 5 seconds
      }

    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  };

  await poll();
}

// Example usage
async function runExamples() {
  console.log('🎯 Job Processing Examples\n');
  console.log('Choose an example to run:');
  console.log('1. Process text source');
  console.log('2. Process file source');  
  console.log('3. Process website source');
  console.log('4. Poll job status');
  
  // For demonstration, run text processing
  // In practice, you'd choose based on user input
  await processTextSource();
}

// Uncomment to run examples
// runExamples().catch(console.error);

export {
  processTextSource,
  processFileSource,
  processWebsiteSource,
  subscribeToJobUpdates,
  pollJobStatus
};