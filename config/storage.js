import { S3Client } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
  // R2-specific configurations
  forcePathStyle: false, // Use virtual-hosted-style URLs
  maxAttempts: 3, // Retry configuration
});

const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
export { r2Client, bucketName };