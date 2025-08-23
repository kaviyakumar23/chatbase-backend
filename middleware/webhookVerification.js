import { Webhook } from 'svix';
import logger from '../utils/logger.js';

/**
 * Middleware to verify Clerk webhook signatures
 * This ensures that webhooks are actually coming from Clerk
 */
export const verifyClerkWebhook = (req, res, next) => {
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    logger.info('Verifying Clerk webhook');
    if (!webhookSecret) {
      logger.error('CLERK_WEBHOOK_SECRET environment variable is not set');
      return res.status(500).json({ 
        success: false, 
        message: 'Webhook secret not configured' 
      });
    }

    // Get the headers
    const svix_id = req.headers['svix-id'];
    const svix_timestamp = req.headers['svix-timestamp'];
    const svix_signature = req.headers['svix-signature'];

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      logger.warn('Missing Svix headers in webhook request');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing webhook signature headers' 
      });
    }

    // Get the body
    const body = JSON.stringify(req.body);

    // Create a new Svix instance with your secret
    const wh = new Webhook(webhookSecret);

    let evt;
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid webhook signature' 
      });
    }

    // Webhook is verified, add the verified payload to the request
    req.webhookPayload = evt;
    next();
  } catch (error) {
    logger.error('Webhook verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Webhook verification failed' 
    });
  }
};
