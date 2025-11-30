/**
 * Vectorize Service
 * Handles embedding generation and semantic vector search
 * 
 * Uses Cloudflare Workers AI for embeddings (BGE model - 768 dimensions)
 * Uses Cloudflare Vectorize for vector storage and similarity search
 */

import type { VectorizeIndex, Ai, VectorizeVector } from '@cloudflare/workers-types';
import { logWithContext } from '../utils/logger';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type EmbeddableType = 'vocabulary' | 'lesson' | 'story' | 'sentence';

export interface VectorMetadata {
  type: EmbeddableType;
  id: string;
  title?: string;
  hskLevel?: number;
  hanzi?: string;
  pinyin?: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: VectorMetadata;
}

export interface SearchOptions {
  type?: EmbeddableType;
  hskLevel?: number;
  topK?: number;
}

// ═══════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════

export class VectorizeService {
  private vectorize: VectorizeIndex;
  private ai: Ai;
  private requestId: string;

  constructor(vectorize: VectorizeIndex, ai: Ai, requestId: string = 'system') {
    this.vectorize = vectorize;
    this.ai = ai;
    this.requestId = requestId;
  }

  /**
   * Generate embedding using Workers AI
   * Model: @cf/baai/bge-base-en-v1.5 (768 dimensions, multilingual)
   */
  async embed(text: string): Promise<number[]> {
    try {
      const result = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
        text: [text],
      });
      
      // Workers AI returns { data: [[...embeddings]] }
      if (result?.data?.[0]) {
        return result.data[0] as number[];
      }
      
