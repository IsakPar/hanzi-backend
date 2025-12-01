/**
 * Storage Operations (S3 + R2)
 * 
 * Uses AWS SDK v3 with S3-compatible API for both AWS S3 and Cloudflare R2.
 */

import { R2Manifest, R2ObjectEntry } from './types';

// ============================================================================
// S3 CLIENT (AWS SDK v3 compatible)
// ============================================================================

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;  // For R2 S3-compatible endpoint
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
  const endpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`;
  const url = `${endpoint}/${config.bucket}/${key}`;
  
  const date = new Date();
  const amzDate = formatAmzDate(date);
  const dateStamp = formatDateStamp(date);
  
  // Create canonical request
  const method = 'PUT';
  const contentHash = await sha256Hex(data);
  
  const headers: Record<string, string> = {
    'host': new URL(endpoint).host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': contentHash,
    'content-type': contentType,
    'content-length': String(data.length),
  };
  
  // Sign the request
  const authorization = await signRequest({
    method,
    url,
    headers,
    body: data,
    region: config.region,
    service: 's3',
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    date,
  });
  
  headers['Authorization'] = authorization;
  
  console.log(`[S3] Uploading to ${url}`);
  console.log(`[S3] Size: ${formatBytes(data.length)}`);
  
  const response = await fetch(url, {
    method,
    headers,
    body: data,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`S3 upload failed: ${response.status} ${error}`);
  }
  
  console.log(`[S3] Upload complete: ${key}`);
}

/**
 * Download a file from S3.
 */
export async function downloadFromS3(
  config: S3Config,
  key: string
): Promise<Buffer> {
  const endpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`;
  const url = `${endpoint}/${config.bucket}/${key}`;
  
  const date = new Date();
  const amzDate = formatAmzDate(date);
  
  const headers: Record<string, string> = {
    'host': new URL(endpoint).host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
  };
  
  const authorization = await signRequest({
    method: 'GET',
    url,
    headers,
    body: null,
    region: config.region,
    service: 's3',
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    date,
  });
  
  headers['Authorization'] = authorization;
  
  console.log(`[S3] Downloading from ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`S3 download failed: ${response.status} ${error}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  console.log(`[S3] Downloaded: ${formatBytes(arrayBuffer.byteLength)}`);
  
  return Buffer.from(arrayBuffer);
}

/**
 * List objects in S3 bucket with prefix.
 */
export async function listS3Objects(
  config: S3Config,
  prefix: string = ''
): Promise<S3Object[]> {
  const endpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`;
  const url = `${endpoint}/${config.bucket}?list-type=2&prefix=${encodeURIComponent(prefix)}`;
  
  const date = new Date();
  const amzDate = formatAmzDate(date);
  
  const headers: Record<string, string> = {
    'host': new URL(endpoint).host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
  };
  
  const authorization = await signRequest({
    method: 'GET',
    url,
    headers,
    body: null,
    region: config.region,
    service: 's3',
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    date,
  });
  
  headers['Authorization'] = authorization;
  
  const objects: S3Object[] = [];
  let continuationToken: string | undefined;
  
  do {
    let listUrl = url;
    if (continuationToken) {
      listUrl += `&continuation-token=${encodeURIComponent(continuationToken)}`;
    }
    
    const response = await fetch(listUrl, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`S3 list failed: ${response.status} ${error}`);
    }
    
    const xml = await response.text();
    const parsed = parseListObjectsResponse(xml);
    
    objects.push(...parsed.objects);
    continuationToken = parsed.nextContinuationToken;
    
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

/**
 * Upload to R2 using S3-compatible API.
 */
export async function uploadToR2(
  config: R2Config,
  key: string,
  data: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<void> {
  const s3Config: S3Config = {
    bucket: config.bucket,
    region: 'auto',  // R2 uses 'auto' as region
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  };
  
  return uploadToS3(s3Config, key, data, contentType);
}

/**
 * Download from R2 using S3-compatible API.
 */
export async function downloadFromR2(
  config: R2Config,
  key: string
): Promise<Buffer> {
  const s3Config: S3Config = {
    bucket: config.bucket,
    region: 'auto',
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  };
  
  return downloadFromS3(s3Config, key);
}

/**
 * Build R2 manifest by listing all objects.
 */
export async function buildR2Manifest(config: R2Config): Promise<R2Manifest> {
  console.log(`[R2] Building manifest for bucket: ${config.bucket}`);
  
  const s3Config: S3Config = {
    bucket: config.bucket,
    region: 'auto',
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  };
  
  const s3Objects = await listS3Objects(s3Config);
  
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
// AWS SIGNATURE V4
// ============================================================================

interface SignRequestParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Buffer | null;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  date: Date;
}

async function signRequest(params: SignRequestParams): Promise<string> {
  const { method, url, headers, body, region, service, accessKeyId, secretAccessKey, date } = params;
  
  const amzDate = formatAmzDate(date);
  const dateStamp = formatDateStamp(date);
  
  const parsedUrl = new URL(url);
  const canonicalUri = parsedUrl.pathname;
  const canonicalQueryString = parsedUrl.search.slice(1);  // Remove leading '?'
  
  // Sort headers
  const signedHeaders = Object.keys(headers)
    .map(h => h.toLowerCase())
    .sort()
    .join(';');
  
  const canonicalHeaders = Object.keys(headers)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(h => `${h.toLowerCase()}:${headers[h].trim()}`)
    .join('\n') + '\n';
  
  const payloadHash = body 
    ? await sha256Hex(body) 
    : 'UNSIGNED-PAYLOAD';
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(Buffer.from(canonicalRequest));
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  // Calculate signing key
  const kDate = await hmacSha256(Buffer.from(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  
  const signature = await hmacSha256Hex(kSigning, stringToSign);
  
  return `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// ============================================================================
// XML PARSING (Simple, for S3 list responses)
// ============================================================================

interface ListObjectsResult {
  objects: S3Object[];
  nextContinuationToken?: string;
}

function parseListObjectsResponse(xml: string): ListObjectsResult {
  const objects: S3Object[] = [];
  
  // Extract Contents
  const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;
  
  while ((match = contentsRegex.exec(xml)) !== null) {
    const content = match[1];
    
    const key = extractXmlValue(content, 'Key');
    const size = parseInt(extractXmlValue(content, 'Size') || '0', 10);
    const lastModified = extractXmlValue(content, 'LastModified') || '';
    const etag = extractXmlValue(content, 'ETag')?.replace(/"/g, '') || '';
    
    if (key) {
      objects.push({ key, size, lastModified, etag });
    }
  }
  
  // Check for continuation token
  const nextToken = extractXmlValue(xml, 'NextContinuationToken');
  
  return {
    objects,
    nextContinuationToken: nextToken || undefined,
  };
}

function extractXmlValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1] : null;
}

// ============================================================================
// CRYPTO UTILITIES
// ============================================================================

async function sha256Hex(data: Buffer | string): Promise<string> {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Buffer.from(hash).toString('hex');
}

async function hmacSha256(key: Buffer, data: string): Promise<Buffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, Buffer.from(data));
  return Buffer.from(signature);
}

async function hmacSha256Hex(key: Buffer, data: string): Promise<string> {
  const result = await hmacSha256(key, data);
  return result.toString('hex');
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function formatDateStamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
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

