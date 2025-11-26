import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- WAITLIST ---
export const waitlist = sqliteTable('waitlist', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  source: text('source').default('website'), // Track where they came from
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  emailIdx: index('waitlist_email_idx').on(table.email),
}));

// --- USERS ---
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  clerkId: text('clerk_id').unique(),
  email: text('email').unique().notNull(),
  name: text('name'),
  role: text('role', { enum: ['user', 'admin'] }).default('user'),
  tier: text('tier', { enum: ['free', 'premium', 'pro'] }).default('free'),
  
  // Subscription tracking
  subscriptionStatus: text('subscription_status', { 
    enum: ['none', 'active', 'past_due', 'canceled', 'expired'] 
  }).default('none'),
  subscriptionPlatform: text('subscription_platform', { enum: ['ios', 'android', 'web'] }),
  subscriptionExpiresAt: integer('subscription_expires_at', { mode: 'timestamp' }),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
}, (table) => ({
  clerkIdIdx: index('users_clerk_id_idx').on(table.clerkId),
}));

// --- VOCABULARY REFERENCE ---
export const vocabulary = sqliteTable('vocabulary', {
  id: text('id').primaryKey(), 
  hanzi: text('hanzi').notNull(),
  pinyin: text('pinyin').notNull(),
  english: text('english').notNull(),
  category: text('category').notNull(), 
  hskLevel: integer('hsk_level').notNull(), 
  tags: text('tags', { mode: 'json' }), 
  // Audio and examples
  wordAudioR2Key: text('word_audio_r2_key'),
  exampleChinese: text('example_chinese'),
  examplePinyin: text('example_pinyin'),
  exampleEnglish: text('example_english'),
  exampleAudioR2Key: text('example_audio_r2_key'),
}, (table) => ({
  categoryIdx: index('vocab_category_idx').on(table.category),
  levelIdx: index('vocab_level_idx').on(table.hskLevel),
}));

// --- UNITS ---
export const units = sqliteTable('units', {
  id: text('id').primaryKey(),
  
  // Identification
  hskLevel: integer('hsk_level').notNull(),
  unitNumber: integer('unit_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  
  // Visual styling (for mobile app)
  gradientStart: text('gradient_start').default('#EEF2FF'),
  gradientEnd: text('gradient_end').default('#C7D2FE'),
  accentColor: text('accent_color').default('#4F46E5'),
  
  // Organization
  orderIndex: integer('order_index'),
  
  // Publishing
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  hskLevelIdx: index('units_hsk_level_idx').on(table.hskLevel, table.unitNumber),
  publishedIdx: index('units_published_idx').on(table.isPublished),
}));

// --- LESSONS ---
export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  
  // Unit relationship
  unitId: text('unit_id').references(() => units.id, { onDelete: 'set null' }),
  orderInUnit: integer('order_in_unit'),
  
  // Identification
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  lessonNumber: integer('lesson_number').notNull().default(1),
  lessonType: text('lesson_type', { 
    enum: ['lesson', 'speaking', 'mini_test', 'hsk_test'] 
  }).notNull().default('lesson'),
  
  // Classification
  hskLevel: integer('hsk_level').notNull(),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).default('medium'),
  displayOrder: integer('display_order'), // For portal UI organization (not used by mobile)
  
  // Content metadata
  description: text('description'),
  estimatedMinutes: integer('estimated_minutes').default(15),
  grammarPoints: text('grammar_points', { mode: 'json' }), // string[]
  tags: text('tags', { mode: 'json' }), // string[]
  targetVocabulary: text('target_vocabulary', { mode: 'json' }), // string[] (vocab IDs)
  
  // Publishing
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  version: integer('version').default(1),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  unitIdx: index('lessons_unit_idx').on(table.unitId, table.orderInUnit),
  orderingIdx: index('lessons_ordering_idx').on(table.hskLevel, table.lessonType, table.lessonNumber),
  typeIdx: index('lessons_type_idx').on(table.lessonType),
  displayOrderIdx: index('lessons_display_order_idx').on(table.hskLevel, table.displayOrder),
}));

