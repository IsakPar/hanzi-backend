/**
 * Storage Operations (S3 + R2)
 * 
 * Uses AWS SDK v3 for S3 and S3-compatible APIs (R2).
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { R2Manifest, R2ObjectEntry } from './types';

// ============================================================================
// S3 CLIENT
// ============================================================================

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;  // For R2 S3-compatible endpoint
}

function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: !!config.endpoint,  // Required for R2
  });
}

/**
 * Upload a file to S3.
 */
export async function uploadToS3(
  config: S3Config,
  key: string,
  data: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<void> {
  const client = createS3Client(config);
  
  console.log(`[S3] Uploading to ${config.bucket}/${key}`);
  console.log(`[S3] Size: ${formatBytes(data.length)}`);
  
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: data,
    ContentType: contentType,
  }));
  
  console.log(`[S3] Upload complete: ${key}`);
}

/**
 * Download a file from S3.
 */
export async function downloadFromS3(
  config: S3Config,
  key: string
): Promise<Buffer> {
  const client = createS3Client(config);
  
  console.log(`[S3] Downloading ${config.bucket}/${key}`);
  
  const response = await client.send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }));
  
  if (!response.Body) {
    throw new Error('Empty response body from S3');
  }
  
  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  
  console.log(`[S3] Downloaded: ${formatBytes(buffer.length)}`);
  
  return buffer;
}

/**
 * List objects in S3 bucket with prefix.
 */
export async function listS3Objects(
  config: S3Config,
  prefix: string = ''
): Promise<S3Object[]> {
  const client = createS3Client(config);
  const objects: S3Object[] = [];
  let continuationToken: string | undefined;
  
  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    
    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          objects.push({
            key: obj.Key,
            size: obj.Size || 0,
            lastModified: obj.LastModified?.toISOString() || '',
            etag: obj.ETag?.replace(/"/g, '') || '',
          });
        }
      }
    }
    
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  
  return objects;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
}

// ============================================================================
// R2 OPERATIONS (S3-compatible)
// ============================================================================

export interface R2Config {
  bucket: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function r2ToS3Config(config: R2Config): S3Config {
  return {
    bucket: config.bucket,
    region: 'auto',  // R2 uses 'auto' as region
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  };
}

/**
 * Upload to R2 using S3-compatible API.
 */
export async function uploadToR2(
  config: R2Config,
  key: string,
  data: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<void> {
  return uploadToS3(r2ToS3Config(config), key, data, contentType);
}

/**
 * Download from R2 using S3-compatible API.
 */
export async function downloadFromR2(
  config: R2Config,
  key: string
): Promise<Buffer> {
  return downloadFromS3(r2ToS3Config(config), key);
}

/**
 * Build R2 manifest by listing all objects.
 */
export async function buildR2Manifest(config: R2Config): Promise<R2Manifest> {
  console.log(`[R2] Building manifest for bucket: ${config.bucket}`);
  
  const s3Objects = await listS3Objects(r2ToS3Config(config));
  
  const objects: R2ObjectEntry[] = s3Objects.map(obj => ({
    key: obj.key,
    size: obj.size,
    etag: obj.etag,
    last_modified: obj.lastModified,
  }));
  
  const totalBytes = objects.reduce((sum, obj) => sum + obj.size, 0);
  
  console.log(`[R2] Found ${objects.length} objects (${formatBytes(totalBytes)})`);
  
  return {
    bucket: config.bucket,
    objects,
    generated_at: new Date().toISOString(),
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
