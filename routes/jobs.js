import express from 'express';
import { 
  getJobStatus,
  getAgentJobs,
  getSourceJobs,
  retryJob,
  cancelJob
} from '../controllers/jobController.js';

const router = express.Router();

// Get job status
router.get('/:jobId', getJobStatus);

// Get all jobs for an agent
router.get('/agents/:agentId/jobs', getAgentJobs);

// Get jobs for a specific source
router.get('/agents/:agentId/sources/:sourceId/jobs', getSourceJobs);

// Retry a failed job
router.post('/:jobId/retry', retryJob);

// Cancel a job
router.delete('/:jobId', cancelJob);

export default router;