// --- LESSON BLOCKS ---
export const lessonBlocks = sqliteTable('lesson_blocks', {
  id: text('id').primaryKey(),
  lessonId: text('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  orderIndex: integer('order_index').notNull(),
  content: text('content', { mode: 'json' }).notNull(),
}, (table) => ({
  lessonIdx: index('lesson_blocks_lesson_idx').on(table.lessonId),
}));

// --- USER PROGRESS ---
export const userProgress = sqliteTable('user_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['started', 'completed'] }).notNull(),
  score: integer('score').default(0),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  userLessonIdx: index('user_progress_user_lesson_idx').on(table.userId, table.lessonId),
}));

// --- USER KNOWLEDGE SNAPSHOT ---
export const userKnowledgeSnapshot = sqliteTable('user_knowledge_snapshot', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  atomId: text('atom_id').notNull(), 
  bucket: text('bucket', { enum: ['new', 'weak', 'learning', 'mastered'] }).notNull(),
  proficiency: real('proficiency').notNull(),
  stability: real('stability').notNull(),
  lastReview: integer('last_review', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.atomId] }),
  bucketIdx: index('uks_bucket_idx').on(table.userId, table.bucket),
}));

// --- TIER LIMITS ---
export const tierLimits = sqliteTable('tier_limits', {
  tier: text('tier', { enum: ['free', 'premium', 'pro'] }).primaryKey(),
  requestsPerDay: integer('requests_per_day').notNull().default(10),
  tokensPerDay: integer('tokens_per_day').notNull().default(5000),
  maxParallelGenerations: integer('max_parallel_generations').notNull().default(1),
  contentDownloadsPerDay: integer('content_downloads_per_day').notNull().default(5),
  offlinePackagesAllowed: integer('offline_packages_allowed').notNull().default(0),
  canAccessPremiumContent: integer('can_access_premium_content', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// --- RATE LIMITS ---
export const dailyUsage = sqliteTable('daily_usage', {
  userId: text('user_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  requestCount: integer('request_count').default(0),
  tokenCount: integer('token_count').default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.date] })
}));

