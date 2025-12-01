#!/usr/bin/env node
/**
 * Quick S3 connectivity test - no TypeScript, just works.
 */

const S3_BUCKET = process.env.S3_BUCKET || 'hm-prod-backups';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error('❌ Missing AWS credentials');
  console.error('Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
  process.exit(1);
}

console.log('');
console.log('════════════════════════════════════════');
console.log('  S3 Connectivity Test');
console.log('════════════════════════════════════════');
console.log(`  Bucket: ${S3_BUCKET}`);
console.log(`  Region: ${S3_REGION}`);
console.log('');

// AWS Signature V4 helpers
async function sha256(data) {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Buffer.from(hash).toString('hex');
}

async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function formatAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function formatDateStamp(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

async function signRequest(method, url, headers, region) {
  const date = new Date();
  const amzDate = formatAmzDate(date);
  const dateStamp = formatDateStamp(date);
  
  const parsedUrl = new URL(url);
  const canonicalUri = parsedUrl.pathname;
  const canonicalQueryString = parsedUrl.search.slice(1);
  
  headers['x-amz-date'] = amzDate;
  headers['x-amz-content-sha256'] = 'UNSIGNED-PAYLOAD';
  
  const signedHeaders = Object.keys(headers).map(h => h.toLowerCase()).sort().join(';');
  const canonicalHeaders = Object.keys(headers)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(h => `${h.toLowerCase()}:${headers[h].trim()}`)
    .join('\n') + '\n';
  
  const canonicalRequest = [
    method, canonicalUri, canonicalQueryString,
    canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'
  ].join('\n');
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    algorithm, amzDate, credentialScope, await sha256(canonicalRequest)
  ].join('\n');
  
  const kDate = await hmacSha256(`AWS4${AWS_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = Buffer.from(await hmacSha256(kSigning, stringToSign)).toString('hex');
  
  return `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function listBucket() {
  const url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/?list-type=2&max-keys=5`;
  const headers = { 'host': `${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com` };
  
  headers['Authorization'] = await signRequest('GET', url, headers, S3_REGION);
  
  console.log('[TEST] Listing bucket...');
  
  const response = await fetch(url, { method: 'GET', headers });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`S3 list failed: ${response.status}\n${error}`);
  }
  
  console.log('[TEST] ✅ Bucket accessible!');
  return true;
}

async function uploadTestFile() {
  const testKey = `test/connectivity-test-${Date.now()}.txt`;
  const testData = `Test file created at ${new Date().toISOString()}`;
  const url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${testKey}`;
  
  const headers = {
    'host': `${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`,
    'content-type': 'text/plain',
    'content-length': String(testData.length),
  };
  
  // For upload we need content hash
  const date = new Date();
  const amzDate = formatAmzDate(date);
  const dateStamp = formatDateStamp(date);
  const contentHash = await sha256(testData);
  
  headers['x-amz-date'] = amzDate;
  headers['x-amz-content-sha256'] = contentHash;
  
  const signedHeaders = Object.keys(headers).map(h => h.toLowerCase()).sort().join(';');
  const canonicalHeaders = Object.keys(headers)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(h => `${h.toLowerCase()}:${headers[h].trim()}`)
    .join('\n') + '\n';
  
  const canonicalRequest = [
    'PUT', `/${testKey}`, '',
    canonicalHeaders, signedHeaders, contentHash
  ].join('\n');
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${S3_REGION}/s3/aws4_request`;
  const stringToSign = [
    algorithm, amzDate, credentialScope, await sha256(canonicalRequest)
  ].join('\n');
  
  const kDate = await hmacSha256(`AWS4${AWS_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, S3_REGION);
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = Buffer.from(await hmacSha256(kSigning, stringToSign)).toString('hex');
  
  headers['Authorization'] = `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  console.log(`[TEST] Uploading test file: ${testKey}`);
  
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: testData,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`S3 upload failed: ${response.status}\n${error}`);
  }
  
  console.log('[TEST] ✅ Upload successful!');
  return testKey;
}

async function main() {
  try {
    // Test 1: List bucket
    await listBucket();
    
    // Test 2: Upload test file
    const key = await uploadTestFile();
    
    console.log('');
    console.log('════════════════════════════════════════');
    console.log('  ✅ ALL TESTS PASSED');
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('S3 is configured correctly!');
    console.log(`Test file uploaded to: s3://${S3_BUCKET}/${key}`);
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('════════════════════════════════════════');
    console.error('  ❌ TEST FAILED');
    console.error('════════════════════════════════════════');
    console.error('');
    console.error(error.message);
    process.exit(1);
  }
}

main();