      throw new Error('No embedding returned from AI model');
    } catch (err) {
      logWithContext('error', 'vectorize.embed_failed', {
        requestId: this.requestId,
        meta: { error: (err as Error).message, textLength: text.length },
      });
      throw err;
    }
  }

  /**
   * Batch embed multiple texts (more efficient)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const result = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
        text: texts,
      });
      
      if (result?.data) {
        return result.data as number[][];
      }
      
      throw new Error('No embeddings returned from AI model');
    } catch (err) {
      logWithContext('error', 'vectorize.embed_batch_failed', {
        requestId: this.requestId,
        meta: { error: (err as Error).message, count: texts.length },
      });
      throw err;
    }
  }

  /**
   * Upsert a single item into the vector index
   */
  async upsert(
    type: EmbeddableType,
    id: string,
    text: string,
    metadata: Omit<VectorMetadata, 'type' | 'id'>
  ): Promise<void> {
    try {
      const embedding = await this.embed(text);
      const vectorId = `${type}:${id}`;
      
      await this.vectorize.upsert([{
        id: vectorId,
        values: embedding,
        metadata: { type, id, ...metadata } as Record<string, string | number | boolean>,
      }]);
      
      logWithContext('info', 'vectorize.upsert_success', {
        requestId: this.requestId,
        meta: { type, id: vectorId },
      });
    } catch (err) {
      logWithContext('error', 'vectorize.upsert_failed', {
        requestId: this.requestId,
        meta: { type, id, error: (err as Error).message },
      });
      throw err;
    }
  }

  /**
   * Batch upsert multiple items (more efficient)
   */
  async upsertBatch(
    items: Array<{
      type: EmbeddableType;
      id: string;
      text: string;
      metadata: Omit<VectorMetadata, 'type' | 'id'>;
    }>
  ): Promise<{ success: number; failed: number }> {
    const BATCH_SIZE = 100; // Vectorize limit
    let success = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      
      try {
        // Generate embeddings for batch
        const texts = batch.map(item => item.text);
        const embeddings = await this.embedBatch(texts);
        
        // Prepare vectors
        const vectors: VectorizeVector[] = batch.map((item, idx) => ({
          id: `${item.type}:${item.id}`,
          values: embeddings[idx],
          metadata: { 
            type: item.type, 
            id: item.id, 
            ...item.metadata 
          } as Record<string, string | number | boolean>,
        }));
        
        await this.vectorize.upsert(vectors);
        success += batch.length;
        
        logWithContext('info', 'vectorize.batch_upsert', {
          requestId: this.requestId,
          meta: { batchIndex: Math.floor(i / BATCH_SIZE), count: batch.length },
        });
      } catch (err) {
        failed += batch.length;
        logWithContext('error', 'vectorize.batch_upsert_failed', {
          requestId: this.requestId,
          meta: { batchIndex: Math.floor(i / BATCH_SIZE), error: (err as Error).message },
        });
      }
    }

    return { success, failed };
  }

  /**
   * Semantic search - find items by meaning
   */
  async search(query: string, options?: SearchOptions): Promise<VectorSearchResult[]> {
    try {
      const startTime = Date.now();
      const queryEmbedding = await this.embed(query);
      
      // Build filter
      const filter: Record<string, string | number> = {};
      if (options?.type) filter.type = options.type;
      if (options?.hskLevel) filter.hskLevel = options.hskLevel;

      const results = await this.vectorize.query(queryEmbedding, {
        topK: options?.topK || 10,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        returnMetadata: 'all',
      });

      const latencyMs = Date.now() - startTime;
      
      logWithContext('info', 'vectorize.search', {
        requestId: this.requestId,
        meta: { 
          query: query.slice(0, 50), 
          results: results.matches?.length || 0,
          latencyMs,
        },
      });

      return (results.matches || []).map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata as VectorMetadata | undefined,
      }));
    } catch (err) {
      logWithContext('error', 'vectorize.search_failed', {
        requestId: this.requestId,
        meta: { query: query.slice(0, 50), error: (err as Error).message },
      });
      throw err;
    }
  }

  /**
   * Find similar items to a given item
   */
  async findSimilar(
    type: EmbeddableType,
    id: string,
    topK: number = 5
  ): Promise<VectorSearchResult[]> {
    try {
      const vectorId = `${type}:${id}`;
      
      // Get the vector for this item
      const vectors = await this.vectorize.getByIds([vectorId]);
      if (!vectors || vectors.length === 0) {
        logWithContext('warn', 'vectorize.find_similar_not_found', {
          requestId: this.requestId,
          meta: { type, id },
        });
        return [];
      }

      // Search for similar (we'll filter out self in results)
      const results = await this.vectorize.query(vectors[0].values, {
        topK: topK + 1, // +1 to account for self
        filter: { type },
        returnMetadata: 'all',
      });

      // Filter out the original item
      const filtered = (results.matches || [])
        .filter(match => match.id !== vectorId)
        .slice(0, topK);

      logWithContext('info', 'vectorize.find_similar', {
        requestId: this.requestId,
        meta: { type, id, results: filtered.length },
      });

      return filtered.map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata as VectorMetadata | undefined,
      }));
    } catch (err) {
      logWithContext('error', 'vectorize.find_similar_failed', {
        requestId: this.requestId,
        meta: { type, id, error: (err as Error).message },
      });
      throw err;
    }
  }

  /**
   * Delete a vector by ID
   */
  async delete(type: EmbeddableType, id: string): Promise<void> {
    try {
      const vectorId = `${type}:${id}`;
      await this.vectorize.deleteByIds([vectorId]);
      
      logWithContext('info', 'vectorize.delete', {
        requestId: this.requestId,
        meta: { type, id },
      });
    } catch (err) {
      logWithContext('error', 'vectorize.delete_failed', {
        requestId: this.requestId,
        meta: { type, id, error: (err as Error).message },
      });
      throw err;
    }
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<{ vectorCount: number; dimensions: number }> {
    try {
      const info = await this.vectorize.describe();
      return {
        vectorCount: info.vectorCount || 0,
        dimensions: info.dimensions || 768,
      };
    } catch (err) {
      logWithContext('error', 'vectorize.stats_failed', {
        requestId: this.requestId,
        meta: { error: (err as Error).message },
      });
      return { vectorCount: 0, dimensions: 768 };
    }
  }
}

export default VectorizeService;