// --- AI MODELS CONFIGURATION ---
export const aiModels = sqliteTable('ai_models', {
  id: text('id').primaryKey(), // e.g., 'gpt-5-nano', 'gpt-5-mini'
  name: text('name').notNull(), // Display name: 'GPT-5 Nano'
  provider: text('provider').notNull(), // 'openai', 'anthropic'
  costPer1kInput: real('cost_per_1k_input').notNull(), // Cost per 1k input tokens
  costPer1kOutput: real('cost_per_1k_output').notNull(), // Cost per 1k output tokens
  isActive: integer('is_active', { mode: 'boolean' }).default(false), // Currently active model
  tier: text('tier', { enum: ['nano', 'mini', 'standard', 'premium'] }).notNull(),
  maxTokens: integer('max_tokens').default(4096),
  supportsJson: integer('supports_json', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// --- API USAGE TRACKING ---
export const apiUsage = sqliteTable('api_usage', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestId: text('request_id').notNull(),
  modelUsed: text('model_used').notNull(), // Which AI model was used
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  totalTokens: integer('total_tokens').default(0),
  estimatedCost: real('estimated_cost').default(0), // Calculated cost in USD
  latencyMs: integer('latency_ms'), // Response time in milliseconds
  success: integer('success', { mode: 'boolean' }).default(true),
  errorMessage: text('error_message'),
  promptSlug: text('prompt_slug'),
  promptVersion: integer('prompt_version'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  userIdx: index('api_usage_user_idx').on(table.userId),
  modelIdx: index('api_usage_model_idx').on(table.modelUsed),
  dateIdx: index('api_usage_date_idx').on(table.createdAt),
  promptIdx: index('api_usage_prompt_idx').on(table.promptSlug, table.promptVersion),
}));

// --- CONTENT LIBRARY ---
export const contentLibrary = sqliteTable('content_library', {
  id: text('id').primaryKey(),
  
  // Basic Information
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  author: text('author'),
  narrator: text('narrator'), // For audiobooks
  description: text('description'),
  
  // Type & Format
  contentType: text('content_type', { enum: ['audiobook', 'text', 'video'] }).notNull(),
  format: text('format'), // 'mp3', 'm4a', 'pdf', 'epub', 'mp4'
  
  // HSK Classification
  hskLevel: integer('hsk_level'), // 1-6
  difficulty: text('difficulty', { enum: ['beginner', 'intermediate', 'advanced'] }),
  targetAudience: text('target_audience', { enum: ['kids', 'teens', 'adults'] }),
  
  // File Information
  r2Key: text('r2_key').notNull(), // Path in R2: audiobooks/uuid.mp3
  fileSize: integer('file_size'), // Bytes
  duration: integer('duration'), // Seconds (for audio/video)
  pageCount: integer('page_count'), // For texts
  
  // Media Assets
  coverImageR2Key: text('cover_image_r2_key'), // Cover art in R2
  sampleR2Key: text('sample_r2_key'), // Preview clip/excerpt
  
  // Organization
  category: text('category'), // 'fiction', 'non-fiction', 'news', 'podcast'
  genre: text('genre'), // 'fantasy', 'history', 'comedy'
  seriesName: text('series_name'), // If part of a series
  seriesOrder: integer('series_order'), // Episode/chapter number
  
  // Publishing
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  isFree: integer('is_free', { mode: 'boolean' }).default(true),
  requiresPremium: integer('requires_premium', { mode: 'boolean' }).default(false),
  
  // Upload Status (for R2 transaction safety)
  uploadStatus: text('upload_status', { 
    enum: ['pending_upload', 'uploading', 'ready', 'failed'] 
  }).default('ready'),
  
  // Engagement Metrics
  viewCount: integer('view_count').default(0),
  favoriteCount: integer('favorite_count').default(0),
  averageRating: real('average_rating'),
  
  // Metadata
  language: text('language').default('zh'), // 'zh', 'en', 'zh-en'
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
}, (table) => ({
  typeIdx: index('content_type_idx').on(table.contentType),
  hskIdx: index('content_hsk_idx').on(table.hskLevel),
  categoryIdx: index('content_category_idx').on(table.category),
  publishedIdx: index('content_published_idx').on(table.isPublished),
  featuredIdx: index('content_featured_idx').on(table.isFeatured),
}));

// --- TAGS SYSTEM ---
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(), // 'greetings', 'travel', 'business'
  slug: text('slug').unique().notNull(), // 'greetings', 'travel', 'business' (url-safe)
  category: text('category', { enum: ['topic', 'grammar', 'skill', 'genre'] }),
  color: text('color'), // Hex color for UI: '#3B82F6'
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// --- CONTENT TAGS (Many-to-Many) ---
export const contentTags = sqliteTable('content_tags', {
  contentId: text('content_id').notNull().references(() => contentLibrary.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.contentId, table.tagId] }),
  contentIdx: index('content_tags_content_idx').on(table.contentId),
  tagIdx: index('content_tags_tag_idx').on(table.tagId),
}));

// --- USER LIBRARY (Favorites & Progress) ---
export const userLibrary = sqliteTable('user_library', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentId: text('content_id').notNull().references(() => contentLibrary.id, { onDelete: 'cascade' }),
  
  // Status
  isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
  status: text('status', { enum: ['not_started', 'in_progress', 'completed'] }).default('not_started'),
  
  // Progress Tracking
  progressSeconds: integer('progress_seconds').default(0), // For audio/video
  progressPage: integer('progress_page').default(0), // For texts
  progressPercentage: real('progress_percentage').default(0), // 0-100
  
  // Rating
  userRating: integer('user_rating'), // 1-5 stars
  
  // Timestamps
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.contentId] }),
  userIdx: index('user_library_user_idx').on(table.userId),
  favoritesIdx: index('user_library_favorites_idx').on(table.userId, table.isFavorite),
  statusIdx: index('user_library_status_idx').on(table.userId, table.status),
}));

