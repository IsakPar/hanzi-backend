/**
 * AI Tutor Lesson Generator Service
 * 
 * Generates reading content + practice exercises with triple validation:
 * 1. Python i+1 validation (vocabulary ceiling)
 * 2. Python structural validation (JSON schema)
 * 3. AI grammar validation (native speaker quality)
 * 
 * @module services/ai-tutor-generator
 */

import { D1Database } from '@cloudflare/workers-types';
import { createOpenRouterClient, OPENROUTER_MODELS, estimateOpenRouterCost } from './openrouter-client';
import { VectorizeService } from './vectorize';
import { AIUsageLogger } from './ai-usage-logger';
import { logWithContext } from '../utils/logger';

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  // Max attempts per step
  MAX_READING_ATTEMPTS: 4,
  MAX_PRACTICE_ATTEMPTS: 3,
  MAX_GRAMMAR_ATTEMPTS: 2,
  
  // Timeouts (ms)
  READING_TIMEOUT: 15000,
  PRACTICE_TIMEOUT: 10000,
  GRAMMAR_TIMEOUT: 20000,
  PYTHON_TIMEOUT: 5000,
  
  // Thresholds
  MIN_EXERCISES_REQUIRED: 3,
  GRAMMAR_PASS_THRESHOLD: 0.8,
  
  // Single model for everything - Qwen 32B with different prompts
  MODEL: OPENROUTER_MODELS.QWEN_CODER_32B,
};

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface TutorLessonInput {
  focusWords: string[];
  userLessonPosition: number;
  hskLevel: number;
  userId?: string;
}

export interface ReadingSentence {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
}

export interface ReadingContent {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  sentences: ReadingSentence[];
}

export interface ExerciseOption {
  id: string;
  chinese: string;
  pinyin: string;
  english?: string;
}

export interface MultipleChoiceExercise {
  id: string;
  type: 'multiple_choice';
  question: { chinese: string; pinyin: string; english: string };
  options: ExerciseOption[];
  correctOptionId: string;
}

export interface DragSentenceExercise {
  id: string;
  type: 'drag_sentence';
  targetSentence: { id: string; chinese: string; pinyin: string; english: string };
  shuffledWords: { id: string; chinese: string; pinyin: string; correctPosition: number }[];
}

export interface SpotErrorExercise {
  id: string;
  type: 'spot_error';
  sentence: { id: string; chinese: string; pinyin: string; english: string };
  errorWordId: string;
  correction: { wrong: string; correct: string; explanation: string };
  words: { id: string; chinese: string; isError: boolean }[];
}

export interface BuildSentenceExercise {
  id: string;
  type: 'build_sentence';
  prompt: { english: string; hint?: string };
  expectedAnswer: { id: string; chinese: string; pinyin: string };
  acceptableVariations: string[];
  availableWords: { id: string; chinese: string; pinyin: string }[];
}

export interface ReadCompExercise {
  id: string;
  type: 'read_comp';
  passage: { id: string; chinese: string; pinyin: string; english: string };
  question: { id: string; chinese: string; pinyin: string; english: string };
  options: ExerciseOption[];
  correctOptionId: string;
}

export type Exercise = 
  | MultipleChoiceExercise 
  | DragSentenceExercise 
  | SpotErrorExercise 
  | BuildSentenceExercise 
  | ReadCompExercise;

export interface GenerationMetadata {
  generatedAt: string;
  totalCost: number;
  attempts: {
    reading: number;
    practice: number;
    grammarCheck: number;
  };
  model: string; // Single model for all steps
  fallbackUsed: boolean;
  warnings: string[];
  durationMs: number;
}

export interface TutorLesson {
  id: string;
  version: number;
  input: TutorLessonInput;
  reading: ReadingContent;
  exercises: Exercise[];
  metadata: GenerationMetadata;
}

// Validation response types
interface ReadingValidationResponse {
  ok: boolean;
  unknown_ratio: number;
  focus_words_found: string[];
  focus_words_missing: string[];
  too_many_unknowns: string[];
  too_hard: boolean;
  suggestions?: {
    ban_tokens: string[];
    require_tokens: string[];
    target_range: { min_unknown_ratio: number; max_unknown_ratio: number };
  };
}

