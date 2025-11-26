// Cloudflare Workers global types

// crypto is globally available in Workers
declare const crypto: Crypto;

interface Crypto {
  randomUUID(): string;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  subtle: SubtleCrypto;
}

// Response is globally available in Workers
declare const Response: typeof Response;