// --- SYSTEM EVENTS / OBSERVABILITY ---
export const systemEvents = sqliteTable('system_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  requestId: text('request_id'),
  modelUsed: text('model_used'),
  promptSlug: text('prompt_slug'),
  promptVersion: integer('prompt_version'),
  latencyMs: integer('latency_ms'),
  costUsd: real('cost_usd'),
  userId: text('user_id'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  typeIdx: index('system_events_type_idx').on(table.eventType),
  createdIdx: index('system_events_created_idx').on(table.createdAt),
}));

// --- PROMPT TEMPLATES ---
export const promptTemplates = sqliteTable('prompt_templates', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  version: integer('version').notNull(),
  status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull(),
  body: text('body'), // Legacy: single prompt body (nullable for pipelines)
  notes: text('notes'),
  metadata: text('metadata', { mode: 'json' }),
  // Pipeline support
  steps: text('steps', { mode: 'json' }).$type<PipelineStep[] | null>(), // Array of pipeline steps
  costLimits: text('cost_limits', { mode: 'json' }).$type<CostLimits | null>(), // Cost/token limits
  qualityGate: text('quality_gate', { mode: 'json' }).$type<QualityGate | null>(), // Validation settings
  createdBy: text('created_by'),
  promotedBy: text('promoted_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  slugVersionIdx: index('prompt_templates_slug_version_idx').on(table.slug, table.version),
  slugStatusIdx: index('prompt_templates_slug_status_idx').on(table.slug, table.status),
}));

// Pipeline types
export interface PipelineStep {
  order: number;
  name: string;
  modelId: string;
  promptBody: string;
  input: {
    includeTargets: boolean;
    includeGrammar: boolean;
    includeKnownVocab: boolean;
    includePreviousOutput: boolean;
  };
  output: {
    format: 'json' | 'text';
    schema?: string;
  };
  settings: {
    temperature: number;
    maxInputTokens: number;
    maxOutputTokens: number;
  };
  onFailure: {
    fallbackModelId?: string;
    maxRetries: number;
  };
}

export interface CostLimits {
  maxCostPerRun: number;
  maxInputTokensPerStep: number;
  maxOutputTokensPerStep: number;
  abortOnExceed: boolean;
}

export interface QualityGate {
  minValidationScore: number;
  returnUnavailableBelow: number;
  requireValidation: boolean;
}

export const promptTemplateHistory = sqliteTable('prompt_template_history', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  fromVersion: integer('from_version'),
  toVersion: integer('to_version').notNull(),
  reason: text('reason'),
  changedBy: text('changed_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  slugIdx: index('prompt_template_history_slug_idx').on(table.slug, table.createdAt),
}));

// --- STORIES ---
export const stories = sqliteTable('stories', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  author: text('author'),
  
  // Link to full audiobook/text file in content_library
  contentLibraryId: text('content_library_id').references(() => contentLibrary.id, { onDelete: 'set null' }),
  
  description: text('description'),
  topic: text('topic'),
  
  // Classification
  hskLevel: integer('hsk_level').notNull(),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).default('medium'),
  estimatedMinutes: integer('estimated_minutes'),
  
  // Access control
  accessTier: text('access_tier', { enum: ['free', 'premium'] }).default('premium'),
  
  // Cover image
  coverImageR2Key: text('cover_image_r2_key'),
  
  // Practice blocks (same as lesson blocks - for post-story exercises)
  practiceBlocks: text('practice_blocks', { mode: 'json' }),
  
  // Publishing
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  hskIdx: index('story_hsk_idx').on(table.hskLevel),
  publishedIdx: index('story_published_idx').on(table.isPublished),
  difficultyIdx: index('story_difficulty_idx').on(table.difficulty),
}));

