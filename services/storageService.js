import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, bucketName } from '../config/storage.js';

class StorageService {
  async uploadFile(key, buffer, contentType, metadata = {}) {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata
    });
    
    await r2Client.send(command);
    
    return {
      key,
      url: `https://${bucketName}.${process.env.CLOUDFLARE_R2_ENDPOINT}/${key}`,
      size: buffer.length,
      contentType
    };
  }
  
  async getFile(key) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    const response = await r2Client.send(command);
    return response;
  }
  
  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    await r2Client.send(command);
    return { success: true };
  }
  
  async getFileMetadata(key) {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    const response = await r2Client.send(command);
    return {
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata
    };
  }
  
  async generatePresignedUploadUrl(key, contentType, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType
    });
    
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return signedUrl;
  }
  
  async generatePresignedDownloadUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return signedUrl;
  }
  
  generateFileKey(userId, originalName, folder = 'uploads') {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `${folder}/${userId}/${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  }
}

export default new StorageService();