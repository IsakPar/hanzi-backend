/**
 * AI Studio Schema
 * 
 * Separate database for AI-generated lesson drafts, generation history,
 * and curriculum context management.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// ═══════════════════════════════════════════════════════════════════════════
// LESSON DRAFTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI-generated lesson drafts waiting for human review
 */
export const lessonDrafts = sqliteTable('lesson_drafts', {
  id: text('id').primaryKey(),
  
  // Draft metadata
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  hskLevel: integer('hsk_level').notNull(),
  lessonNumber: integer('lesson_number'),
  lessonType: text('lesson_type').notNull(), // lesson, speaking, mini_test, hsk_test
  
  // Generated content
  blocksJson: text('blocks_json').notNull(), // Full lesson blocks as JSON
  
  // Generation context
  prompt: text('prompt').notNull(), // User's original prompt
  contextUsed: text('context_used'), // Curriculum context that was retrieved
  
  // Pipeline status
  status: text('status').notNull().default('generating'),
  // generating, validating, checking, ready, approved, rejected
  
  // Quality scores
  validationPassed: integer('validation_passed'), // 0 or 1
  validationErrors: text('validation_errors'), // JSON array of errors
  qualityScore: integer('quality_score'), // 0-100
  qualityReport: text('quality_report'), // JSON report from DeepSeek
  
  // Model info
  generatorModel: text('generator_model'), // e.g., "qwen2.5-72b"
  validatorModel: text('validator_model'),
  checkerModel: text('checker_model'),
  
  // Timing
  generatedAt: text('generated_at').notNull(),
  validatedAt: text('validated_at'),
  checkedAt: text('checked_at'),
  
  // Human review
  reviewedBy: text('reviewed_by'), // User ID
  reviewedAt: text('reviewed_at'),
  reviewNotes: text('review_notes'),
  
  // If approved, link to actual lesson
  approvedLessonId: text('approved_lesson_id'),
  
  // Timestamps
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  statusIdx: index('drafts_status_idx').on(table.status),
  hskIdx: index('drafts_hsk_idx').on(table.hskLevel),
  createdIdx: index('drafts_created_idx').on(table.createdAt),
}));

// ═══════════════════════════════════════════════════════════════════════════
// GENERATION HISTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log of all generation requests and their outcomes
 */
export const generationHistory = sqliteTable('generation_history', {
  id: text('id').primaryKey(),
  
  // Request
  requestType: text('request_type').notNull(), // single_lesson, unit, batch
  prompt: text('prompt').notNull(),
  parameters: text('parameters'), // JSON of generation params
  
  // Result
  success: integer('success').notNull(), // 0 or 1
  draftIds: text('draft_ids'), // JSON array of generated draft IDs
  errorMessage: text('error_message'),
  
  // Performance
  totalDurationMs: integer('total_duration_ms'),
  generationDurationMs: integer('generation_duration_ms'),
  validationDurationMs: integer('validation_duration_ms'),
  checkDurationMs: integer('check_duration_ms'),
  
  // Cost tracking
  tokensUsed: integer('tokens_used'),
  estimatedCost: text('estimated_cost'), // Stored as string for precision
  
  // User
  userId: text('user_id'),
  
  // Timestamps
  createdAt: text('created_at').notNull(),
}, (table) => ({
  userIdx: index('history_user_idx').on(table.userId),
  createdIdx: index('history_created_idx').on(table.createdAt),
  typeIdx: index('history_type_idx').on(table.requestType),
}));

// ═══════════════════════════════════════════════════════════════════════════
// CURRICULUM EMBEDDINGS METADATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Metadata for items embedded in Vectorize
 * (The actual vectors are in Cloudflare Vectorize, this tracks what's there)
 */
export const embeddingMetadata = sqliteTable('embedding_metadata', {
  id: text('id').primaryKey(), // Same ID as in Vectorize
  
  // Source
  sourceType: text('source_type').notNull(), // lesson, vocabulary, pattern, unit
  sourceId: text('source_id').notNull(), // ID in the main DB
  
  // Content that was embedded
  embeddedText: text('embedded_text').notNull(),
  
  // Metadata for filtering
  hskLevel: integer('hsk_level'),
  unitNumber: integer('unit_number'),
  lessonNumber: integer('lesson_number'),
  tags: text('tags'), // JSON array
  
  // Sync status
  lastSyncedAt: text('last_synced_at').notNull(),
  sourceUpdatedAt: text('source_updated_at'), // To detect stale embeddings
  
  // Timestamps
  createdAt: text('created_at').notNull(),
}, (table) => ({
  sourceIdx: index('embed_source_idx').on(table.sourceType, table.sourceId),
  hskIdx: index('embed_hsk_idx').on(table.hskLevel),
}));

// ═══════════════════════════════════════════════════════════════════════════
// GENERATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Saved prompts and templates for common generation patterns
 */
export const generationTemplates = sqliteTable('generation_templates', {
  id: text('id').primaryKey(),
  
  // Template info
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // unit, lesson, exercise, etc.
  
  // Template content
  systemPrompt: text('system_prompt'),
  userPromptTemplate: text('user_prompt_template').notNull(),
  // Use {{variables}} for placeholders
  
  // Default parameters
  defaultParams: text('default_params'), // JSON
  
  // Usage tracking
  usageCount: integer('usage_count').default(0),
  lastUsedAt: text('last_used_at'),
  
  // Timestamps
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  categoryIdx: index('templates_category_idx').on(table.category),
}));

// ═══════════════════════════════════════════════════════════════════════════
// MODEL CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration for different AI models used in the pipeline
 */
export const modelConfigs = sqliteTable('model_configs', {
  id: text('id').primaryKey(),
  
  // Model identification
  role: text('role').notNull(), // generator, validator, checker
  provider: text('provider').notNull(), // together, deepseek, workers_ai
  modelId: text('model_id').notNull(), // e.g., "Qwen/Qwen2.5-72B-Instruct-Turbo"
  
  // Configuration
  isActive: integer('is_active').default(1),
  priority: integer('priority').default(0), // Higher = preferred
  
  // Model parameters
  temperature: text('temperature'),
  maxTokens: integer('max_tokens'),
  additionalParams: text('additional_params'), // JSON
  
  // Rate limits
  requestsPerMinute: integer('requests_per_minute'),
  tokensPerMinute: integer('tokens_per_minute'),
  
  // Cost tracking
  costPer1kTokens: text('cost_per_1k_tokens'),
  
  // Timestamps
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  roleIdx: index('models_role_idx').on(table.role),
  activeIdx: index('models_active_idx').on(table.isActive),
}));

// ═══════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export type LessonDraft = typeof lessonDrafts.$inferSelect;
export type NewLessonDraft = typeof lessonDrafts.$inferInsert;

export type GenerationHistory = typeof generationHistory.$inferSelect;
export type NewGenerationHistory = typeof generationHistory.$inferInsert;

export type EmbeddingMetadata = typeof embeddingMetadata.$inferSelect;
export type NewEmbeddingMetadata = typeof embeddingMetadata.$inferInsert;

export type GenerationTemplate = typeof generationTemplates.$inferSelect;
export type NewGenerationTemplate = typeof generationTemplates.$inferInsert;

export type ModelConfig = typeof modelConfigs.$inferSelect;
export type NewModelConfig = typeof modelConfigs.$inferInsert;