// --- STORY SENTENCES ---
export const storySentences = sqliteTable('story_sentences', {
  id: text('id').primaryKey(),
  storyId: text('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  
  chinese: text('chinese').notNull(),
  pinyin: text('pinyin').notNull(),
  english: text('english').notNull(),
  
  audioR2Key: text('audio_r2_key'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  storyIdx: index('story_sentences_story_idx').on(table.storyId),
  orderIdx: index('story_sentences_order_idx').on(table.storyId, table.orderIndex),
}));

// --- STORY VOCABULARY ---
export const storyVocabulary = sqliteTable('story_vocabulary', {
  storyId: text('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  vocabId: text('vocab_id').notNull().references(() => vocabulary.id, { onDelete: 'cascade' }),
  contextSentence: text('context_sentence'),
}, (table) => ({
  pk: primaryKey({ columns: [table.storyId, table.vocabId] }),
  storyIdx: index('story_vocab_story_idx').on(table.storyId),
}));

// --- STORY QUESTIONS ---
export const storyQuestions = sqliteTable('story_questions', {
  id: text('id').primaryKey(),
  storyId: text('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  
  question: text('question').notNull(),
  questionEnglish: text('question_english'),
  questionType: text('question_type', { enum: ['multiple_choice', 'true_false', 'short_answer'] }).default('multiple_choice'),
  
  options: text('options', { mode: 'json' }), // JSON array for multiple choice
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  storyIdx: index('story_questions_story_idx').on(table.storyId),
}));

// --- CONTENT EXPORTS TRACKING ---
export const contentExports = sqliteTable('content_exports', {
  id: text('id').primaryKey(),
  contentType: text('content_type', { enum: ['vocabulary', 'lessons', 'stories'] }).notNull(),
  hskLevel: integer('hsk_level').notNull(),
  version: text('version').notNull(), // Semantic versioning: '1.0.5'
  contentHash: text('content_hash').notNull(), // SHA256 hash
  fileUrl: text('file_url').notNull(), // R2 URL
  exportedBy: text('exported_by'), // User ID
  exportedAt: integer('exported_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  fileSizeBytes: integer('file_size_bytes'),
  recordCount: integer('record_count'),
}, (table) => ({
  typeIdx: index('content_exports_type_idx').on(table.contentType, table.hskLevel),
}));

// ═══════════════════════════════════════════════════════════
// USER ANALYTICS TABLES (Phase 2)
// ═══════════════════════════════════════════════════════════

// --- RAW ANALYTICS EVENTS ---
export const analyticsEventsRaw = sqliteTable('analytics_events_raw', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  userId: text('user_id'),
  sessionId: text('session_id'),
  payload: text('payload', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  createdIdx: index('idx_events_raw_created').on(table.createdAt),
  typeIdx: index('idx_events_raw_type').on(table.eventType),
  userIdx: index('idx_events_raw_user').on(table.userId),
  sessionIdx: index('idx_events_raw_session').on(table.sessionId),
}));

// --- DAILY USER STATS ---
export const analyticsUsersDaily = sqliteTable('analytics_users_daily', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  totalUsers: integer('total_users').notNull().default(0),
  newSignups: integer('new_signups').notNull().default(0),
  activeUsers: integer('active_users').notNull().default(0),
  returningUsers: integer('returning_users').notNull().default(0),
  avgSessionDurationSeconds: integer('avg_session_duration_seconds').default(0),
  totalSessions: integer('total_sessions').default(0),
});

// --- RETENTION COHORTS ---
export const analyticsRetentionCohorts = sqliteTable('analytics_retention_cohorts', {
  cohortWeek: text('cohort_week').notNull(), // '2024-W03'
  weekNumber: integer('week_number').notNull(), // 0, 1, 2, 3...
  usersInCohort: integer('users_in_cohort').notNull(),
  usersRetained: integer('users_retained').notNull(),
  retentionRate: real('retention_rate'),
}, (table) => ({
  pk: primaryKey({ columns: [table.cohortWeek, table.weekNumber] }),
  cohortIdx: index('idx_retention_cohort_week').on(table.cohortWeek),
}));

// --- TIER DAILY STATS ---
export const analyticsTierDaily = sqliteTable('analytics_tier_daily', {
  date: text('date').notNull(),
  tier: text('tier', { enum: ['free', 'premium', 'pro'] }).notNull(),
  userCount: integer('user_count').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.date, table.tier] }),
}));