interface StructureValidationResponse {
  ok: boolean;
  errors: { exercise_id: string; field: string; error: string }[];
  warnings: { exercise_id: string; field: string; error: string }[];
  fixable: string[];
  must_regenerate: string[];
}

interface PedagogyValidationResponse {
  ok: boolean;
  items: { id: string; ok: boolean; issues: string[] }[];
  coverage: {
    focus_words_tested: string[];
    focus_words_untested: string[];
  };
}

interface GrammarValidationResult {
  overall_ok: boolean;
  items: { id: string; ok: boolean; error: string | null }[];
}

// ═══════════════════════════════════════════════════════════
// Service Class
// ═══════════════════════════════════════════════════════════

export class AITutorGenerator {
  private db: D1Database;
  private openrouterApiKey: string;
  private pythonValidatorUrl: string;
  private vectorizeService?: VectorizeService;
  private usageLogger: AIUsageLogger;
  private requestId: string;

  constructor(
    db: D1Database,
    openrouterApiKey: string,
    pythonValidatorUrl: string,
    vectorizeService?: VectorizeService,
    aiBinding?: unknown
  ) {
    this.db = db;
    this.openrouterApiKey = openrouterApiKey;
    this.pythonValidatorUrl = pythonValidatorUrl;
    this.vectorizeService = vectorizeService;
    this.usageLogger = new AIUsageLogger(db);
    this.requestId = `tutor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Generate a complete AI Tutor lesson with reading + practice
   */
  async generateLesson(input: TutorLessonInput): Promise<TutorLesson> {
    const startTime = Date.now();
    
    const metadata: GenerationMetadata = {
      generatedAt: new Date().toISOString(),
      totalCost: 0,
      attempts: { reading: 0, practice: 0, grammarCheck: 0 },
      model: CONFIG.MODEL,
      fallbackUsed: false,
      warnings: [],
      durationMs: 0,
    };

    logWithContext('info', 'tutor.generate.start', {
      requestId: this.requestId,
      meta: { focusWords: input.focusWords, lessonPosition: input.userLessonPosition }
    });

    try {
      // Step 1: Get allowed words from Python validator
      const allowedWords = await this.fetchAllowedWords(input.userLessonPosition);
      
      // Step 2: Generate reading with retries
      let reading: ReadingContent | null = null;
      let readingFeedback: ReadingValidationResponse | null = null;
      
      for (let i = 0; i < CONFIG.MAX_READING_ATTEMPTS; i++) {
        metadata.attempts.reading++;
        
        try {
          reading = await this.generateReading(input, allowedWords, readingFeedback);
          const validation = await this.validateReading(reading, input, allowedWords);
          
          if (validation.ok) {
            logWithContext('info', 'tutor.reading.valid', {
              requestId: this.requestId,
              meta: { attempt: i + 1 }
            });
            break;
          }
          
          readingFeedback = validation;
          reading = null;
          metadata.warnings.push(`Reading attempt ${i + 1} failed: ${validation.suggestions?.ban_tokens?.join(', ') || 'unknown'}`);
        } catch (error) {
          metadata.warnings.push(`Reading attempt ${i + 1} error: ${(error as Error).message}`);
        }
      }
      
      // Fallback if reading failed
      if (!reading) {
        metadata.fallbackUsed = true;
        logWithContext('warn', 'tutor.reading.fallback', { requestId: this.requestId });
        return this.createFallbackLesson(input, metadata, startTime);
      }
      
      // Step 3: Get RAG alternatives for focus words
      const alternatives = await this.fetchAlternatives(input.focusWords, allowedWords);
      
      // Step 4: Generate practice with retries
      let exercises: Exercise[] = [];
      
      for (let i = 0; i < CONFIG.MAX_PRACTICE_ATTEMPTS; i++) {
        metadata.attempts.practice++;
        
        try {
          const rawExercises = await this.generatePractice(reading, input, alternatives, allowedWords);
          
          // Structural validation
          const structureResult = await this.validateStructure(rawExercises, allowedWords);
          if (!structureResult.ok) {
            // Filter out must-regenerate exercises
            exercises = rawExercises.filter(
              ex => !structureResult.must_regenerate.includes(ex.id)
            );
            metadata.warnings.push(`Removed ${structureResult.must_regenerate.length} structurally invalid exercises`);
          } else {
            exercises = rawExercises;
          }
          
          // Pedagogical validation
          const pedagogyResult = await this.validatePedagogy(reading, exercises, input);
          if (pedagogyResult.ok) break;
          
          // Remove invalid exercises
          const validIds = pedagogyResult.items
            .filter(item => item.ok)
            .map(item => item.id);
          exercises = exercises.filter(ex => validIds.includes(ex.id));
          
          if (exercises.length >= CONFIG.MIN_EXERCISES_REQUIRED) {
            metadata.warnings.push(`Dropped to ${exercises.length} exercises after pedagogy check`);
            break;
          }
        } catch (error) {
          metadata.warnings.push(`Practice attempt ${i + 1} error: ${(error as Error).message}`);
        }
      }
      
      // Minimum exercises check
      if (exercises.length < CONFIG.MIN_EXERCISES_REQUIRED) {
        metadata.fallbackUsed = true;
        metadata.warnings.push('Insufficient valid exercises, using fallback');
        return this.createFallbackLesson(input, metadata, startTime);
      }
      
      // Step 5: Grammar validation
      metadata.attempts.grammarCheck++;
      const grammarResult = await this.validateGrammar(reading, exercises);
      
      if (!grammarResult.overall_ok) {
        const passRate = grammarResult.items.filter(i => i.ok).length / grammarResult.items.length;
        
        if (passRate < CONFIG.GRAMMAR_PASS_THRESHOLD) {
          metadata.fallbackUsed = true;
          metadata.warnings.push(`Grammar pass rate ${(passRate * 100).toFixed(0)}% below threshold`);
          return this.createFallbackLesson(input, metadata, startTime);
        }
        
        // Remove failed exercises
        const failedIds = grammarResult.items
          .filter(i => !i.ok)
          .map(i => i.id);
        exercises = exercises.filter(ex => !failedIds.some(id => id.startsWith(ex.id)));
        metadata.warnings.push(`Removed ${failedIds.length} items due to grammar issues`);
      }
      
      metadata.durationMs = Date.now() - startTime;
      
      logWithContext('info', 'tutor.generate.complete', {
        requestId: this.requestId,
        meta: { 
          exerciseCount: exercises.length, 
          cost: metadata.totalCost,
          durationMs: metadata.durationMs 
        }
      });
      
      return {
        id: `tutor_lesson_${this.requestId}`,
        version: 1,
        input,
        reading,
        exercises,
        metadata,
      };
      
    } catch (error) {
      logWithContext('error', 'tutor.generate.error', {
        requestId: this.requestId,
        meta: { error: (error as Error).message }
      });
      
      metadata.fallbackUsed = true;
      metadata.durationMs = Date.now() - startTime;
      return this.createFallbackLesson(input, metadata, startTime);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Private Methods - Generation
  // ═══════════════════════════════════════════════════════════

  private async fetchAllowedWords(maxLesson: number): Promise<string[]> {
    const response = await fetch(
      `${this.pythonValidatorUrl}/get-vocabulary?max_lesson=${maxLesson}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch allowed words: ${response.status}`);
    }
    
    const data = await response.json() as { words: string[] };
    return data.words;
  }

  private async fetchAlternatives(focusWords: string[], allowedWords: string[]): Promise<Map<string, string[]>> {
    const alternatives = new Map<string, string[]>();
    
    if (!this.vectorizeService) {
      // Return empty alternatives if no vectorize service
      focusWords.forEach(word => alternatives.set(word, []));
      return alternatives;
    }
    
    const allowedSet = new Set(allowedWords);
    
    for (const word of focusWords) {
      try {
        const similar = await this.vectorizeService.searchSimilar(word, 10);
        // Filter to only include words in allowed vocabulary
        const filtered = similar
          .filter(s => allowedSet.has(s.hanzi) && s.hanzi !== word)
          .map(s => s.hanzi)
          .slice(0, 5);
        alternatives.set(word, filtered);
      } catch {
        alternatives.set(word, []);
      }
    }
    
    return alternatives;
  }

  private async generateReading(
    input: TutorLessonInput,
    allowedWords: string[],
    feedback: ReadingValidationResponse | null
  ): Promise<ReadingContent> {
    const client = createOpenRouterClient(this.openrouterApiKey);
    
    let feedbackSection = '';
    if (feedback) {
      feedbackSection = `
## Previous Attempt Feedback
Your last attempt was rejected because:
- Unknown word ratio: ${(feedback.unknown_ratio * 100).toFixed(0)}% (target: 10-20%)
- Words to AVOID: ${feedback.suggestions?.ban_tokens?.join(', ') || 'none'}
- Words REQUIRED but missing: ${feedback.suggestions?.require_tokens?.join(', ') || 'none'}

Please regenerate following these constraints more carefully.
`;
    }

    const prompt = `You are a Chinese language tutor creating reading material for a student.

## Student Level
- HSK Level: ${input.hskLevel}
- Lesson Position: ${input.userLessonPosition}

## Constraints
VOCABULARY CEILING - Use ONLY these words:
${allowedWords.slice(0, 200).join(', ')}${allowedWords.length > 200 ? '...' : ''}

FOCUS WORDS - MUST include all of these naturally:
${input.focusWords.join(', ')}
${feedbackSection}
## Style Requirements
- 3-5 short sentences
- Everyday situations only (school, home, shopping, travel)
- NO politics, news, or sensitive topics
- NO proper nouns except common Chinese names
- Each sentence max 15 characters
- Natural, conversational tone
- Text should feel like an HSK ${input.hskLevel} graded reader

## Output Format
Return ONLY valid JSON:
\`\`\`json
{
  "id": "reading_001",
  "chinese": "完整的中文段落。",
  "pinyin": "Wánzhěng de zhōngwén duànluò.",
  "english": "Complete Chinese paragraph.",
  "sentences": [
    {
      "id": "reading_001_s1",
      "chinese": "第一句。",
      "pinyin": "Dì yī jù.",
      "english": "First sentence."
    }
  ]
}
\`\`\`

Generate the reading now.`;

    const startTime = Date.now();
    const response = await client.chat.completions.create({
      model: CONFIG.MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage;
    
    // Log usage
    if (usage) {
      const cost = estimateOpenRouterCost(
        CONFIG.MODEL,
        usage.prompt_tokens,
        usage.completion_tokens
      );
      await this.usageLogger.log({
        model: CONFIG.MODEL,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cost,
        latencyMs: Date.now() - startTime,
        requestType: 'tutor_reading',
        userId: input.userId,
      });
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in reading response');
    }
    
    return JSON.parse(jsonMatch[0]) as ReadingContent;
  }

  private async generatePractice(
    reading: ReadingContent,
    input: TutorLessonInput,
    alternatives: Map<string, string[]>,
    allowedWords: string[]
  ): Promise<Exercise[]> {
    const client = createOpenRouterClient(this.openrouterApiKey);
    
    // Flatten alternatives
    const altList = Array.from(alternatives.entries())
      .map(([word, alts]) => `${word}: ${alts.join(', ')}`)
      .join('\n');

    const prompt = `You are creating Chinese language practice exercises.

## Reading Content
${reading.chinese}

## Focus Words to Test
${input.focusWords.join(', ')}

## Alternative Words You Can Use
${altList || 'None available'}

## All Allowed Words
${allowedWords.slice(0, 200).join(', ')}${allowedWords.length > 200 ? '...' : ''}

## Exercise Templates

Create exactly 5 exercises using ONLY:
1. Words from the reading
2. Focus words
3. Alternative words listed above
4. Words from the allowed list

NO OTHER WORDS ALLOWED.

### Exercise Types Required:
1. One multiple_choice
2. One drag_sentence
3. One spot_error
4. One build_sentence
5. One read_comp

### JSON Schema (follow EXACTLY):

\`\`\`json
{
  "exercises": [
    {
      "id": "ex_001",
      "type": "multiple_choice",
      "question": { "chinese": "STRING", "pinyin": "STRING", "english": "STRING" },
      "options": [
        { "id": "opt_1", "chinese": "STRING", "pinyin": "STRING" },
        { "id": "opt_2", "chinese": "STRING", "pinyin": "STRING" },
        { "id": "opt_3", "chinese": "STRING", "pinyin": "STRING" },
        { "id": "opt_4", "chinese": "STRING", "pinyin": "STRING" }
      ],
      "correctOptionId": "opt_X"
    },
    {
      "id": "ex_002",
      "type": "drag_sentence",
      "targetSentence": { "id": "target_002", "chinese": "STRING", "pinyin": "STRING", "english": "STRING" },
      "shuffledWords": [
        { "id": "word_1", "chinese": "STRING", "pinyin": "STRING", "correctPosition": 0 },
        { "id": "word_2", "chinese": "STRING", "pinyin": "STRING", "correctPosition": 1 }
      ]
    },
    {
      "id": "ex_003",
      "type": "spot_error",
      "sentence": { "id": "sent_003", "chinese": "STRING WITH ERROR", "pinyin": "STRING", "english": "STRING" },
      "errorWordId": "word_X",
      "correction": { "wrong": "STRING", "correct": "STRING", "explanation": "STRING" },
      "words": [
        { "id": "word_1", "chinese": "STRING", "isError": false },
        { "id": "word_2", "chinese": "STRING", "isError": true }
      ]
    },
    {
      "id": "ex_004",
      "type": "build_sentence",
      "prompt": { "english": "STRING", "hint": "STRING or null" },
      "expectedAnswer": { "id": "answer_004", "chinese": "STRING", "pinyin": "STRING" },
      "acceptableVariations": ["STRING", "STRING"],
      "availableWords": [
        { "id": "word_1", "chinese": "STRING", "pinyin": "STRING" }
      ]
    },
    {
      "id": "ex_005",
      "type": "read_comp",
      "passage": { "id": "passage_005", "chinese": "STRING", "pinyin": "STRING", "english": "STRING" },
      "question": { "id": "question_005", "chinese": "STRING", "pinyin": "STRING", "english": "STRING" },
      "options": [
        { "id": "opt_1", "chinese": "STRING", "pinyin": "STRING", "english": "STRING" },
        { "id": "opt_2", "chinese": "STRING", "pinyin": "STRING", "english": "STRING" },
        { "id": "opt_3", "chinese": "STRING", "pinyin": "STRING", "english": "STRING" },
        { "id": "opt_4", "chinese": "STRING", "pinyin": "STRING", "english": "STRING" }
      ],
      "correctOptionId": "opt_X"
    }
  ]
}
\`\`\`

Generate exercises now. Return ONLY the JSON, no other text.`;

    const startTime = Date.now();
    const response = await client.chat.completions.create({
      model: CONFIG.MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage;
    
    if (usage) {
      const cost = estimateOpenRouterCost(
        CONFIG.MODEL,
        usage.prompt_tokens,
        usage.completion_tokens
      );
      await this.usageLogger.log({
        model: CONFIG.MODEL,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cost,
        latencyMs: Date.now() - startTime,
        requestType: 'tutor_practice',
        userId: input.userId,
      });
    }

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in practice response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as { exercises: Exercise[] };
    return parsed.exercises;
  }

  // ═══════════════════════════════════════════════════════════
  // Private Methods - Validation
  // ═══════════════════════════════════════════════════════════

  private async validateReading(
    reading: ReadingContent,
    input: TutorLessonInput,
    allowedWords: string[]
  ): Promise<ReadingValidationResponse> {
    const response = await fetch(`${this.pythonValidatorUrl}/validate/reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reading,
        user_lesson_position: input.userLessonPosition,
        hsk_level: input.hskLevel,
        focus_words: input.focusWords,
        allowed_words: allowedWords,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Reading validation failed: ${response.status}`);
    }
    
    return await response.json() as ReadingValidationResponse;
  }

  private async validateStructure(
    exercises: Exercise[],
    allowedWords: string[]
  ): Promise<StructureValidationResponse> {
    const response = await fetch(`${this.pythonValidatorUrl}/validate/structure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercises,
        allowed_words: allowedWords,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Structure validation failed: ${response.status}`);
    }
    
    return await response.json() as StructureValidationResponse;
  }

  private async validatePedagogy(
    reading: ReadingContent,
    exercises: Exercise[],
    input: TutorLessonInput
  ): Promise<PedagogyValidationResponse> {
    const response = await fetch(`${this.pythonValidatorUrl}/validate/pedagogy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reading,
        exercises,
        user_lesson_position: input.userLessonPosition,
        hsk_level: input.hskLevel,
        focus_words: input.focusWords,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Pedagogy validation failed: ${response.status}`);
    }
    
    return await response.json() as PedagogyValidationResponse;
  }

  private async validateGrammar(
    reading: ReadingContent,
    exercises: Exercise[]
  ): Promise<GrammarValidationResult> {
    const client = createOpenRouterClient(this.openrouterApiKey);
    
    // Build content items with IDs for validation
    const contentItems: { id: string; chinese: string }[] = [
      { id: 'reading', chinese: reading.chinese },
    ];
    
    // Add reading sentences
    reading.sentences.forEach((s, i) => {
      contentItems.push({ id: `reading_s${i + 1}`, chinese: s.chinese });
    });
    
    // Add exercise content
    for (const ex of exercises) {
      if (ex.type === 'multiple_choice') {
        contentItems.push({ id: `${ex.id}_question`, chinese: ex.question.chinese });
        ex.options.forEach((opt, i) => {
          contentItems.push({ id: `${ex.id}_opt${i + 1}`, chinese: opt.chinese });
        });
      } else if (ex.type === 'drag_sentence') {
        contentItems.push({ id: `${ex.id}_target`, chinese: ex.targetSentence.chinese });
      } else if (ex.type === 'spot_error') {
        contentItems.push({ id: `${ex.id}_correct`, chinese: ex.correction.correct });
      } else if (ex.type === 'build_sentence') {
        contentItems.push({ id: `${ex.id}_answer`, chinese: ex.expectedAnswer.chinese });
      } else if (ex.type === 'read_comp') {
        contentItems.push({ id: `${ex.id}_passage`, chinese: ex.passage.chinese });
        contentItems.push({ id: `${ex.id}_question`, chinese: ex.question.chinese });
      }
    }

    const prompt = `You are a strict Chinese grammar expert. Your job is quality control for a language learning app.

Teaching incorrect Chinese is UNACCEPTABLE. Err on the side of marking things invalid.

## Content to Validate

${JSON.stringify(contentItems, null, 2)}

## Task

For EACH item, check:
1. Is the Chinese grammatically correct?
2. Would a native speaker find it natural?
3. Is the word order correct?

## Output Format

Return ONLY this JSON structure:

\`\`\`json
{
  "overall_ok": true,
  "items": [
    { "id": "reading", "ok": true, "error": null },
    { "id": "reading_s1", "ok": true, "error": null },
    { "id": "ex_001_question", "ok": false, "error": "Unnatural word order" }
  ]
}
\`\`\`

## Rules
- Check EVERY piece of Chinese text
- Be strict - false positives (marking valid as invalid) are acceptable
- False negatives (marking invalid as valid) are NOT acceptable
- Keep error messages brief but actionable
- If overall_ok is false, at least one item must have ok: false

Validate now.`;

    const startTime = Date.now();
    const response = await client.chat.completions.create({
      model: CONFIG.MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2, // Low temp for consistent validation
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage;
    
    if (usage) {
      const cost = estimateOpenRouterCost(
        CONFIG.MODEL,
        usage.prompt_tokens,
        usage.completion_tokens
      );
      await this.usageLogger.log({
        model: CONFIG.MODEL,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cost,
        latencyMs: Date.now() - startTime,
        requestType: 'tutor_grammar',
      });
    }

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If parsing fails, assume valid (fail open)
      return {
        overall_ok: true,
        items: contentItems.map(c => ({ id: c.id, ok: true, error: null })),
      };
    }
    
    return JSON.parse(jsonMatch[0]) as GrammarValidationResult;
  }

  // ═══════════════════════════════════════════════════════════
  // Fallback Lessons
  // ═══════════════════════════════════════════════════════════

  private createFallbackLesson(
    input: TutorLessonInput,
    metadata: GenerationMetadata,
    startTime: number
  ): TutorLesson {
    metadata.durationMs = Date.now() - startTime;
    
    // Return a simple, safe fallback lesson
    const reading: ReadingContent = {
      id: 'fallback_reading',
      chinese: '今天天气很好。我和朋友去公园。我们很开心。',
      pinyin: 'Jīntiān tiānqì hěn hǎo. Wǒ hé péngyǒu qù gōngyuán. Wǒmen hěn kāixīn.',
      english: 'The weather is very nice today. My friend and I went to the park. We are very happy.',
      sentences: [
        { id: 'fb_s1', chinese: '今天天气很好。', pinyin: 'Jīntiān tiānqì hěn hǎo.', english: 'The weather is very nice today.' },
        { id: 'fb_s2', chinese: '我和朋友去公园。', pinyin: 'Wǒ hé péngyǒu qù gōngyuán.', english: 'My friend and I went to the park.' },
        { id: 'fb_s3', chinese: '我们很开心。', pinyin: 'Wǒmen hěn kāixīn.', english: 'We are very happy.' },
      ],
    };

    const exercises: Exercise[] = [
      {
        id: 'fb_ex_001',
        type: 'multiple_choice',
        question: { chinese: '今天天气怎么样？', pinyin: 'Jīntiān tiānqì zěnmeyàng?', english: 'How is the weather today?' },
        options: [
          { id: 'opt_1', chinese: '很好', pinyin: 'hěn hǎo' },
          { id: 'opt_2', chinese: '不好', pinyin: 'bù hǎo' },
          { id: 'opt_3', chinese: '很冷', pinyin: 'hěn lěng' },
          { id: 'opt_4', chinese: '很热', pinyin: 'hěn rè' },
        ],
        correctOptionId: 'opt_1',
      },
      {
        id: 'fb_ex_002',
        type: 'drag_sentence',
        targetSentence: { id: 'target_002', chinese: '我和朋友去公园', pinyin: 'Wǒ hé péngyǒu qù gōngyuán', english: 'My friend and I went to the park' },
        shuffledWords: [
          { id: 'w1', chinese: '我', pinyin: 'wǒ', correctPosition: 0 },
          { id: 'w2', chinese: '和', pinyin: 'hé', correctPosition: 1 },
          { id: 'w3', chinese: '朋友', pinyin: 'péngyǒu', correctPosition: 2 },
          { id: 'w4', chinese: '去', pinyin: 'qù', correctPosition: 3 },
          { id: 'w5', chinese: '公园', pinyin: 'gōngyuán', correctPosition: 4 },
        ],
      },
      {
        id: 'fb_ex_003',
        type: 'build_sentence',
        prompt: { english: 'We are very happy.', hint: 'Use 很' },
        expectedAnswer: { id: 'ans_003', chinese: '我们很开心', pinyin: 'Wǒmen hěn kāixīn' },
        acceptableVariations: ['我们很高兴'],
        availableWords: [
          { id: 'aw1', chinese: '我们', pinyin: 'wǒmen' },
          { id: 'aw2', chinese: '很', pinyin: 'hěn' },
          { id: 'aw3', chinese: '开心', pinyin: 'kāixīn' },
          { id: 'aw4', chinese: '高兴', pinyin: 'gāoxìng' },
        ],
      },
    ];

    return {
      id: `tutor_lesson_fallback_${this.requestId}`,
      version: 1,
      input,
      reading,
      exercises,
      metadata,
    };
  }
}

