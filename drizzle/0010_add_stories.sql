-- Migration: Add Stories tables
-- Stories are reading comprehension content with sentence-by-sentence breakdown

-- Stories metadata
CREATE TABLE `stories` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `subtitle` text,
  `author` text,
  
  -- Link to full audiobook/text file in content_library
  `content_library_id` text,
  
  `description` text,
  `topic` text,
  
  -- Classification
  `hsk_level` integer NOT NULL,
  `difficulty` text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  `estimated_minutes` integer,
  
  -- Cover image
  `cover_image_r2_key` text,
  
  -- Practice blocks (same as lesson blocks - for post-story exercises)
  `practice_blocks` text,  -- JSON array of ContentBlock[]
  
  -- Publishing
  `is_published` integer DEFAULT 0,
  `published_at` integer,
  
  -- Timestamps
  `created_at` integer DEFAULT (strftime('%s', 'now')),
  `updated_at` integer DEFAULT (strftime('%s', 'now')),
  
  FOREIGN KEY (`content_library_id`) REFERENCES `content_library`(`id`) ON DELETE SET NULL
);

-- Story sentences (for sentence-by-sentence reading with audio)
CREATE TABLE `story_sentences` (
  `id` text PRIMARY KEY NOT NULL,
  `story_id` text NOT NULL,
  `order_index` integer NOT NULL,
  
  `chinese` text NOT NULL,
  `pinyin` text NOT NULL,
  `english` text NOT NULL,
  
  `audio_r2_key` text,
  
  `created_at` integer DEFAULT (strftime('%s', 'now')),
  
  FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE,
  UNIQUE(`story_id`, `order_index`)
);

-- Story vocabulary (glossary/key terms)
CREATE TABLE `story_vocabulary` (
  `story_id` text NOT NULL,
  `vocab_id` text NOT NULL,
  `context_sentence` text,
  
  PRIMARY KEY (`story_id`, `vocab_id`),
  FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vocab_id`) REFERENCES `vocabulary`(`id`) ON DELETE CASCADE
);

-- Story questions (reading comprehension)
CREATE TABLE `story_questions` (
  `id` text PRIMARY KEY NOT NULL,
  `story_id` text NOT NULL,
  `order_index` integer NOT NULL,
  
  `question` text NOT NULL,
  `question_english` text,
  `question_type` text DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  
  `options` text, -- JSON array for multiple choice: ["A", "B", "C", "D"]
  `correct_answer` text NOT NULL,
  `explanation` text,
  
  `created_at` integer DEFAULT (strftime('%s', 'now')),
  
  FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX `story_hsk_idx` ON `stories`(`hsk_level`);
CREATE INDEX `story_published_idx` ON `stories`(`is_published`);
CREATE INDEX `story_difficulty_idx` ON `stories`(`difficulty`);
CREATE INDEX `story_sentences_story_idx` ON `story_sentences`(`story_id`);
CREATE INDEX `story_sentences_order_idx` ON `story_sentences`(`story_id`, `order_index`);
CREATE INDEX `story_vocab_story_idx` ON `story_vocabulary`(`story_id`);
CREATE INDEX `story_questions_story_idx` ON `story_questions`(`story_id`);

