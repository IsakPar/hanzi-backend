import type {
  R2Bucket,
  R2HTTPMetadata,
  R2Object,
  R2ObjectBody,
  R2PutOptions,
} from '@cloudflare/workers-types';

type StoredObject = {
  body: Uint8Array;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
};

function streamFromBuffer(buffer: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(buffer);
      controller.close();
    },
  });
}

async function toUint8Array(data: R2PutOptions['value']): Promise<Uint8Array> {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer);
  }
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  if (data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }
  if (data instanceof ReadableStream) {
    const reader = data.getReader();
    const chunks: Uint8Array[] = [];
    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return merged;
  }
  throw new Error('Unsupported R2 payload type');
}

export class InMemoryR2Bucket implements R2Bucket {
  private objects = new Map<string, StoredObject>();

  async put(key: string, value: R2PutOptions['value'], options?: R2PutOptions): Promise<R2Object> {
    const body = await toUint8Array(value);
    this.objects.set(key, {
      body,
      httpMetadata: options?.httpMetadata,
      customMetadata: options?.customMetadata,
    });
    return {
      key,
      size: body.length,
      httpMetadata: options?.httpMetadata,
      customMetadata: options?.customMetadata,
      uploaded: new Date(),
      etag: `"${key}"`,
      checksums: {},
    } as R2Object;
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    const stored = this.objects.get(key);
    if (!stored) return null;
    return {
      key,
      size: stored.body.length,
      httpMetadata: stored.httpMetadata,
      customMetadata: stored.customMetadata,
      body: streamFromBuffer(stored.body),
    } as R2ObjectBody;
  }

  async head(key: string): Promise<R2Object | null> {
    const stored = this.objects.get(key);
    if (!stored) return null;
    return {
      key,
      size: stored.body.length,
      httpMetadata: stored.httpMetadata,
      customMetadata: stored.customMetadata,
      uploaded: new Date(),
      etag: `"${key}"`,
      checksums: {},
    } as R2Object;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(): Promise<{ objects: R2Object[] }> {
    const objects: R2Object[] = [];
    for (const [key, stored] of this.objects.entries()) {
      objects.push({
        key,
        size: stored.body.length,
        httpMetadata: stored.httpMetadata,
        customMetadata: stored.customMetadata,
        uploaded: new Date(),
        etag: `"${key}"`,
        checksums: {},
      } as R2Object);
    }
    return { objects };
  }
}