// ═══════════════════════════════════════════════════════════
// CONTENT ANALYTICS TABLES (Phase 3)
// ═══════════════════════════════════════════════════════════

// --- DAILY CONTENT STATS ---
export const analyticsContentDaily = sqliteTable('analytics_content_daily', {
  date: text('date').notNull(),
  contentType: text('content_type').notNull(), // 'lesson' | 'story' | 'vocabulary'
  totalViews: integer('total_views').default(0),
  totalStarts: integer('total_starts').default(0),
  totalCompletions: integer('total_completions').default(0),
  uniqueUsers: integer('unique_users').default(0),
  avgTimeSeconds: integer('avg_time_seconds').default(0),
  totalTimeSeconds: integer('total_time_seconds').default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.date, table.contentType] }),
}));

// --- DAILY LESSON STATS ---
export const analyticsLessonDaily = sqliteTable('analytics_lesson_daily', {
  date: text('date').notNull(),
  lessonId: text('lesson_id').notNull(),
  views: integer('views').default(0),
  starts: integer('starts').default(0),
  completions: integer('completions').default(0),
  uniqueUsers: integer('unique_users').default(0),
  avgScore: real('avg_score').default(0),
  avgTimeSeconds: integer('avg_time_seconds').default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.date, table.lessonId] }),
  lessonIdx: index('idx_lesson_daily_lesson').on(table.lessonId),
}));

// --- DAILY STORY STATS ---
export const analyticsStoryDaily = sqliteTable('analytics_story_daily', {
  date: text('date').notNull(),
  storyId: text('story_id').notNull(),
  views: integer('views').default(0),
  starts: integer('starts').default(0),
  completions: integer('completions').default(0),
  uniqueUsers: integer('unique_users').default(0),
  avgTimeSeconds: integer('avg_time_seconds').default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.date, table.storyId] }),
  storyIdx: index('idx_story_daily_story').on(table.storyId),
}));

// --- DAILY HSK LEVEL STATS ---
export const analyticsHskDaily = sqliteTable('analytics_hsk_daily', {
  date: text('date').notNull(),
  hskLevel: integer('hsk_level').notNull(),
  lessonViews: integer('lesson_views').default(0),
  lessonCompletions: integer('lesson_completions').default(0),
  storyViews: integer('story_views').default(0),
  storyCompletions: integer('story_completions').default(0),
  vocabReviews: integer('vocab_reviews').default(0),
  uniqueUsers: integer('unique_users').default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.date, table.hskLevel] }),
}));

// --- VOCABULARY PROGRESS STATS ---
export const analyticsVocabProgress = sqliteTable('analytics_vocab_progress', {
  date: text('date').primaryKey(),
  wordsNew: integer('words_new').default(0),
  wordsWeak: integer('words_weak').default(0),
  wordsLearning: integer('words_learning').default(0),
  wordsMastered: integer('words_mastered').default(0),
  totalReviews: integer('total_reviews').default(0),
  uniqueUsers: integer('unique_users').default(0),
});

// ═══════════════════════════════════════════════════════════
// ENGAGEMENT TRACKING TABLES (Phase 3b - Anonymous)
// ═══════════════════════════════════════════════════════════

// --- RAW ENGAGEMENT EVENTS (90 days retention) ---
export const engagementEventsRaw = sqliteTable('engagement_events_raw', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(), // lesson.started, lesson.completed, etc.
  contentId: text('content_id').notNull(),
  contentType: text('content_type').notNull(), // lesson | story | vocab
  hskLevel: integer('hsk_level'),
  timestamp: text('timestamp').notNull(), // ISO 8601
  timeSeconds: integer('time_seconds'),
  payload: text('payload', { mode: 'json' }),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  typeIdx: index('idx_engagement_events_type').on(table.eventType),
  contentIdx: index('idx_engagement_events_content').on(table.contentId, table.contentType),
  processedIdx: index('idx_engagement_events_processed').on(table.processed),
  createdIdx: index('idx_engagement_events_created').on(table.createdAt),
}));

