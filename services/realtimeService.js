import { supabase } from '../config/index.js';
import logger from '../utils/logger.js';

class RealtimeService {
  constructor() {
    this.activeChannels = new Map();
  }

  // Publish job status update
  async publishJobUpdate(jobId, update) {
    try {
      const channelName = `job_${jobId}`;
      let channel = this.activeChannels.get(channelName);

      if (!channel) {
        channel = supabase.channel(channelName, {
          config: {
            broadcast: { self: true }
          }
        });
        
        await channel.subscribe();
        this.activeChannels.set(channelName, channel);
      }

      const payload = {
        jobId,
        ...update,
        timestamp: new Date().toISOString()
      };

      await channel.send({
        type: 'broadcast',
        event: 'job_status_update',
        payload
      });

      logger.debug(`Published job update for ${jobId}:`, payload);
      return true;

    } catch (error) {
      logger.error('Failed to publish job update:', error);
      return false;
    }
  }

  // Publish source status update
  async publishSourceUpdate(sourceId, agentId, update) {
    try {
      const channelName = `agent_${agentId}_sources`;
      let channel = this.activeChannels.get(channelName);

      if (!channel) {
        channel = supabase.channel(channelName, {
          config: {
            broadcast: { self: true }
          }
        });
        
        await channel.subscribe();
        this.activeChannels.set(channelName, channel);
      }

      const payload = {
        sourceId,
        agentId,
        ...update,
        timestamp: new Date().toISOString()
      };

      await channel.send({
        type: 'broadcast',
        event: 'source_status_update',
        payload
      });

      logger.debug(`Published source update for ${sourceId}:`, payload);
      return true;

    } catch (error) {
      logger.error('Failed to publish source update:', error);
      return false;
    }
  }

  // Cleanup inactive channels
  async cleanupChannels() {
    try {
      for (const [channelName, channel] of this.activeChannels.entries()) {
        await channel.unsubscribe();
        this.activeChannels.delete(channelName);
      }
      logger.info('Cleaned up realtime channels');
    } catch (error) {
      logger.error('Error cleaning up channels:', error);
    }
  }

  // Subscribe to database changes (for advanced use cases)
  async subscribeToJobUpdates(callback) {
    try {
      const channel = supabase
        .channel('job-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'jobs'
        }, (payload) => {
          logger.debug('Job database change:', payload);
          if (callback) callback(payload);
        })
        .subscribe();

      return channel;
    } catch (error) {
      logger.error('Error subscribing to job updates:', error);
      throw error;
    }
  }
}

export default new RealtimeService();