// --- PER-LESSON AGGREGATED STATS ---
export const analyticsLessonStats = sqliteTable('analytics_lesson_stats', {
  lessonId: text('lesson_id').primaryKey(),
  totalStarts: integer('total_starts').default(0),
  totalCompletions: integer('total_completions').default(0),
  totalAbandons: integer('total_abandons').default(0),
  avgTimeSeconds: integer('avg_time_seconds').default(0),
  minTimeSeconds: integer('min_time_seconds').default(0),
  maxTimeSeconds: integer('max_time_seconds').default(0),
  medianTimeSeconds: integer('median_time_seconds').default(0),
  p90TimeSeconds: integer('p90_time_seconds').default(0),
  totalTimeSeconds: integer('total_time_seconds').default(0),
  avgScore: real('avg_score').default(0),
  completionRate: real('completion_rate').default(0),
  blockStats: text('block_stats', { mode: 'json' }), // JSON: [{ index, type, avgTime, completions, dropOffs }]
  firstEventAt: text('first_event_at'),
  lastEventAt: text('last_event_at'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// --- PER-STORY AGGREGATED STATS ---
export const analyticsStoryStats = sqliteTable('analytics_story_stats', {
  storyId: text('story_id').primaryKey(),
  totalStarts: integer('total_starts').default(0),
  totalCompletions: integer('total_completions').default(0),
  totalAbandons: integer('total_abandons').default(0),
  avgTimeSeconds: integer('avg_time_seconds').default(0),
  minTimeSeconds: integer('min_time_seconds').default(0),
  maxTimeSeconds: integer('max_time_seconds').default(0),
  totalTimeSeconds: integer('total_time_seconds').default(0),
  avgSentencesRead: real('avg_sentences_read').default(0),
  completionRate: real('completion_rate').default(0),
  sentenceStats: text('sentence_stats', { mode: 'json' }), // JSON: [{ index, avgTime, reads, dropOffs }]
  firstEventAt: text('first_event_at'),
  lastEventAt: text('last_event_at'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// --- PER-VOCAB AGGREGATED STATS ---
export const analyticsVocabStats = sqliteTable('analytics_vocab_stats', {
  vocabId: text('vocab_id').primaryKey(),
  totalReviews: integer('total_reviews').default(0),
  correctCount: integer('correct_count').default(0),
  incorrectCount: integer('incorrect_count').default(0),
  avgResponseTimeMs: integer('avg_response_time_ms').default(0),
  accuracyRate: real('accuracy_rate').default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// --- DAILY ENGAGEMENT SUMMARY ---
export const analyticsEngagementDaily = sqliteTable('analytics_engagement_daily', {
  date: text('date').notNull(),
  contentType: text('content_type').notNull(), // lesson | story | vocab
  totalEvents: integer('total_events').default(0),
  totalStarts: integer('total_starts').default(0),
  totalCompletions: integer('total_completions').default(0),
  totalTimeSeconds: integer('total_time_seconds').default(0),
  avgCompletionRate: real('avg_completion_rate').default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.date, table.contentType] }),
  dateIdx: index('idx_engagement_daily_date').on(table.date),
}));

// ═══════════════════════════════════════════════════════════
// CURRICULUM VERSION (for Python Validator Sync)
// ═══════════════════════════════════════════════════════════

// --- CURRICULUM VERSION ---
// Tracks derived curriculum version for Python validator sync
// Word order is DERIVED from lessons (first appearance = teaching position)
export const curriculumVersion = sqliteTable('curriculum_version', {
  id: integer('id').primaryKey(), // Always 1
  versionHash: text('version_hash').notNull(), // Hash of derived word→lesson mapping
  wordCount: integer('word_count').notNull().default(0),
  lessonCount: integer('lesson_count').notNull().default(0), // How many lessons processed
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

